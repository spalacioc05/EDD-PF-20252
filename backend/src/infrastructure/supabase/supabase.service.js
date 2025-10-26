import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

@Injectable()
export class SupabaseService {
  constructor() {
    this.logger = new Logger('SupabaseService');
    if (env.supabaseUrl && env.supabaseAnonKey) {
      this.client = createClient(env.supabaseUrl, env.supabaseAnonKey);
    }
    if (env.supabaseUrl && env.supabaseServiceRoleKey) {
      this.admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    this.requiredBuckets = [
      env.bucketPortadas,
      env.bucketArchivos,
      env.bucketAudios,
      env.bucketFotos,
    ];
  }

  async ensureBuckets() {
    if (!this.admin) {
      this.logger.warn('Supabase admin client not configured; skipping bucket check');
      return { ok: false, ensured: [], error: 'missing_admin_client' };
    }
    const ensured = [];
    // list existing buckets
    const { data: buckets, error: listErr } = await this.admin.storage.listBuckets();
    if (listErr) {
      this.logger.error('Error listing buckets', listErr);
      return { ok: false, ensured, error: listErr.message };
    }
    const existing = new Set((buckets || []).map((b) => b.name));
    for (const name of this.requiredBuckets) {
      if (!name) continue;
      if (existing.has(name)) {
        ensured.push({ name, existed: true });
        continue;
      }
      const { error: createErr } = await this.admin.storage.createBucket(name, {
        public: true,
      });
      if (createErr && createErr.message && !/exists/i.test(createErr.message)) {
        this.logger.error(`Error creating bucket ${name}`, createErr);
        continue;
      }
      ensured.push({ name, existed: false });
    }
    return { ok: true, ensured };
  }

  async health() {
    // Basic call to detect availability by listing buckets (no admin required, but we'll prefer admin)
    try {
      const client = this.admin || this.client;
      if (!client) return { ok: false, error: 'no_client' };
      const { data, error } = await client.storage.listBuckets();
      if (error) return { ok: false, error: error.message };
      return { ok: true, buckets: (data || []).map((b) => b.name) };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  }
}
