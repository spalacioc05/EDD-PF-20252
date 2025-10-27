import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

// Simple helper to get token for TEST_EMAIL
const TEST_EMAIL = process.env.TEST_EMAIL || 'santiago.palacioc1@udea.edu.co';

describe('Users (e2e)', () => {
  let app; let server;

  beforeAll(async () => {
    const modRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modRef.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginOk(email = TEST_EMAIL) {
    const res = await request(server).post(`/auth/login?correo=${encodeURIComponent(email)}`);
    if (res.status !== 200) {
      // try reactivate
      if (res.status === 403 && res.body?.code === 'inactive_user') {
        const re = await request(server).post(`/auth/reactivate?correo=${encodeURIComponent(email)}`);
        expect(re.status).toBe(200);
        return re.body.token;
      }
      throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.token;
  }

  it('GET /users/me returns current user', async () => {
    const token = await loginOk();
    const res = await request(server).get('/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.correo).toBe(TEST_EMAIL);
  });

  it('PATCH /users/me can update nombre and id_estado', async () => {
    const token = await loginOk();
    const nuevoNombre = `Tester ${Date.now()}`;
    const res = await request(server)
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: nuevoNombre });
    expect(res.status).toBe(200);
    expect(res.body.user.nombre).toBe(nuevoNombre);

    // set inactive
    const res2 = await request(server)
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ id_estado: 2 });
    expect(res2.status).toBe(200);
    expect(Number(res2.body.user.id_estado)).toBe(2);

    // next login should fail with inactive
    const res3 = await request(server).post(`/auth/login?correo=${encodeURIComponent(TEST_EMAIL)}`);
    expect(res3.status).toBe(403);
    expect(res3.body.code).toBe('inactive_user');

    // reactivate (or already active)
    const re = await request(server).post(`/auth/reactivate?correo=${encodeURIComponent(TEST_EMAIL)}`);
    expect(res3.status).toBe(403);
    if (re.status === 200) {
      expect(Number(re.body.user.id_estado)).toBe(1);
    } else if (re.status === 400) {
      // If already active for some reason, validate with a fresh login
      const t2 = await loginOk();
      const me2 = await request(server).get('/users/me').set('Authorization', `Bearer ${t2}`);
      expect(me2.status).toBe(200);
      expect(Number(me2.body.user.id_estado)).toBe(1);
    } else {
      throw new Error(`Unexpected reactivate status ${re.status}: ${JSON.stringify(re.body)}`);
    }
  });

  it('POST /users/me/photo uploads and updates foto_perfil', async () => {
    const token = await loginOk();
    const buf = Buffer.from('fake image for test');
    const res = await request(server)
      .post('/users/me/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', buf, { filename: 'avatar.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body.user).toHaveProperty('foto_perfil');
  });

  it('GET /users/me/photos lists history and PATCH /users/me/photo selects existing', async () => {
    const token = await loginOk();
    const me = await request(server).get('/users/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    const id = me.body.user.id_usuario;

    const list0 = await request(server).get('/users/me/photos').set('Authorization', `Bearer ${token}`);
    expect(list0.status).toBe(200);
    const initialCount = Array.isArray(list0.body.files) ? list0.body.files.length : 0;

    const buf = Buffer.from('fake image for test2');
    const up = await request(server)
      .post('/users/me/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', buf, { filename: 'avatar2.jpg', contentType: 'image/jpeg' });
    expect(up.status).toBe(200);
    expect(up.body).toHaveProperty('path');
    expect(up.body.path.startsWith(`user-${id}/`)).toBe(true);

    const list1 = await request(server).get('/users/me/photos').set('Authorization', `Bearer ${token}`);
    expect(list1.status).toBe(200);
    const files = list1.body.files || [];
    expect(files.length).toBeGreaterThanOrEqual(initialCount + 1);
    const newest = files[0];
    expect(newest.path.startsWith(`user-${id}/`)).toBe(true);

    const sel = await request(server)
      .patch('/users/me/photo')
      .set('Authorization', `Bearer ${token}`)
      .send({ path: newest.path });
    expect(sel.status).toBe(200);
    expect(sel.body.user).toHaveProperty('foto_perfil');
  });
});
