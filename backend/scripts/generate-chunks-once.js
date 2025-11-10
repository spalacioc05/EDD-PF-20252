/*
  Generate chunked audio for a given bookId and voiceId, upload to Supabase storage, and print manifest URLs.
  Usage: node scripts/generate-chunks-once.js 1 1
*/
process.env.NODE_ENV = process.env.NODE_ENV || 'test'; // allow EdgeTtsService to generate silent mp3 if TTS is disabled
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const pdfParse = require('pdf-parse');

async function main() {
  const [,, bookArg, voiceArg, pdfArg] = process.argv;
  const bookId = Number(bookArg || 1);
  const voiceId = Number(voiceArg || 1);
  if (!Number.isFinite(bookId) || !Number.isFinite(voiceId)) {
    console.error('Usage: node scripts/generate-chunks-once.js <bookId> <voiceId>');
    process.exit(1);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase env vars');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  if (ffmpegPath) { try { ffmpeg.setFfmpegPath(ffmpegPath); } catch (e) {} }
  const bucket = process.env.BUCKET_AUDIOS || 'audios_libros';
  const bucketArchivos = process.env.BUCKET_ARCHIVOS || 'archivos_libros';
  const force = String(process.env.FORCE || '').toLowerCase() === '1' || String(process.env.FORCE || '').toLowerCase() === 'true';

  // fetch book and voice directly
  const { data: book, error: bookErr } = await supabase.from('tbl_libros').select('id_libro, titulo, descripcion, archivo').eq('id_libro', bookId).maybeSingle();
  if (bookErr) throw new Error(bookErr.message);
  if (!book) throw new Error('Libro no encontrado');
  const { data: voice, error: voiceErr } = await supabase.from('tbl_voces').select('id_voz, short_name').eq('id_voz', voiceId).gte('id_voz', 1).lte('id_voz', 16).maybeSingle();
  if (voiceErr) throw new Error(voiceErr.message);
  if (!voice) throw new Error('Voz no encontrada');

  const manifestPath = `${bookId}/${voiceId}/manifest.json`;
  try {
    const existing = await supabase.storage.from(bucket).download(manifestPath);
    if (existing?.data && !force) {
      const buf = Buffer.from(await existing.data.arrayBuffer());
      const manifest = JSON.parse(buf.toString('utf-8'));
      if ((manifest.totalWords || 0) >= 1000) {
        console.log('Manifest already exists. Reused.');
        console.log(JSON.stringify({ ok: true, reused: true, manifest }, null, 2));
        return;
      } else {
        console.log('Existing manifest too small, will regenerate...');
      }
    }
  } catch (_) {}

  // download PDF buffer from bucket or public URL
  async function downloadPdfBufferStandalone(archivo) {
    let bucket = process.env.BUCKET_ARCHIVOS || 'archivos_libros';
    let path = archivo;
    if (/^https?:\/\//i.test(path)) {
      const u = new URL(path);
      const idx = u.pathname.indexOf('/storage/v1/object/public/');
      if (idx !== -1) {
        const rest = u.pathname.substring(idx + '/storage/v1/object/public/'.length);
        const segs = rest.split('/');
        bucket = segs.shift();
        path = segs.join('/');
      }
    }
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw new Error(error.message);
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const pdfSource = pdfArg && /^https?:/i.test(pdfArg) ? pdfArg : book.archivo;
  const pdfBuffer = await downloadPdfBufferStandalone(pdfSource);
  // Resolve .txt sibling path in archivos bucket
  function resolveBucketPath(archivo) {
    let bucketR = bucketArchivos;
    let pathR = archivo;
    if (/^https?:\/\//i.test(pathR)) {
      const u = new URL(pathR);
      const idx = u.pathname.indexOf('/storage/v1/object/public/');
      if (idx !== -1) {
        const rest = u.pathname.substring(idx + '/storage/v1/object/public/'.length);
        const segs = rest.split('/');
        bucketR = segs.shift();
        pathR = segs.join('/');
      }
    }
    return { bucket: bucketR, path: pathR };
  }
  const { bucket: archBucket, path: archPath } = resolveBucketPath(pdfSource);
  const textPath = archPath.replace(/\.pdf$/i, '.txt').replace(/\.[^/.]+$/i, '.txt');
  async function extractPdfTextStandalone(buf) {
    // 1) Try pdf-parse
    try {
      const res = await pdfParse(buf);
      if (res && typeof res.text === 'string' && res.text.trim()) {
        return res.text.trim();
      }
    } catch (_) {}
    // 2) Fallback: pdfjs-dist legacy
    try {
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      const { getDocument } = pdfjsLib;
      const loadingTask = getDocument({ data: buf });
      const pdf = await loadingTask.promise;
      let text = '';
      const numPages = pdf.numPages || 0;
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = (content.items || []).map((it) => it.str).filter(Boolean);
        text += strings.join(' ') + '\n';
      }
      if (text.trim()) return text.trim();
    } catch (_) {}
    // 3) Fallback: pdf2json
    try {
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser();
      const result = await new Promise((resolve, reject) => {
        pdfParser.on('pdfParser_dataReady', resolve);
        pdfParser.on('pdfParser_dataError', (err) => reject(err?.parserError || err));
        pdfParser.parseBuffer(buf);
      });
      const pages = (result?.formImage?.Pages) || [];
      const chunks = [];
      for (const p of pages) {
        const texts = p.Texts || [];
        for (const t of texts) {
          for (const r of (t.R || [])) {
            try {
              const decoded = decodeURIComponent(r.T || '');
              if (decoded) chunks.push(decoded);
            } catch (_) {
              if (r.T) chunks.push(r.T);
            }
          }
        }
        chunks.push('\n');
      }
      const finalText = chunks.join(' ').replace(/\s+\n/g, '\n').trim();
      return finalText;
    } catch (_) {
      return '';
    }
  }
  // Try to use existing TXT unless force
  let text = '';
  if (!force) {
    try {
      const txtResp = await supabase.storage.from(archBucket).download(textPath);
      if (txtResp?.data) {
        const tbuf = Buffer.from(await txtResp.data.arrayBuffer());
        text = tbuf.toString('utf8');
        console.log('Using existing TXT:', `${archBucket}/${textPath}`);
      }
    } catch (_) {}
  }
  if (!text) {
    text = await extractPdfTextStandalone(pdfBuffer);
    text = (text || '').replace(/\u0000/g, '');
    if (!text || text.length < 50) text = (book.descripcion || book.titulo || '').trim();
    if (!text || text.length < 50) throw new Error('Texto insuficiente para TTS');
    // Upload TXT for reuse
    const upTxt = await supabase.storage.from(archBucket).upload(textPath, Buffer.from(text, 'utf8'), { contentType: 'text/plain; charset=utf-8', upsert: true });
    if (upTxt?.error) throw new Error(upTxt.error.message);
    console.log('Uploaded TXT:', `${archBucket}/${textPath}`);
  }

  const words = text.trim().split(/\s+/).filter(Boolean);

  // Dynamic chunking mirroring server logic (target ~60s, 40MB cap)
  const wordsPerSecond = Number(process.env.TTS_WORDS_PER_SECOND || 2.7);
  const targetSeconds = Number(process.env.TTS_TARGET_CHUNK_SECONDS || 60);
  const maxBytesPerChunk = 40 * 1024 * 1024;
  const ttsFormatKbps = 48; // assumed bitrate
  const estimatedBytesPerSecond = (ttsFormatKbps * 1000) / 8;
  const targetWords = Math.max(40, Math.round(wordsPerSecond * targetSeconds));
  const minWords = Math.max(20, Math.round(wordsPerSecond * (targetSeconds * 0.5)));
  const maxWords = Math.max(minWords + 20, Math.round(wordsPerSecond * (targetSeconds * 1.5)));

  function sliceByTarget(startIndex) {
    const remaining = words.length - startIndex;
    let take = Math.min(remaining, targetWords);
    const endIdxCandidate = startIndex + take - 1;
    const windowEnd = Math.min(words.length - 1, startIndex + maxWords - 1);
    let bestEnd = endIdxCandidate;
    for (let j = endIdxCandidate; j <= windowEnd; j++) {
      const w = words[j];
      if (/[\.!?;:,]$/.test(w)) { bestEnd = j; break; }
    }
    if (bestEnd - startIndex + 1 < minWords) {
      bestEnd = Math.min(startIndex + minWords - 1, words.length - 1);
    }
    return bestEnd;
  }

  const chunks = [];
  let i = 0;
  while (i < words.length) {
    let endIdx = sliceByTarget(i);
    const estSeconds = (endIdx - i + 1) / wordsPerSecond;
    let estBytes = estSeconds * estimatedBytesPerSecond;
    while (estBytes > maxBytesPerChunk && endIdx > i + minWords) {
      endIdx = Math.floor((i + endIdx) / 2);
      const newSeconds = (endIdx - i + 1) / wordsPerSecond;
      estBytes = newSeconds * estimatedBytesPerSecond;
    }
    const slice = words.slice(i, endIdx + 1);
    chunks.push({ index: chunks.length + 1, startWord: i, endWord: endIdx, estSeconds: (endIdx - i + 1) / wordsPerSecond, text: slice.join(' ') });
    i = endIdx + 1;
  }
  // If force, remove existing audio files under this prefix
  if (force) {
    try {
      const list = await supabase.storage.from(bucket).list(`${bookId}/${voiceId}`, { limit: 1000, search: '' });
      const files = (list?.data || []).map((f) => `${bookId}/${voiceId}/${f.name}`);
      if (files.length) {
        await supabase.storage.from(bucket).remove(files);
        console.log('Removed existing audio files:', files.length);
      }
    } catch (e) { console.warn('Cleanup failed:', e?.message || e); }
  }
  const audioMeta = [];
  let estimatedTotalDurationSeconds = 0;
  async function synthesizeSilent(seconds = 1) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      try {
        ffmpeg()
          .input('anullsrc')
          .inputFormat('lavfi')
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .duration(seconds)
          .format('mp3')
          .on('error', (err) => reject(err))
          .on('end', () => resolve(Buffer.concat(chunks)))
          .pipe()
          .on('data', (d) => chunks.push(d));
      } catch (e) { reject(e); }
    });
  }

  for (const ch of chunks) {
    // Replace with real TTS if desired; here we generate a short silent mp3 to validate storage flow
    const synthSeconds = Math.min(Math.max(Math.round(ch.estSeconds), 1), 120); // cap for silent generation
    const audioBuf = await synthesizeSilent(Math.min(synthSeconds, 2)); // keep small for test
    const fileName = `chunk-${String(ch.index).padStart(3, '0')}.mp3`;
    const path = `${bookId}/${voiceId}/${fileName}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, audioBuf, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(upErr.message);
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const fileSizeBytes = audioBuf.length;
    const estimatedDurationSeconds = ch.estSeconds;
    estimatedTotalDurationSeconds += estimatedDurationSeconds;
    audioMeta.push({ index: ch.index, file: fileName, url: pub.publicUrl, startWord: ch.startWord, endWord: ch.endWord, fileSizeBytes, estimatedDurationSeconds });
    console.log('Uploaded', path);
  }
  const manifest = {
    schemaVersion: 1,
    bookId,
    voiceId,
    shortName: voice.short_name,
    createdAt: new Date().toISOString(),
    totalChunks: audioMeta.length,
    totalWords: words.length,
    tts: { wordsPerSecond, targetSeconds, formatKbps: ttsFormatKbps },
    estimatedTotalDurationSeconds,
    chunks: audioMeta,
  };
  const manifestBuf = Buffer.from(JSON.stringify(manifest));
  const { error: manErr } = await supabase.storage.from(bucket).upload(manifestPath, manifestBuf, { contentType: 'application/json', upsert: true });
  if (manErr) throw new Error(manErr.message);
  console.log('Manifest uploaded:', manifestPath);
  console.log(JSON.stringify({ ok: true, reused: false, manifest }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
