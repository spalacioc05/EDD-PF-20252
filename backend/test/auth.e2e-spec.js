import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/infrastructure/supabase/supabase.service';

describe('Auth (e2e)', () => {
  let app;
  let server;
  let supabaseAdmin;

  const TEST_EMAIL = 'santiago.palacioc1@udea.edu.co';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();

    // Use Supabase admin client to prepare test data (avoid raw pg pool leaks)
    const supabaseSvc = moduleFixture.get(SupabaseService);
    supabaseAdmin = supabaseSvc.admin;
    // Ensure user exists and is active
    await supabaseAdmin
      .from('tbl_usuarios')
      .upsert({ nombre: 'Santiago Palacios', correo: TEST_EMAIL, id_estado: 1 }, { onConflict: 'correo' });
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginOk(email = TEST_EMAIL) {
    const res = await request(server).post(`/auth/login?correo=${encodeURIComponent(email)}`);
    if (res.status === 200) return res.body;
    if (res.status === 403 && res.body?.code === 'inactive_user') {
      const re = await request(server).post(`/auth/reactivate?correo=${encodeURIComponent(email)}`);
      if (re.status === 200) return re.body;
      // If reactivation fails (already active), try login again
      const retry = await request(server).post(`/auth/login?correo=${encodeURIComponent(email)}`);
      expect(retry.status).toBe(200);
      return retry.body;
    }
    // Debug output if failing
    // eslint-disable-next-line no-console
    console.log('Login response', res.status, res.body);
    throw new Error('Login failed');
  }

  it('POST /auth/login with existing email returns token', async () => {
    const res = await loginOk(TEST_EMAIL);
    expect(res).toHaveProperty('token');
    expect(res).toHaveProperty('user');
    expect(res.user.correo).toBe(TEST_EMAIL);
  });

  it('POST /auth/login with invalid email returns 401', async () => {
    const res = await request(server).post('/auth/login?correo=no-existe@example.com');
    if (res.status !== 401) {
      // eslint-disable-next-line no-console
      console.log('Invalid login response', res.status, res.body);
    }
    expect(res.status).toBe(401);
    expect(res.body.statusCode).toBe(401);
  });

  it('POST /auth/logout updates ultimo_login', async () => {
    const login = await loginOk(TEST_EMAIL);
    const token = login.token;
    expect(token).toBeTruthy();

    const before = await supabaseAdmin
      .from('tbl_usuarios')
      .select('ultimo_login')
      .eq('correo', TEST_EMAIL)
      .maybeSingle();
    const prev = before.data?.ultimo_login;

    await request(server)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const after = await supabaseAdmin
      .from('tbl_usuarios')
      .select('ultimo_login')
      .eq('correo', TEST_EMAIL)
      .maybeSingle();
    const now = new Date();
    const updated = after.data?.ultimo_login;
    expect(updated).toBeTruthy();
    const updatedMs = new Date(updated).getTime();
    if (prev) {
      // new timestamp should be >= previous
      expect(updatedMs).toBeGreaterThanOrEqual(new Date(prev).getTime());
    }
    // tolerate timezone differences; ensure it's not older than 24h
    expect(now.getTime() - updatedMs).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it('GET /auth/me returns current user with token', async () => {
    const login = await loginOk(TEST_EMAIL);
    const token = login.token;
    const me = await request(server).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body).toHaveProperty('user');
    expect(me.body.user.correo).toBe(TEST_EMAIL);
  });
});
