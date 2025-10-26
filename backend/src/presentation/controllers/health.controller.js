import { Controller, Dependencies, Get } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';

@Controller('health')
@Dependencies(DatabaseService, SupabaseService)
export class HealthController {
  constructor(dbService, supabaseService) {
    this.dbService = dbService;
    this.supabaseService = supabaseService;
  }

  @Get()
  async getHealth() {
    const result = { database: { ok: false }, supabase: { ok: false } };
    try {
      const db = await this.dbService.ping();
      result.database = db;
    } catch (e) {
      result.database = { ok: false, error: e?.message };
    }

    try {
      const sb = await this.supabaseService.health();
      result.supabase = sb;
    } catch (e) {
      result.supabase = { ok: false, error: e?.message };
    }

    return {
      status: result.database.ok && result.supabase.ok ? 'ok' : 'degraded',
      ...result,
    };
  }
}
