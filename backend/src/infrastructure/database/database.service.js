import { Injectable } from '@nestjs/common';
import pg from 'pg';
import { env } from '../config/env';

const { Pool } = pg;

@Injectable()
export class DatabaseService {
  constructor() {
    this.pool = new Pool({ connectionString: env.databaseUrl, max: 10 });
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async ping() {
    // Simple connectivity check
    const client = await this.pool.connect();
    try {
      const res = await client.query('SELECT NOW() as now');
      return { ok: true, now: res.rows[0]?.now };
    } finally {
      client.release();
    }
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }
}
