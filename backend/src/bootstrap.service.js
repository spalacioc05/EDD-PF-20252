import { Injectable, Dependencies, Logger } from '@nestjs/common';
import { SupabaseService } from './infrastructure/supabase/supabase.service';

@Injectable()
@Dependencies(SupabaseService)
export class BootstrapService {
  constructor(supabaseService) {
    this.supabaseService = supabaseService;
    this.logger = new Logger('BootstrapService');
  }

  async onModuleInit() {
    try {
      const res = await this.supabaseService.ensureBuckets();
      if (res?.ok) {
        this.logger.log(
          `Storage buckets ensured: ${res.ensured
            .map((b) => `${b.name}${b.existed ? ' (existing)' : ''}`)
            .join(', ')}`,
        );
      } else {
        this.logger.warn(`Bucket ensure skipped or failed: ${res?.error || 'unknown'}`);
      }
    } catch (e) {
      this.logger.error('Error ensuring buckets', e);
    }
  }
}
