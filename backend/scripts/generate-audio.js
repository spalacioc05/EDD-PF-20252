// Node script to generate/reuse full-PDF TTS audio for a given book and voice
// Usage:
//   node scripts/generate-audio.js --book=1 --voice=1 --rate=1.0 --user=1
// Notes:
// - Does NOT modify tbl_voces; it only references existing voices by id.
// - Requires environment configured for Supabase and JWT secret.

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const jwt = require('jsonwebtoken');
const path = require('path');

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  const id = Number(args.book || args.b || 1);
  const id_voz = Number(args.voice || args.v || 1);
  const rate = Number(args.rate || 1.0);
  const userId = Number(args.user || 1);

  if (!process.env.JWT_SECRET) {
    console.error('Missing JWT_SECRET in environment');
    process.exit(1);
  }
  if (!(id_voz >= 1 && id_voz <= 16)) {
    console.error('Voice id must be between 1 and 16');
    process.exit(1);
  }

  // Create a token for the given user id
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Bootstrap Nest app (use compiled JS in dist if available)
  // Fallback to ts via register if dist not present
  let app;
  try {
    app = await NestFactory.create(AppModule);
  } catch (e) {
    require('@babel/register');
    const { AppModule: AppModuleTs } = require('../src/app.module');
    app = await NestFactory.create(AppModuleTs);
  }
  await app.init();

  // Resolve use-case from DI
  const mod = app.select(app.get(AppModule).constructor);
  const generateUC = mod.get(require('../src/application/books/use-cases/generate-book-audio.use-case').GenerateBookAudioUseCase, { strict: false });

  console.log(`Generating/retrieving audio for book=${id}, voice=${id_voz}, rate=${rate}, user=${userId}`);
  const result = await generateUC.execute({ token, id, id_voz, id_playbackrate: rate });
  console.log('Audio URL:', result.audioUrl);
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
