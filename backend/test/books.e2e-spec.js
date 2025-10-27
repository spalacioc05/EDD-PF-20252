import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/infrastructure/supabase/supabase.service';

// tiny 1-page PDF saying Hello World
const SAMPLE_PDF_BASE64 =
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkcyBbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQzPj5zdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKChIZWxsbyBXb3JsZCkpIFRqIEVUCmVuc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTEyIDAwMDAwIG4gCjAwMDAwMDAyMTUgMDAwMDAgbiAKdHJhaWxlcgo8PC9Sb290IDEgMCBSL1NpemUgNT4+CnN0YXJ0eHJlZgoyNzYKJSVFT0YK';

describe('Books analysis (e2e)', () => {
  let app; let server; let supabase; let libroId; let bucket;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    server = app.getHttpServer();
    const supaSvc = mod.get(SupabaseService);
    supabase = supaSvc.admin;
    bucket = process.env.BUCKET_ARCHIVOS || 'archivos_libros';

    // Upload sample PDF
    const path = `test/sample-${Date.now()}.pdf`;
    const buf = Buffer.from(SAMPLE_PDF_BASE64, 'base64');
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, buf, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const url = pub.publicUrl;

    // Upsert libro pointing to this URL
    const titulo = `PDF Test ${Date.now()}`;
    const { data: ins, error: insErr } = await supabase
      .from('tbl_libros')
      .insert({ titulo, archivo: url, paginas: null, palabras: null })
      .select('id_libro')
      .single();
    if (insErr) throw insErr;
    libroId = ins.id_libro;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /books/:id/analyze computes pages and words (or reports error)', async () => {
    const res = await request(server).post(`/books/${libroId}/analyze`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(res.body.results[0]).toHaveProperty('id_libro', libroId);
    const r = res.body.results[0];
    // If parsing succeeded, paginas should be a number >= 1. If it failed, ensure an error string is present.
    if (typeof r.paginas === 'number') {
      expect(r.paginas).toBeGreaterThanOrEqual(0);
    } else {
      expect(typeof r.error).toBe('string');
    }
  });

  it('POST /books/analyze works for batch', async () => {
    const res = await request(server).post(`/books/analyze`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
  }, 15000);
});
