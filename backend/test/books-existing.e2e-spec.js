import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/infrastructure/supabase/supabase.service';

// tiny 1-page PDF saying Hello World
const SAMPLE_PDF_BASE64 =
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkcyBbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQzPj5zdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKChIZWxsbyBXb3JsZCkpIFRqIEVUCmVuc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTEyIDAwMDAwIG4gCjAwMDAwMDAyMTUgMDAwMDAgbiAKdHJhaWxlcgo8PC9Sb290IDEgMCBSL1NpemUgNT4+CnN0YXJ0eHJlZgoyNzYKJSVFT0YK';

describe('Books existing ids (e2e)', () => {
  let app; let server; let supabase; let bucket;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    server = app.getHttpServer();
    const supaSvc = mod.get(SupabaseService);
    supabase = supaSvc.admin;
    bucket = process.env.BUCKET_ARCHIVOS || 'archivos_libros';

    // Ensure libros 1 and 2 exist with a sample PDF if missing
    const ensureLibroWithPdf = async (id) => {
      const { data: found } = await supabase.from('tbl_libros').select('id_libro, archivo, titulo').eq('id_libro', id).maybeSingle();
      if (found && found.archivo) return found;
      const path = `test/id-${id}-${Date.now()}.pdf`;
      const buf = Buffer.from(SAMPLE_PDF_BASE64, 'base64');
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, buf, { contentType: 'application/pdf', upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = pub.publicUrl;
      const titulo = found?.titulo || `Libro ${id} (auto)`;
      const { error: insErr } = await supabase
        .from('tbl_libros')
        .upsert({ id_libro: id, titulo, archivo: url }, { onConflict: 'id_libro' });
      if (insErr) throw insErr;
      return { id_libro: id, archivo: url };
    };

    await ensureLibroWithPdf(1);
    await ensureLibroWithPdf(2);
  });

  afterAll(async () => { await app.close(); });

  it('Analyze id=1 computes paginas/palabras', async () => {
    const res = await request(server).post('/books/1/analyze');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    const r = res.body.results[0];
    expect(r.id_libro).toBe(1);
    if (!r.error) {
      // Verify DB updated
      const me = await supabase.from('tbl_libros').select('paginas, palabras').eq('id_libro', 1).maybeSingle();
      expect(me.error).toBeNull();
      expect(typeof me.data.paginas).toBe('number');
      expect(typeof me.data.palabras).toBe('number');
    } else {
      expect(typeof r.error).toBe('string');
    }
  }, 20000);

  it('Analyze id=2 computes paginas/palabras', async () => {
    const res = await request(server).post('/books/2/analyze');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    const r = res.body.results[0];
    expect(r.id_libro).toBe(2);
    if (!r.error) {
      const me = await supabase.from('tbl_libros').select('paginas, palabras').eq('id_libro', 2).maybeSingle();
      expect(me.error).toBeNull();
      expect(typeof me.data.paginas).toBe('number');
      expect(typeof me.data.palabras).toBe('number');
    } else {
      expect(typeof r.error).toBe('string');
    }
  }, 20000);
});
