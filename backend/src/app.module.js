import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './presentation/controllers/health.controller';
import { DatabaseService } from './infrastructure/database/database.service';
import { SupabaseService } from './infrastructure/supabase/supabase.service';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController, HealthController],
  providers: [AppService, DatabaseService, SupabaseService, BootstrapService],
})
export class AppModule {}
