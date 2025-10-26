import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './presentation/controllers/health.controller';
import { DatabaseService } from './infrastructure/database/database.service';
import { SupabaseService } from './infrastructure/supabase/supabase.service';
import { BootstrapService } from './bootstrap.service';
import { LoginUseCase } from './application/users/use-cases/login.use-case';
import { LogoutUseCase } from './application/users/use-cases/logout.use-case';
import { GetMeUseCase } from './application/users/use-cases/get-me.use-case';
import { ReactivateUseCase } from './application/users/use-cases/reactivate.use-case';
import { UpdateProfileUseCase } from './application/users/use-cases/update-profile.use-case';
import { UploadPhotoUseCase } from './application/users/use-cases/upload-photo.use-case';
import { UsuariosRepositoryImpl } from './infrastructure/database/supabase/usuarios.repository.impl';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    DatabaseService,
    SupabaseService,
    BootstrapService,
    // Repos & use-cases
    { provide: 'UsuariosRepository', useClass: UsuariosRepositoryImpl },
    { provide: LoginUseCase, useFactory: (repo) => new LoginUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: LogoutUseCase, useFactory: (repo) => new LogoutUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: GetMeUseCase, useFactory: (repo) => new GetMeUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: ReactivateUseCase, useFactory: (repo) => new ReactivateUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: UpdateProfileUseCase, useFactory: (repo) => new UpdateProfileUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: UploadPhotoUseCase, useFactory: (repo, supa) => new UploadPhotoUseCase(repo, supa), inject: ['UsuariosRepository', SupabaseService] },
  ],
})
export class AppModule {}
