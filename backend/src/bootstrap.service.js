import { Injectable, Dependencies, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { SupabaseService } from './infrastructure/supabase/supabase.service';
import { LoginUseCase } from './application/users/use-cases/login.use-case';
import { LogoutUseCase } from './application/users/use-cases/logout.use-case';
import { GetMeUseCase } from './application/users/use-cases/get-me.use-case';
import { ReactivateUseCase } from './application/users/use-cases/reactivate.use-case';
import { UpdateProfileUseCase } from './application/users/use-cases/update-profile.use-case';
import { UploadPhotoUseCase } from './application/users/use-cases/upload-photo.use-case';
import multer from 'multer';
import { ListPhotosUseCase } from './application/users/use-cases/list-photos.use-case';
import { SetPhotoUseCase } from './application/users/use-cases/set-photo.use-case';
import { AnalyzeBooksUseCase } from './application/books/use-cases/analyze-books.use-case';
import { AnalyzeMissingBooksUseCase } from './application/books/use-cases/analyze-missing-books.use-case';
import { ListGenresUseCase } from './application/books/use-cases/list-genres.use-case';
import { ListBooksUseCase } from './application/books/use-cases/list-books.use-case';
import { ListUserReadingUseCase } from './application/books/use-cases/list-user-reading.use-case';
import { StartReadingUseCase } from './application/books/use-cases/start-reading.use-case';
import { UpdateReadingUseCase } from './application/books/use-cases/update-reading.use-case';
import { GetBookDetailUseCase } from './application/books/use-cases/get-book-detail.use-case';
import { ListVoicesForBookUseCase } from './application/books/use-cases/list-voices-for-book.use-case';
import { GenerateBookAudioUseCase } from './application/books/use-cases/generate-book-audio.use-case';
import registerBooksRoutes from './presentation/controllers/books.routes';
import registerProgressRoutes from './presentation/controllers/progress.controller';

@Injectable()
@Dependencies(SupabaseService, HttpAdapterHost, LoginUseCase, LogoutUseCase, GetMeUseCase, ReactivateUseCase, UpdateProfileUseCase, UploadPhotoUseCase, ListPhotosUseCase, SetPhotoUseCase, AnalyzeBooksUseCase, AnalyzeMissingBooksUseCase, 'LibrosRepository', ListGenresUseCase, ListBooksUseCase, ListUserReadingUseCase, StartReadingUseCase, UpdateReadingUseCase, GetBookDetailUseCase, ListVoicesForBookUseCase, GenerateBookAudioUseCase)
export class BootstrapService {
  constructor(supabaseService, httpAdapterHost, loginUseCase, logoutUseCase, getMeUseCase, reactivateUseCase, updateProfileUseCase, uploadPhotoUseCase, listPhotosUseCase, setPhotoUseCase, analyzeBooksUseCase, analyzeMissingBooksUseCase, librosRepository, listGenresUseCase, listBooksUseCase, listUserReadingUseCase, startReadingUseCase, updateReadingUseCase, getBookDetailUseCase, listVoicesForBookUseCase, generateBookAudioUseCase) {
    this.supabaseService = supabaseService;
    this.httpAdapterHost = httpAdapterHost;
    this.loginUseCase = loginUseCase;
    this.logoutUseCase = logoutUseCase;
    this.getMeUseCase = getMeUseCase;
    this.reactivateUseCase = reactivateUseCase;
    this.updateProfileUseCase = updateProfileUseCase;
    this.uploadPhotoUseCase = uploadPhotoUseCase;
    this.listPhotosUseCase = listPhotosUseCase;
    this.setPhotoUseCase = setPhotoUseCase;
    this.analyzeBooksUseCase = analyzeBooksUseCase;
    this.analyzeMissingBooksUseCase = analyzeMissingBooksUseCase;
    this.librosRepository = librosRepository;
    this.listGenresUseCase = listGenresUseCase;
    this.listBooksUseCase = listBooksUseCase;
    this.listUserReadingUseCase = listUserReadingUseCase;
    this.startReadingUseCase = startReadingUseCase;
    this.updateReadingUseCase = updateReadingUseCase;
    this.getBookDetailUseCase = getBookDetailUseCase;
    this.listVoicesForBookUseCase = listVoicesForBookUseCase;
  this.generateBookAudioUseCase = generateBookAudioUseCase;
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

    // Register auth routes directly on the HTTP adapter to avoid Babel param decorator issues
    try {
      const httpAdapter = this.httpAdapterHost?.httpAdapter;
      const app = httpAdapter?.getInstance?.();
      if (app && typeof app.post === 'function') {
        app.post('/auth/login', async (req, res) => {
          try {
            const correo = req?.body?.correo || req?.query?.correo;
            const result = await this.loginUseCase.execute({ correo });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', code: err?.code, error: String(err) });
          }
        });

        app.post('/auth/logout', async (req, res) => {
          try {
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const result = await this.logoutUseCase.execute({ token });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        app.get('/auth/me', async (req, res) => {
          try {
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const result = await this.getMeUseCase.execute({ token });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        app.post('/auth/reactivate', async (req, res) => {
          try {
            const correo = req?.body?.correo || req?.query?.correo;
            try {
              const result = await this.reactivateUseCase.execute({ correo });
              return res.status(200).json(result);
            } catch (err) {
              // If already active, behave idempotently and just login
              if (err?.status === 400) {
                try {
                  const login = await this.loginUseCase.execute({ correo });
                  return res.status(200).json(login);
                } catch (e2) {
                  const s2 = e2?.status || 500;
                  return res.status(s2).json({ statusCode: s2, message: e2?.message || 'Error', error: String(e2) });
                }
              }
              const status = err?.status || 500;
              return res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
            }
          } catch (outer) {
            const status = outer?.status || 500;
            res.status(status).json({ statusCode: status, message: outer?.message || 'Error', error: String(outer) });
          }
        });

        // Users endpoints
        app.get('/users/me', async (req, res) => {
          try {
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const result = await this.getMeUseCase.execute({ token });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        app.patch('/users/me', async (req, res) => {
          try {
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const { nombre, id_estado } = req?.body || {};
            const result = await this.updateProfileUseCase.execute({ token, nombre, id_estado });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        const upload = multer({
          storage: multer.memoryStorage(),
          limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
          fileFilter: (req, file, cb) => {
            // Aceptar y validar en el use-case (permitimos extensiones/mimetypes atípicos como .jpq)
            cb(null, true);
          },
        });
        // Wrap multer to ensure JSON error responses
        const uploadRoute = (req, res, next) => upload.single('file')(req, res, (err) => {
          if (err) {
            const msg = err?.message || 'Error subiendo archivo';
            return res.status(400).json({ statusCode: 400, message: msg });
          }
          next();
        });
        app.post('/users/me/photo', uploadRoute, async (req, res) => {
          try {
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const file = req?.file;
            const result = await this.uploadPhotoUseCase.execute({ token, file });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Listar fotos del usuario (historial)
        app.get('/users/me/photos', async (req, res) => {
          try {
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const result = await this.listPhotosUseCase.execute({ token });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Establecer una foto existente como actual
        app.patch('/users/me/photo', async (req, res) => {
          try {
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const { path, name } = req?.body || {};
            const result = await this.setPhotoUseCase.execute({ token, path, name });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Analizar PDFs de libros: páginas y palabras
        app.post('/books/analyze', async (req, res) => {
          try {
            const { limit } = req?.query || {};
            const result = await this.analyzeBooksUseCase.execute({ limit: Number(limit) || 10 });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });
        app.post('/books/:id/analyze', async (req, res) => {
          try {
            const id = Number(req.params.id);
            const result = await this.analyzeBooksUseCase.execute({ id });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Analizar solo libros con metadata faltante
        app.post('/books/analyze/missing', async (req, res) => {
          try {
            const result = await this.analyzeMissingBooksUseCase.execute();
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Obtener un libro para verificar sus campos actuales
        app.get('/books/:id', async (req, res) => {
          try {
            const id = Number(req.params.id);
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const book = await this.getBookDetailUseCase.execute({ id, token });
            if (!book) return res.status(404).json({ statusCode: 404, message: 'Libro no encontrado' });
            res.status(200).json(book);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Listar géneros
        app.get('/genres', async (req, res) => {
          try {
            const result = await this.listGenresUseCase.execute();
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Listar libros, opcionalmente por género
        app.get('/books', async (req, res) => {
          try {
            const { genreId, limit, offset } = req.query || {};
            const result = await this.listBooksUseCase.execute({ genreId, limit: Number(limit) || 50, offset: Number(offset) || 0 });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Listar tonos
        app.get('/tones', async (req, res) => {
          try {
            const tonosRepo = this.httpAdapterHost?.httpAdapter?.getInstance ? null : null; // placeholder no-op
            // Resolve via Nest container providers
            try {
              const appRef = this.httpAdapterHost?.httpAdapter?.getInstance?.();
            } catch {}
            // Quick direct access using SupabaseService isn't appropriate; instead, expose from AppModule via providers.
            // To keep consistency with other routes, we'll fetch through a small lazy import.
            const { TonosRepositoryImpl } = await import('./infrastructure/database/supabase/tonos.repository.impl');
            const tonosRepository = new TonosRepositoryImpl(this.supabaseService);
            const tones = await tonosRepository.listAll();
            res.status(200).json({ tones });
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Libros en progreso del usuario actual (por estado opcional)
        app.get('/users/me/reading', async (req, res) => {
          try {
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const { id_estado, limit, offset } = req.query || {};
            const result = await this.listUserReadingUseCase.execute({ token, id_estado: id_estado ? Number(id_estado) : 3, limit: Number(limit) || 20, offset: Number(offset) || 0 });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Iniciar lectura de un libro (estado=3)
        app.post('/books/:id/start', async (req, res) => {
          try {
            const id = Number(req.params.id);
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const result = await this.startReadingUseCase.execute({ token, id });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Actualizar progreso/estado de lectura
        app.patch('/books/:id/reading', async (req, res) => {
          try {
            const id = Number(req.params.id);
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const { pagina, palabra, progreso, tiempo_escucha, id_estado, audio, id_voz, id_playbackrate } = req?.body || {};
            const result = await this.updateReadingUseCase.execute({ token, id, pagina, palabra, progreso, tiempo_escucha, id_estado, audio, id_voz, id_playbackrate });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Voces por idioma del libro, con filtro opcional de tonos (?tones=1,2)
        app.get('/books/:id/voices', async (req, res) => {
          try {
            const id = Number(req.params.id);
            const tonesParam = (req?.query?.tones || '').toString();
            const toneIds = tonesParam
              ? tonesParam.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
              : [];
            const result = await this.listVoicesForBookUseCase.execute({ id, tones: toneIds });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

  // Generar o recuperar audio TTS para un libro y voz
        app.post('/books/:id/tts', async (req, res) => {
          try {
            const id = Number(req.params.id);
            const { id_voz, id_playbackrate } = req?.body || {};
            const auth = req?.headers?.authorization;
            const token = (auth || '').replace(/^Bearer\s+/i, '');
            const vid = Number(id_voz);
            if (!Number.isFinite(vid) || vid < 1 || vid > 16) {
              return res.status(400).json({ statusCode: 400, message: 'Voz no permitida' });
            }
            const result = await this.generateBookAudioUseCase.execute({ token, id, id_voz: vid, id_playbackrate: Number(id_playbackrate) || undefined });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Obtener texto del libro (extraído del PDF)
        app.get('/books/:id/text', async (req, res) => {
          try {
            const id = Number(req.params.id);
            const result = await this.getBookTextUseCase.execute({ id });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
          }
        });

        // Register additional books + progress routes (plain JS, router-style)
        try {
          registerBooksRoutes(app, this);
          registerProgressRoutes(app, this);
          this.logger.log('Books & progress routes registered');
        } catch (e) {
          this.logger.error('Error registering books/progress routes', e);
        }

        this.logger.log('Auth routes registered on HTTP adapter');
      } else {
        this.logger.warn('HTTP adapter not available; auth routes not registered');
      }
    } catch (e) {
      this.logger.error('Error registering auth routes', e);
    }
  }
}
