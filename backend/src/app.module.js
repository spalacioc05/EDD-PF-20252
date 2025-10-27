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
import { ListPhotosUseCase } from './application/users/use-cases/list-photos.use-case';
import { SetPhotoUseCase } from './application/users/use-cases/set-photo.use-case';
import { UsuariosRepositoryImpl } from './infrastructure/database/supabase/usuarios.repository.impl';
import { LibrosRepositoryImpl } from './infrastructure/database/supabase/libros.repository.impl';
import { AnalyzeBooksUseCase } from './application/books/use-cases/analyze-books.use-case';
import { AnalyzeMissingBooksUseCase } from './application/books/use-cases/analyze-missing-books.use-case';
import { ListGenresUseCase } from './application/books/use-cases/list-genres.use-case';
import { ListBooksUseCase } from './application/books/use-cases/list-books.use-case';
import { ListUserReadingUseCase } from './application/books/use-cases/list-user-reading.use-case';
import { StartReadingUseCase } from './application/books/use-cases/start-reading.use-case';
import { UpdateReadingUseCase } from './application/books/use-cases/update-reading.use-case';
import { GetBookDetailUseCase } from './application/books/use-cases/get-book-detail.use-case';
import { ListVoicesForBookUseCase } from './application/books/use-cases/list-voices-for-book.use-case';
import { VocesRepositoryImpl } from './infrastructure/database/supabase/voces.repository.impl';
import { TonosRepositoryImpl } from './infrastructure/database/supabase/tonos.repository.impl';
import { GenerosRepositoryImpl } from './infrastructure/database/supabase/generos.repository.impl';
import { LibrosUsuariosRepositoryImpl } from './infrastructure/database/supabase/libros_usuarios.repository.impl';

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
    { provide: 'LibrosRepository', useClass: LibrosRepositoryImpl },
  { provide: 'GenerosRepository', useClass: GenerosRepositoryImpl },
  { provide: 'VocesRepository', useClass: VocesRepositoryImpl },
  { provide: 'TonosRepository', useClass: TonosRepositoryImpl },
    { provide: 'LibrosUsuariosRepository', useClass: LibrosUsuariosRepositoryImpl },
    { provide: LoginUseCase, useFactory: (repo) => new LoginUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: LogoutUseCase, useFactory: (repo) => new LogoutUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: GetMeUseCase, useFactory: (repo) => new GetMeUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: ReactivateUseCase, useFactory: (repo) => new ReactivateUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: UpdateProfileUseCase, useFactory: (repo) => new UpdateProfileUseCase(repo), inject: ['UsuariosRepository'] },
    { provide: UploadPhotoUseCase, useFactory: (repo, supa) => new UploadPhotoUseCase(repo, supa), inject: ['UsuariosRepository', SupabaseService] },
    { provide: ListPhotosUseCase, useFactory: (supa) => new ListPhotosUseCase(supa), inject: [SupabaseService] },
    { provide: SetPhotoUseCase, useFactory: (repo, supa) => new SetPhotoUseCase(repo, supa), inject: ['UsuariosRepository', SupabaseService] },
    { provide: AnalyzeBooksUseCase, useFactory: (librosRepo, supa) => new AnalyzeBooksUseCase(librosRepo, supa), inject: ['LibrosRepository', SupabaseService] },
    { provide: AnalyzeMissingBooksUseCase, useFactory: (librosRepo, supa) => new AnalyzeMissingBooksUseCase(librosRepo, supa), inject: ['LibrosRepository', SupabaseService] },
    { provide: ListGenresUseCase, useFactory: (repo) => new ListGenresUseCase(repo), inject: ['GenerosRepository'] },
    { provide: ListBooksUseCase, useFactory: (repo) => new ListBooksUseCase(repo), inject: ['LibrosRepository'] },
    { provide: ListUserReadingUseCase, useFactory: (repo) => new ListUserReadingUseCase(repo), inject: ['LibrosUsuariosRepository'] },
    { provide: StartReadingUseCase, useFactory: (repo) => new StartReadingUseCase(repo), inject: ['LibrosUsuariosRepository'] },
    { provide: UpdateReadingUseCase, useFactory: (repo) => new UpdateReadingUseCase(repo), inject: ['LibrosUsuariosRepository'] },
    { provide: GetBookDetailUseCase, useFactory: (librosRepo, relRepo) => new GetBookDetailUseCase(librosRepo, relRepo), inject: ['LibrosRepository', 'LibrosUsuariosRepository'] },
    { provide: ListVoicesForBookUseCase, useFactory: (librosRepo, vocesRepo) => new ListVoicesForBookUseCase(librosRepo, vocesRepo), inject: ['LibrosRepository', 'VocesRepository'] },
  ],
})
export class AppModule {}
