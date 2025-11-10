// Plain router-based endpoints for books to avoid decorator syntax issues with Babel & JS.
import { downloadPdfBuffer, extractPdfText } from '../../application/books/services/pdf-text.service';
import { env } from '../../infrastructure/config/env';

export function registerBooksRoutes(app, container) {
  const librosRepo = container.get?.('LibrosRepository');
  const vocesRepo = container.get?.('VocesRepository');
  const relRepo = container.get?.('LibrosUsuariosRepository');
  const supabase = container.get?.('SupabaseService');
  const tts = container.get?.('EdgeTtsService');
  const generateAudioUC = container.get?.(require('../../application/books/use-cases/generate-book-audio.use-case').GenerateBookAudioUseCase);
  const listVoicesUC = container.get?.(require('../../application/books/use-cases/list-voices-for-book.use-case').ListVoicesForBookUseCase);

  if (!app) return;

  // List voices
  app.get('/books/:id/voices', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ statusCode: 400, message: 'Invalid book id' });
      const result = await listVoicesUC.execute({ id });
      res.json(result);
    } catch (e) {
      res.status(e?.status || 500).json({ statusCode: e?.status || 500, message: e?.message || 'Error', error: String(e) });
    }
  });

  // Generate/get single audio (legacy)
  app.post('/books/:id/audio', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { voiceId, id_playbackrate } = req.body || {};
      const auth = req.headers.authorization;
      const token = (auth || '').replace(/^Bearer\s+/i, '');
      const result = await generateAudioUC.execute({ token, id, id_voz: Number(voiceId), id_playbackrate: Number(id_playbackrate) });
      res.json({ ok: true, type: 'single', ...result });
    } catch (e) {
      res.status(e?.status || 500).json({ statusCode: e?.status || 500, message: e?.message || 'Error', error: String(e) });
    }
  });

  // Generate/get chunked audio manifest
  app.post('/books/:id/audio-chunks', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { voiceId } = req.body || {};
      const force = String(req.query.force || req.body?.force || '') === '1' || String(req.query.force || req.body?.force || '').toLowerCase() === 'true';
      const minWordsThreshold = Math.max(50, Number(req.query.minWords || req.body?.minWords || 500));
      const bucket = env.bucketAudios || 'audios_libros';
      if (!Number.isFinite(id)) return res.status(400).json({ statusCode: 400, message: 'Invalid book id' });
      const vId = Number(voiceId);
      if (!Number.isFinite(vId)) return res.status(400).json({ statusCode: 400, message: 'Invalid voiceId' });
      const book = await librosRepo.findById(id);
      if (!book) return res.status(404).json({ statusCode: 404, message: 'Libro no encontrado' });
      const voice = await vocesRepo.findById(vId);
      if (!voice) return res.status(404).json({ statusCode: 404, message: 'Voz no encontrada' });
      const manifestPath = `${id}/${vId}/manifest.json`;
      try {
        const existing = await supabase.admin.storage.from(bucket).download(manifestPath);
        if (existing?.data && !force) {
          const buf = Buffer.from(await existing.data.arrayBuffer());
          const manifest = JSON.parse(buf.toString('utf-8'));
          return res.json({ ok: true, reused: true, manifest });
        }
      } catch (_) {}
      // Resolve archivo bucket/path and derive .txt path
      const bucketArch = env.bucketArchivos || 'archivos_libros';
      const resolveBucketPath = (archivo) => {
        let bucketR = bucketArch;
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
      };

      const { bucket: archBucket, path: archPath } = resolveBucketPath(book.archivo);
      const textPath = archPath.replace(/\.pdf$/i, '.txt').replace(/\.[^/.]+$/i, '.txt');
      let text = '';
      // Always prefer existing .txt if present (even on force) to ensure best quality text source
      try {
        const txtResp = await supabase.admin.storage.from(archBucket).download(textPath);
        if (txtResp?.data) {
          const tbuf = Buffer.from(await txtResp.data.arrayBuffer());
          text = tbuf.toString('utf8');
        }
      } catch (_) {}
      if (!text || text.trim().split(/\s+/).length < minWordsThreshold) {
        const pdfBuffer = await downloadPdfBuffer(supabase, book.archivo);
        text = await extractPdfText(pdfBuffer);
        const cleanText = (text || '').replace(/\u0000/g, '');
        text = cleanText;
        if (!text || text.trim().split(/\s+/).length < minWordsThreshold) {
          return res.status(422).json({ statusCode: 422, message: 'El PDF no tiene capa de texto suficiente (se requiere OCR) o la extracción fue insuficiente.' });
        }
        const txtBuf = Buffer.from(text, 'utf8');
        const upTxt = await supabase.admin.storage.from(archBucket).upload(textPath, txtBuf, { contentType: 'text/plain; charset=utf-8', upsert: true });
        if (upTxt?.error) throw new Error(upTxt.error.message);
      }
      if (!text || text.length < 50) text = (book.descripcion || book.titulo || '').trim();
      if (!text || text.length < 50) return res.status(400).json({ statusCode: 400, message: 'Texto insuficiente' });
      const words = text.trim().split(/\s+/).filter(Boolean);

      // Dynamic chunking by target duration and 40MB limit
      const wordsPerSecond = Number(env.ttsWordsPerSecond || 2.7); // ~160 wpm
      const targetSeconds = Number(env.ttsTargetChunkSeconds || 60);
      const maxBytesPerChunk = 40 * 1024 * 1024; // 40MB
      const ttsFormatKbps = 48; // edge-tts default used in service
      const estimatedBytesPerSecond = (ttsFormatKbps * 1000) / 8; // bytes
      const targetWords = Math.max(40, Math.round(wordsPerSecond * targetSeconds));
      const minWords = Math.max(20, Math.round(wordsPerSecond * (targetSeconds * 0.5)));
      const maxWords = Math.max(minWords + 20, Math.round(wordsPerSecond * (targetSeconds * 1.5)));

      function sliceByTarget(startIndex) {
        const remaining = words.length - startIndex;
        let take = Math.min(remaining, targetWords);
        // Avoid cutting mid-sentence: expand up to maxWords to next punctuation if close
        const endIdxCandidate = startIndex + take - 1;
        const windowEnd = Math.min(words.length - 1, startIndex + maxWords - 1);
        let bestEnd = endIdxCandidate;
        for (let j = endIdxCandidate; j <= windowEnd; j++) {
          const w = words[j];
          if (/[\.!?;:,]$/.test(w)) { bestEnd = j; break; }
        }
        if (bestEnd - startIndex + 1 < minWords) {
          // ensure minimum size if punctuation caused too-short chunk
          bestEnd = Math.min(startIndex + minWords - 1, words.length - 1);
        }
        return bestEnd;
      }

      const chunkDescs = [];
      let i = 0;
      while (i < words.length) {
        let endIdx = sliceByTarget(i);
        // quick estimated size; if exceeds 40MB, reduce
        const estSeconds = (endIdx - i + 1) / wordsPerSecond;
        let estBytes = estSeconds * estimatedBytesPerSecond;
        while (estBytes > maxBytesPerChunk && endIdx > i + minWords) {
          endIdx = Math.floor((i + endIdx) / 2); // shrink aggressively
          const newSeconds = (endIdx - i + 1) / wordsPerSecond;
          estBytes = newSeconds * estimatedBytesPerSecond;
        }
        const slice = words.slice(i, endIdx + 1);
        chunkDescs.push({
          index: chunkDescs.length + 1,
          startWord: i,
          endWord: endIdx,
          estSeconds: (endIdx - i + 1) / wordsPerSecond,
          text: slice.join(' '),
        });
        i = endIdx + 1;
      }

      // If force, cleanup previous audio files for this book/voice
      if (force) {
        try {
          const list = await supabase.admin.storage.from(bucket).list(`${id}/${vId}`, { limit: 1000, search: '' });
          const files = (list?.data || []).map((f) => `${id}/${vId}/${f.name}`);
          if (files.length) {
            await supabase.admin.storage.from(bucket).remove(files);
          }
        } catch (_) {}
      }

      const audioMeta = [];
      let estimatedTotalDurationSeconds = 0;
      for (const ch of chunkDescs) {
        const audioBuf = await tts.synthesize({ text: ch.text, shortName: voice.short_name });
        const fileName = `chunk-${String(ch.index).padStart(3, '0')}.mp3`;
        const path = `${id}/${vId}/${fileName}`;
        const { error: upErr } = await supabase.admin.storage.from(bucket).upload(path, audioBuf, { contentType: 'audio/mpeg', upsert: true });
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = supabase.admin.storage.from(bucket).getPublicUrl(path);
        const fileSizeBytes = audioBuf.length;
        const estimatedDurationSeconds = ch.estSeconds;
        estimatedTotalDurationSeconds += estimatedDurationSeconds;
        audioMeta.push({ index: ch.index, file: fileName, url: pub.publicUrl, startWord: ch.startWord, endWord: ch.endWord, fileSizeBytes, estimatedDurationSeconds });
      }
      const manifest = {
        schemaVersion: 1,
        bookId: id,
        voiceId: vId,
        shortName: voice.short_name,
        createdAt: new Date().toISOString(),
        totalChunks: audioMeta.length,
        totalWords: words.length,
        tts: { wordsPerSecond, targetSeconds, formatKbps: ttsFormatKbps },
        estimatedTotalDurationSeconds,
        chunks: audioMeta,
      };
      const manifestBuf = Buffer.from(JSON.stringify(manifest));
      const { error: manErr } = await supabase.admin.storage.from(bucket).upload(manifestPath, manifestBuf, { contentType: 'application/json', upsert: true });
      if (manErr) throw new Error(manErr.message);
      res.json({ ok: true, reused: false, manifest });
    } catch (e) {
      res.status(e?.status || 500).json({ statusCode: e?.status || 500, message: e?.message || 'Error', error: String(e) });
    }
  });

  app.get('/books/:id/audio-chunks', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const voiceId = Number(req.query.voiceId);
      if (!Number.isFinite(id)) return res.status(400).json({ statusCode: 400, message: 'Invalid book id' });
      if (!Number.isFinite(voiceId)) return res.status(400).json({ statusCode: 400, message: 'Invalid voiceId' });
      const bucket = env.bucketAudios || 'audios_libros';
      const manifestPath = `${id}/${voiceId}/manifest.json`;
      const existing = await supabase.admin.storage.from(bucket).download(manifestPath);
      if (!existing?.data) return res.status(404).json({ statusCode: 404, message: 'Manifest no encontrado' });
      const buf = Buffer.from(await existing.data.arrayBuffer());
      const manifest = JSON.parse(buf.toString('utf-8'));
      res.json({ ok: true, manifest });
    } catch (e) {
      res.status(e?.status || 500).json({ statusCode: e?.status || 500, message: e?.message || 'Error', error: String(e) });
    }
  });

  // Manual text upload to bypass scanned PDF limitation
  app.post('/books/:id/text', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ statusCode: 400, message: 'Invalid book id' });
      const { text } = req.body || {};
      if (!text || text.trim().split(/\s+/).length < 100) return res.status(400).json({ statusCode: 400, message: 'Texto insuficiente (min 100 palabras)' });
      const book = await librosRepo.findById(id);
      if (!book) return res.status(404).json({ statusCode: 404, message: 'Libro no encontrado' });
      const bucketArch = env.bucketArchivos || 'archivos_libros';
      // Derive .txt path from original archivo
      let path = book.archivo;
      if (/^https?:\/\//i.test(path)) {
        const u = new URL(path);
        const idx = u.pathname.indexOf('/storage/v1/object/public/');
        if (idx !== -1) {
          const rest = u.pathname.substring(idx + '/storage/v1/object/public/'.length);
          const segs = rest.split('/');
          segs.shift(); // remove bucket
          path = segs.join('/');
        }
      }
      const textPath = path.replace(/\.pdf$/i, '.txt').replace(/\.[^/.]+$/i, '.txt');
      const buf = Buffer.from(text, 'utf8');
      const up = await supabase.admin.storage.from(bucketArch).upload(textPath, buf, { contentType: 'text/plain; charset=utf-8', upsert: true });
      if (up?.error) throw new Error(up.error.message);
      res.json({ ok: true, stored: true, path: textPath, words: text.trim().split(/\s+/).length });
    } catch (e) {
      res.status(e?.status || 500).json({ statusCode: e?.status || 500, message: e?.message || 'Error', error: String(e) });
    }
  });
}

export default registerBooksRoutes;