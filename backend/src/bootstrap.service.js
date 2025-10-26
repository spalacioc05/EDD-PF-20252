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

@Injectable()
@Dependencies(SupabaseService, HttpAdapterHost, LoginUseCase, LogoutUseCase, GetMeUseCase, ReactivateUseCase, UpdateProfileUseCase, UploadPhotoUseCase)
export class BootstrapService {
  constructor(supabaseService, httpAdapterHost, loginUseCase, logoutUseCase, getMeUseCase, reactivateUseCase, updateProfileUseCase, uploadPhotoUseCase) {
    this.supabaseService = supabaseService;
    this.httpAdapterHost = httpAdapterHost;
    this.loginUseCase = loginUseCase;
    this.logoutUseCase = logoutUseCase;
    this.getMeUseCase = getMeUseCase;
    this.reactivateUseCase = reactivateUseCase;
    this.updateProfileUseCase = updateProfileUseCase;
    this.uploadPhotoUseCase = uploadPhotoUseCase;
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
            const result = await this.reactivateUseCase.execute({ correo });
            res.status(200).json(result);
          } catch (err) {
            const status = err?.status || 500;
            res.status(status).json({ statusCode: status, message: err?.message || 'Error', error: String(err) });
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
          limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
          fileFilter: (req, file, cb) => {
            const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
            if (!ok) return cb(new Error('Tipo de archivo no permitido'));
            cb(null, true);
          },
        });
        app.post('/users/me/photo', upload.single('file'), async (req, res) => {
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

        this.logger.log('Auth routes registered on HTTP adapter');
      } else {
        this.logger.warn('HTTP adapter not available; auth routes not registered');
      }
    } catch (e) {
      this.logger.error('Error registering auth routes', e);
    }
  }
}
