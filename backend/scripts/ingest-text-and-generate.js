#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/ingest-text-and-generate.js <bookId> <voiceId> <textFilePath> [--host=http://localhost:3000] [--force=1] [--minWords=500]
 *
 * Steps:
 *  1. Read local plaintext file.
 *  2. POST /books/:id/text to store it in storage.
 *  3. POST /books/:id/audio-chunks to generate TTS chunks (optionally force regeneration).
 *  4. GET /books/:id/audio-chunks to print manifest summary.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node scripts/ingest-text-and-generate.js <bookId> <voiceId> <textFilePath> [--host=] [--force=1] [--minWords=500]');
    process.exit(1);
  }
  const bookId = Number(args[0]);
  const voiceId = Number(args[1]);
  const textFile = args[2];
  let host = 'http://localhost:3000';
  let force = false;
  let minWords = 500;
  for (const a of args.slice(3)) {
    if (a.startsWith('--host=')) host = a.substring('--host='.length);
    else if (a === '--force=1' || a === '--force=true') force = true;
    else if (a.startsWith('--minWords=')) minWords = Number(a.substring('--minWords='.length)) || minWords;
  }
  return { bookId, voiceId, textFile, host, force, minWords };
}

function requestJson(method, urlStr, bodyObj) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const client = u.protocol === 'https:' ? https : http;
      const data = bodyObj ? JSON.stringify(bodyObj) : null;
      const req = client.request(
        {
          method,
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + u.search,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data ? Buffer.byteLength(data) : 0,
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (d) => chunks.push(d));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            let json = null;
            try { json = JSON.parse(raw); } catch { json = { raw }; }
            if (res.statusCode >= 200 && res.statusCode < 300) return resolve(json);
            const err = new Error(json?.message || 'Request failed');
            err.statusCode = res.statusCode;
            err.response = json;
            return reject(err);
          });
        },
      );
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  const { bookId, voiceId, textFile, host, force, minWords } = parseArgs();
  const abs = path.resolve(textFile);
  if (!fs.existsSync(abs)) {
    console.error('Text file not found:', abs);
    process.exit(1);
  }
  const text = fs.readFileSync(abs, 'utf8');
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  console.log(`[ingest] Read ${wordCount} words from ${abs}`);
  if (wordCount < 100) {
    console.error('Text must have at least 100 words');
    process.exit(1);
  }
  try {
    // 1. Upload text
    console.log(`[ingest] Uploading text for book ${bookId}...`);
    const up = await requestJson('POST', `${host}/books/${bookId}/text`, { text });
    console.log('[ingest] Upload response:', up);
    // 2. Generate chunks
    console.log(`[generate] Generating audio chunks (voice ${voiceId}) force=${force} minWords=${minWords}...`);
    const gen = await requestJson('POST', `${host}/books/${bookId}/audio-chunks?force=${force ? '1' : '0'}&minWords=${minWords}`, { voiceId });
    console.log('[generate] Generation response: totalChunks=', gen?.manifest?.totalChunks, ' totalWords=', gen?.manifest?.totalWords);
    // 3. Fetch manifest
    console.log('[manifest] Fetching manifest...');
    const mf = await requestJson('GET', `${host}/books/${bookId}/audio-chunks?voiceId=${voiceId}`);
    console.log('[manifest] schemaVersion=', mf?.manifest?.schemaVersion, ' chunks=', mf?.manifest?.chunks?.length);
    // Print sample chunk URLs
    (mf?.manifest?.chunks || []).slice(0, 3).forEach((ch) => console.log(' chunk', ch.index, ch.url));
    console.log('[done] Ingestion & generation complete');
  } catch (e) {
    console.error('Error:', e.statusCode, e.message);
    if (e.response) console.error('Response:', e.response);
    process.exit(1);
  }
}

main();