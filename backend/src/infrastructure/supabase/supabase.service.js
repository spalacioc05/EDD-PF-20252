import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

@Injectable()
export class SupabaseService {
  constructor() {
    this.logger = new Logger('SupabaseService');
    // Read from process.env at runtime to ensure values exist in test/bootstrap
    const SUPABASE_URL = process.env.SUPABASE_URL || env.supabaseUrl;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || env.supabaseAnonKey;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseServiceRoleKey;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      this.admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    this.requiredBuckets = [
      process.env.BUCKET_PORTADAS || env.bucketPortadas,
      process.env.BUCKET_ARCHIVOS || env.bucketArchivos,
      process.env.BUCKET_AUDIOS || env.bucketAudios,
      process.env.BUCKET_FOTOS || env.bucketFotos,
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
        // try to ensure it's public
        try {
          await this.admin.storage.updateBucket(name, { public: true });
        } catch (e) {
          // ignore if update not allowed; policies may already exist
          this.logger.warn(`Bucket ${name} exists; could not update public flag: ${e?.message}`);
        }
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
