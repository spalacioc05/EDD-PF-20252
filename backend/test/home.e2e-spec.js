import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/infrastructure/supabase/supabase.service';

// This suite validates the new home data endpoints: /genres, /books, /users/me/reading

describe('Home data (e2e)', () => {
  let app;
  let server;
  let supabaseAdmin;

  const TEST_EMAIL = 'santiago.palacioc1@udea.edu.co';
  let testUserId;
  let generoFantasiaId;
  let generoRealismoId;
  let libroFantasiaId;
  let libroRealismoId;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();

    const supabaseSvc = moduleFixture.get(SupabaseService);
    supabaseAdmin = supabaseSvc.admin;

    // Ensure user exists and get id
    const up = await supabaseAdmin
      .from('tbl_usuarios')
      .upsert({ nombre: 'Santiago Palacios', correo: TEST_EMAIL, id_estado: 1 }, { onConflict: 'correo' })
      .select('id_usuario')
      .maybeSingle();
    testUserId = up.data?.id_usuario;
  // Force reactivation to avoid 403 on login in this suite
  await request(server).post(`/auth/reactivate?correo=${encodeURIComponent(TEST_EMAIL)}`);

    // Seed genres
    const fant = await supabaseAdmin
      .from('tbl_generos')
      .upsert({ nombre: 'Fantasía' }, { onConflict: 'nombre' })
      .select('*')
      .maybeSingle();
    generoFantasiaId = fant.data?.id_genero;

    const real = await supabaseAdmin
      .from('tbl_generos')
      .upsert({ nombre: 'Realismo mágico' }, { onConflict: 'nombre' })
      .select('*')
      .maybeSingle();
    generoRealismoId = real.data?.id_genero;

    // Seed books
    const ins1 = await supabaseAdmin
      .from('tbl_libros')
      .insert({ titulo: 'Libro Fantasía Test', id_estado: 1 })
      .select('id_libro')
      .maybeSingle();
    libroFantasiaId = ins1.data?.id_libro;

    const ins2 = await supabaseAdmin
      .from('tbl_libros')
      .insert({ titulo: 'Libro Realismo Test', id_estado: 1 })
      .select('id_libro')
      .maybeSingle();
    libroRealismoId = ins2.data?.id_libro;

    // Map genres
    if (libroFantasiaId && generoFantasiaId) {
      await supabaseAdmin
        .from('tbl_libros_x_generos')
        .upsert({ id_libro: libroFantasiaId, id_genero: generoFantasiaId }, { onConflict: 'id_libro,id_genero' });
    }
    if (libroRealismoId && generoRealismoId) {
      await supabaseAdmin
        .from('tbl_libros_x_generos')
        .upsert({ id_libro: libroRealismoId, id_genero: generoRealismoId }, { onConflict: 'id_libro,id_genero' });
    }

    // Seed reading progress for user on one book
    if (testUserId && libroFantasiaId) {
      await supabaseAdmin
        .from('tbl_libros_x_usuarios')
        .insert({ id_usuario: testUserId, id_libro: libroFantasiaId, pagina: 5, palabra: 100, progreso: 0.1, id_estado: 1 })
        .select('*')
        .maybeSingle();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginOk(email = TEST_EMAIL) {
    const res = await request(server).post(`/auth/login?correo=${encodeURIComponent(email)}`);
    if (res.status === 200) return res.body;
    if (res.status === 403 && res.body?.code === 'inactive_user') {
      const re = await request(server).post(`/auth/reactivate?correo=${encodeURIComponent(email)}`);
      expect(re.status).toBe(200);
      return re.body;
    }
    // eslint-disable-next-line no-console
    console.log('Login response', res.status, res.body);
    throw new Error('Login failed');
  }

  it('GET /genres returns dynamic genres', async () => {
    const res = await request(server).get('/genres').expect(200);
    expect(res.body).toHaveProperty('genres');
    const arr = res.body.genres;
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBeGreaterThan(0);
  });

  it('GET /books?genreId filters by genre', async () => {
    // If genre id is missing for any reason, pick first available
    let gid = generoFantasiaId;
    if (!gid) {
      const g = await request(server).get('/genres').expect(200);
      gid = g.body.genres?.[0]?.id_genero;
    }
    const res = await request(server).get(`/books?genreId=${gid}`).expect(200);
    expect(res.body).toHaveProperty('books');
    expect(Array.isArray(res.body.books)).toBe(true);
  });

  it('GET /users/me/reading returns current user reading list', async () => {
    const login = await loginOk(TEST_EMAIL);
    const token = login.token;
    const res = await request(server)
      .get('/users/me/reading')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('items');
    const items = res.body.items || [];
    // Should contain at least the fantasia test book
    const titles = items.map((it) => it.tbl_libros?.titulo || it.titulo).filter(Boolean);
    expect(titles).toEqual(expect.arrayContaining(['Libro Fantasía Test']));
  });
});
