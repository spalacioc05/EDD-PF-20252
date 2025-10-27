// Node script to generate/reuse full-PDF TTS audio for a given book and voice
// Usage:
//   node scripts/generate-audio.js --book=1 --voice=1 --rate=1.0 --user=1
//   Optional Supabase overrides:
//   --supabase-url=https://YOUR-PROJECT.supabase.co --service-role-key=YOUR_SERVICE_ROLE_KEY --anon-key=YOUR_ANON_KEY
// Notes:
// - Does NOT modify tbl_voces; it only references existing voices by id.
// - Requires environment configured for Supabase (URL + keys). JWT is not required for this script.

const { NestFactory } = require('@nestjs/core');
const path = require('path');
// Load environment variables from backend/.env if present
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
} catch (_) {}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  const id = Number(args.book || args.b || 1);
  const id_voz = Number(args.voice || args.v || 1);
  const rate = Number(args.rate || 1.0);
  const userId = Number(args.user || 1);

  // Allow passing Supabase settings via CLI to avoid relying on shell env
  if (args['supabase-url']) process.env.SUPABASE_URL = args['supabase-url'];
  if (args['service-role-key']) process.env.SUPABASE_SERVICE_ROLE_KEY = args['service-role-key'];
  if (args['anon-key']) process.env.SUPABASE_ANON_KEY = args['anon-key'];

  // Sanitize potential whitespace/newlines from .env
  if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = String(process.env.SUPABASE_URL).trim();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY).trim();
  if (process.env.SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = String(process.env.SUPABASE_ANON_KEY).trim();

  // Preflight validation for Supabase mode; if missing but local mode flags are present, we'll run in local mode
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
  const urlOk = /^https?:\/\//i.test(SUPABASE_URL) && !/tu-proyecto\.supabase\.co/i.test(SUPABASE_URL) && !/TU-PROYECTO\.supabase\.co/.test(SUPABASE_URL);
  const svcOk = SERVICE_ROLE.length > 20; // JWT-like string

  const localPdf = args.pdf || args.input || null; // file path or http(s) url
  const localText = args.text || null; // direct text to synthesize (bypass PDF)
  const localOut = args.output || args.out || null; // output mp3 path
  const shortNameOverride = args['short-name'] || args.shortname || null; // e.g., es-CO-GonzaloNeural

  const wantLocalMode = !!(shortNameOverride && localOut && (localText || localPdf));
  if (!wantLocalMode) {
    // Debug URL visibility (no secrets)
    console.log('[env] SUPABASE_URL =', JSON.stringify(process.env.SUPABASE_URL));
    if (!urlOk) {
  console.error('\n[Preflight] SUPABASE_URL inválida o placeholder. Debe ser la URL real del proyecto y empezar con http(s)://');
  console.error('Ejemplo: https://abcd1234.supabase.co');
      process.exit(1);
    }
    if (!svcOk) {
      console.error('\n[Preflight] SUPABASE_SERVICE_ROLE_KEY ausente o demasiado corta.');
      console.error('Pasa --service-role-key=<clave_service_role> o exporta SUPABASE_SERVICE_ROLE_KEY.');
      process.exit(1);
    }
  }

  if (!(id_voz >= 1 && id_voz <= 16)) {
    console.error('Voice id must be between 1 and 16');
    process.exit(1);
  }

  // Bootstrap Nest app (prefer dist, fallback to src with babel/register) unless running in local mode
  let app = null; let AppModule; let downloadPdfBuffer; let extractPdfText; let EdgeTtsService;
  let source = 'dist';
  try {
    ({ AppModule } = require('../dist/app.module'));
    ({ downloadPdfBuffer, extractPdfText } = require('../dist/application/books/services/pdf-text.service'));
    ({ EdgeTtsService } = require('../dist/infrastructure/tts/providers/edge-tts.service'));
  } catch (e) {
    source = 'src';
    require('@babel/register')({ extensions: ['.js'] });
    ({ AppModule } = require('../src/app.module'));
    ({ downloadPdfBuffer, extractPdfText } = require('../src/application/books/services/pdf-text.service'));
    ({ EdgeTtsService } = require('../src/infrastructure/tts/providers/edge-tts.service'));
  }

  if (!wantLocalMode) {
    app = await NestFactory.create(AppModule);
    await app.init();
  }

  // If local mode: run standalone path
  if (wantLocalMode) {
  const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { spawnSync } = require('child_process');
    const isHttp = /^https?:\/\//i.test(localPdf);
    const outPath = path.resolve(process.cwd(), localOut);
  let text = localText;
    if (!text) {
      let pdfBuffer;
      if (isHttp) {
        const res = await fetch(localPdf);
        if (!res.ok) throw new Error(`No se pudo descargar el PDF: ${res.status}`);
        const ab = await res.arrayBuffer();
        pdfBuffer = Buffer.from(ab);
      } else {
        pdfBuffer = fs.readFileSync(path.resolve(process.cwd(), localPdf));
      }
      text = await extractPdfText(pdfBuffer);
    }
  const minText = Number(args['min-text'] || 10);
  if (!text || text.length < minText) throw new Error('No se pudo extraer texto significativo del PDF');
    // Enable ts-node to transpile TypeScript packages like edge-tts on the fly
    try { require('ts-node/register/transpile-only'); } catch (_) {}
  // Use edge-tts compiled JS from package 'out' to avoid TS loader issues
  let edgeTTS;
  try { edgeTTS = require('../node_modules/edge-tts/out/index.js'); } catch (e) { edgeTTS = null; }
  if (!edgeTTS) console.warn('edge-tts no disponible; intentaré con SAPI en Windows');
    const max = 4000;
    const chunks = [];
    for (let i = 0; i < text.length; i += max) chunks.push(text.slice(i, i + max));
    const audioChunks = [];
    try {
      if (edgeTTS) {
        for (const [idx, chunk] of chunks.entries()) {
          console.log(`Synthesizing chunk ${idx + 1}/${chunks.length}...`);
          // Use library's tts helper; retry on transient 403/5xx
          let produced = null; let attempts = 0;
          while (!produced && attempts < 3) {
            attempts += 1;
            try {
              const res = await edgeTTS.tts({ text: chunk, voice: shortNameOverride, format: 'audio-24khz-48kbitrate-mono-mp3' });
              if (Buffer.isBuffer(res)) produced = res;
              else if (res?.audioData) produced = Buffer.from(res.audioData);
            } catch (err) {
              if (attempts >= 3) throw err;
              await new Promise(r => setTimeout(r, 1000 * attempts));
            }
          }
          if (!produced || produced.length === 0) throw new Error(`Fallo la síntesis del fragmento ${idx + 1}`);
          audioChunks.push(produced);
        }
      } else {
        throw new Error('EDGE_TTS_UNAVAILABLE');
      }
    } catch (err) {
      // Fallback: Windows SAPI via PowerShell to WAV, then convert to MP3 with ffmpeg
      if (process.platform !== 'win32') throw err;
      console.warn('Fallo edge-tts o no disponible; usando SAPI en Windows (fallback).');
      const tmpDir = path.join(os.tmpdir(), 'tts_sapi');
      fs.mkdirSync(tmpDir, { recursive: true });
      const wavPath = path.join(tmpDir, `sapi_${Date.now()}.wav`);
      const escapedText = (text || '').replace(/`/g, '``').replace(/"/g, '\"');
      const ps = `
        $spFileStream = New-Object -ComObject SAPI.SpFileStream;
        $spAudioFormat = New-Object -ComObject SAPI.SpAudioFormat;
        $spAudioFormat.Type = 22; # SAFT44kHz16BitMono
        $spFileStream.Format = $spAudioFormat;
        $spFileStream.Open(\"${wavPath}\", 3, $false);
        $spVoice = New-Object -ComObject SAPI.SpVoice;
        $null = $spVoice.Speak(\"${escapedText}\");
        $spFileStream.Close();
      `;
      const res = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf-8' });
      if (res.status !== 0) {
        throw new Error(`SAPI fallo: ${res.stderr || res.stdout || res.status}`);
      }
      // Convert WAV to MP3
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegPath = require('ffmpeg-static');
      if (ffmpegPath) try { ffmpeg.setFfmpegPath(ffmpegPath); } catch (_) {}
      await new Promise((resolve, reject) => {
        ffmpeg(wavPath)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .format('mp3')
          .on('error', reject)
          .on('end', resolve)
          .save(outPath);
      });
      console.log(`Audio guardado en: ${outPath} (fallback SAPI)`);
      return;
    }
    const audioBuffer = Buffer.concat(audioChunks);
    if (!audioBuffer || audioBuffer.length < 50000) throw new Error('El audio generado es demasiado corto');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, audioBuffer);
    console.log(`Audio guardado en: ${outPath} (bytes=${audioBuffer.length})`);
    return;
  }

  // Resolve providers for Supabase mode
  const librosRepo = app.get('LibrosRepository');
  const vocesRepo = app.get('VocesRepository');
  const relRepo = app.get('LibrosUsuariosRepository');
  const supa = app.get(require('../src/infrastructure/supabase/supabase.service').SupabaseService, { strict: false }) || app.get(require('../dist/infrastructure/supabase/supabase.service').SupabaseService, { strict: false });
  const tts = app.get(require('../src/infrastructure/tts/providers/edge-tts.service').EdgeTtsService, { strict: false }) || app.get(require('../dist/infrastructure/tts/providers/edge-tts.service').EdgeTtsService, { strict: false });

  console.log(`Generating/retrieving audio for book=${id}, voice=${id_voz}, rate=${rate}, user=${userId}`);
  const book = await librosRepo.findById(id);
  if (!book) throw new Error('Libro no encontrado');
  const voice = await vocesRepo.findById(id_voz);
  if (!voice) throw new Error('Voz no encontrada');
  const shortName = voice.short_name;
  console.log('Libro.archivo =', book.archivo);

  // Check if exists in storage
  const bucket = (require('../src/infrastructure/config/env').env.bucketAudios) || 'audios_libros';
  const dir = String(id);
  const fileName = `${shortName}.mp3`;
  const storagePath = `${dir}/${fileName}`;
  try {
    const { data: list } = await supa.admin.storage.from(bucket).list(dir, { search: fileName });
    if (Array.isArray(list) && list.find((f) => f.name === fileName)) {
      const { data: pub } = supa.admin.storage.from(bucket).getPublicUrl(storagePath);
      console.log('Audio already exists:', pub.publicUrl);
      // Update relation
      await relRepo.startReading(userId, id);
      await relRepo.updateProgress(userId, id, { id_voz, id_playbackrate: rate, audio: pub.publicUrl });
      console.log('Done.');
      await app.close();
      return;
    }
  } catch {}

  // Download PDF and extract text
  const pdfBuf = await downloadPdfBuffer(supa, book.archivo);
  console.log('PDF descargado, tamaño (bytes)=', pdfBuf?.length || 0);
  let text = await extractPdfText(pdfBuf);
  console.log('Longitud de texto extraído =', (text || '').length);
  if (!text || text.length < 50) {
    // Python fallback using pdfminer.six (pure-Python) to extract text when JS extractors fail
    console.warn('Extracción JS insuficiente; intentando con Python (pdfminer.six)...');
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    const { spawnSync } = require('child_process');
    const tmpPdf = path.join(os.tmpdir(), `book_${id}_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPdf, pdfBuf);
    // Ensure pdfminer.six is available
    let py = spawnSync('python', ['-c', 'import sys; import pkgutil; sys.exit(0 if pkgutil.find_loader("pdfminer.high_level") else 1)'], { encoding: 'utf-8' });
    if (py.status !== 0) {
      console.log('Instalando pdfminer.six en Python del sistema (modo usuario)...');
      spawnSync('python', ['-m', 'pip', 'install', '--user', 'pdfminer.six'], { stdio: 'inherit' });
    }
    const pyScript = path.join(__dirname, 'extract_pdf_text.py');
    const res = spawnSync('python', [pyScript, tmpPdf], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    if (res.status === 0 && res.stdout) {
      text = String(res.stdout || '').trim();
    }
    try { fs.unlinkSync(tmpPdf); } catch (_) {}
  }
  console.log('Longitud de texto tras fallback Python =', (text || '').length);
  if (!text || text.length < 50) throw new Error('No se pudo extraer texto significativo del PDF');
  // Persist extracted text as .txt alongside the PDF for future reuse
  try {
    let bucketTxt = (require('../src/infrastructure/config/env').env.bucketArchivos) || 'archivos_libros';
    let objPath = book.archivo;
    if (/^https?:\/\//i.test(objPath)) {
      const u = new URL(objPath);
      const idx = u.pathname.indexOf('/storage/v1/object/public/');
      if (idx !== -1) {
        const rest = u.pathname.substring(idx + '/storage/v1/object/public/'.length);
        const segs = rest.split('/');
        bucketTxt = segs.shift();
        objPath = segs.join('/');
      }
    }
    const txtPath = objPath.replace(/\.pdf$/i, '.txt');
    const { error: upTxtErr } = await supa.admin.storage.from(bucketTxt).upload(txtPath, Buffer.from(text, 'utf8'), { contentType: 'text/plain', upsert: true });
    if (upTxtErr) console.warn('No se pudo guardar el .txt:', upTxtErr.message);
  } catch (e) {
    console.warn('Fallo al guardar texto extraído como .txt:', e?.message);
  }

  // Chunk and synthesize (with Windows SAPI fallback)
  let audioBuffer = null;
  try {
    const max = 4000;
    const chunks = [];
    for (let i = 0; i < text.length; i += max) chunks.push(text.slice(i, i + max));
    const audioChunks = [];
    for (const [idx, chunk] of chunks.entries()) {
      console.log(`Synthesizing chunk ${idx + 1}/${chunks.length}...`);
      const b = await tts.synthesize({ text: chunk, shortName });
      if (!b || b.length === 0) throw new Error(`Fallo la síntesis del fragmento ${idx + 1}`);
      audioChunks.push(b);
    }
    audioBuffer = Buffer.concat(audioChunks);
    if (!audioBuffer || audioBuffer.length < 50000) throw new Error('El audio generado es demasiado corto');
  } catch (err) {
    if (process.platform !== 'win32') throw err;
    console.warn('Fallo edge-tts; fallback SAPI en Windows activo para modo Supabase (con fragmentación).');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const { spawnSync } = require('child_process');
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic) try { ffmpeg.setFfmpegPath(ffmpegStatic); } catch (_) {}
    const tmpDir = path.join(os.tmpdir(), 'tts_sapi');
    fs.mkdirSync(tmpDir, { recursive: true });
    // Chunk text to manageable sizes for SAPI
    const maxSapi = 3000;
    const parts = [];
    for (let i = 0; i < text.length; i += maxSapi) parts.push(text.slice(i, i + maxSapi));
    const wavFiles = [];
    for (let i = 0; i < parts.length; i++) {
      const chunk = parts[i];
      const wavPath = path.join(tmpDir, `sapi_${Date.now()}_${i}.wav`);
      const escapedText = String(chunk || '').replace(/`/g, '``').replace(/"/g, '\\"');
      const ps = `
        $spFileStream = New-Object -ComObject SAPI.SpFileStream;
        $spAudioFormat = New-Object -ComObject SAPI.SpAudioFormat;
        $spAudioFormat.Type = 22; # SAFT44kHz16BitMono
        $spFileStream.Format = $spAudioFormat;
        $spFileStream.Open(\"${wavPath}\", 3, $false);
        $spVoice = New-Object -ComObject SAPI.SpVoice;
        $null = $spVoice.Speak(\"${escapedText}\");
        $spFileStream.Close();
      `;
      const resPS = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf-8' });
      if (resPS.status !== 0) {
        throw new Error(`SAPI fallo en fragmento ${i + 1}: ${resPS.stderr || resPS.stdout || resPS.status}`);
      }
      wavFiles.push(wavPath);
    }
    // Create concat list file
    const listPath = path.join(tmpDir, `list_${Date.now()}.txt`);
    fs.writeFileSync(listPath, wavFiles.map((p) => `file '${p.replace(/'/g, "'\''")}'`).join('\n'));
    const mp3Path = path.join(tmpDir, `sapi_${Date.now()}.mp3`);
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f concat', '-safe 0'])
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .format('mp3')
        .on('error', reject)
        .on('end', resolve)
        .save(mp3Path);
    });
    audioBuffer = require('fs').readFileSync(mp3Path);
  }

  // Upload
  const { error: upErr } = await supa.admin.storage.from(bucket).upload(storagePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
  if (upErr) throw new Error(upErr.message);
  const { data: pub } = supa.admin.storage.from(bucket).getPublicUrl(storagePath);
  console.log('Audio URL:', pub.publicUrl);

  // Update relation
  await relRepo.startReading(userId, id);
  await relRepo.updateProgress(userId, id, { id_voz, id_playbackrate: rate, audio: pub.publicUrl });
  console.log('Done.');
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
