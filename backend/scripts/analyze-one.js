// Run: npm run analyze:one -- <id>
// Boots Nest DI, runs AnalyzeBooksUseCase for the given id, prints the updated row
/* eslint-disable no-console */
const path = require('path');
require('@babel/register')({ configFile: path.join(__dirname, '../test/babel.config.cjs') });
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../src/app.module');
const { AnalyzeBooksUseCase } = require('../src/application/books/use-cases/analyze-books.use-case');

async function main() {
  const id = Number(process.argv[2] || '1');
  if (!Number.isFinite(id)) {
    console.error('Usage: npm run analyze:one -- <id>');
    process.exit(1);
  }
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    try {
      const m = require('pdf-parse');
      console.log('[debug] require("pdf-parse") typeof =', typeof m, 'keys=', Object.keys(m));
    } catch (e) {
      console.log('[debug] require("pdf-parse") failed:', e.message);
    }
    const analyze = app.get(AnalyzeBooksUseCase);
    const repo = app.get('LibrosRepository');
    console.log(`[before] libro ${id}:`, await repo.findById(id));
    const result = await analyze.execute({ id });
    console.log('[analyze.result]', JSON.stringify(result, null, 2));
    const after = await repo.findById(id);
    console.log(`[after] libro ${id}:`, after);
  } catch (e) {
    console.error('Error:', e?.message || e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
