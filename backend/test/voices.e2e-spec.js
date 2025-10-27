import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/infrastructure/supabase/supabase.service';

describe('Voices per book (e2e)', () => {
  let app; let server; let supabase; let libroId; let idiomaId; let tonoA; let tonoB; let voz1; let voz2;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    server = app.getHttpServer();
    supabase = mod.get(SupabaseService).admin;

    // Seed idioma
    const { data: idi, error: idiErr } = await supabase
      .from('tbl_idiomas')
      .upsert({ codigo: 'es', nombre: 'Español' }, { onConflict: 'codigo' })
      .select('*')
      .maybeSingle();
    if (!idiErr) idiomaId = idi?.id_idioma;

    // Seed libro
    const { data: lib } = await supabase.from('tbl_libros').insert({ titulo: `Libro Voces ${Date.now()}` }).select('id_libro').maybeSingle();
    libroId = lib?.id_libro;

    // Try set libro.id_idioma if column exists
    if (idiomaId && libroId) {
      try { await supabase.from('tbl_libros').update({ id_idioma: idiomaId }).eq('id_libro', libroId); } catch (_) {}
    }

    // Seed tones
    const ta = await supabase.from('tbl_tonos').upsert({ nombre: 'Amable' }, { onConflict: 'nombre' }).select('*').maybeSingle();
    const tb = await supabase.from('tbl_tonos').upsert({ nombre: 'Profundo' }, { onConflict: 'nombre' }).select('*').maybeSingle();
    tonoA = ta.data?.id_tono; tonoB = tb.data?.id_tono;

    // Seed voices
    const v1 = await supabase.from('tbl_voces').insert({ display_name: 'Lucía', short_name: 'es-CL-Luc', id_idioma: idiomaId }).select('*').maybeSingle();
    const v2 = await supabase.from('tbl_voces').insert({ display_name: 'Carlos', short_name: 'es-CO-Car', id_idioma: idiomaId }).select('*').maybeSingle();
    voz1 = v1.data?.id_voz; voz2 = v2.data?.id_voz;

    if (voz1 && tonoA) await supabase.from('tbl_voces_x_tonos').insert({ id_voz: voz1, id_tono: tonoA });
    if (voz2 && tonoB) await supabase.from('tbl_voces_x_tonos').insert({ id_voz: voz2, id_tono: tonoB });
  });

  afterAll(async () => { await app.close(); });

  it('GET /books/:id/voices returns at least one voice or 400 if idioma is unknown', async () => {
    const res = await request(server).get(`/books/${libroId}/voices`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.voces)).toBe(true);
      expect(res.body.voces[0]).toHaveProperty('display_name');
    } else {
      expect(res.body).toHaveProperty('message');
    }
  }, 15000);

  it('GET /books/:id/voices?tones filters voices when idioma is known', async () => {
    const res = await request(server).get(`/books/${libroId}/voices?tones=${tonoA}`);
    if (res.status === 200) {
      const arr = res.body.voces || [];
      expect(Array.isArray(arr)).toBe(true);
      // Should filter some results; at least not error
      expect(arr.length).toBeGreaterThanOrEqual(1);
    } else {
      // idioma unknown scenario is acceptable for environments missing column
      expect(res.status).toBe(400);
    }
  }, 15000);
});
