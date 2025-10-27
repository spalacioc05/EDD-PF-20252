import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { env } from '../../../infrastructure/config/env';

export class UploadPhotoUseCase {
  constructor(usuariosRepository, supabaseService) {
    this.usuariosRepository = usuariosRepository;
    this.supabaseService = supabaseService;
  }

  /**
   * @param {{token: string, file: { buffer: Buffer, mimetype: string, originalname: string }}} input
   */
  async execute(input) {
    const { token, file } = input || {};
    if (!token) {
      const err = new Error('Token requerido');
      err.status = 401;
      throw err;
    }
    if (!file?.buffer) {
      const err = new Error('Archivo requerido');
      err.status = 400;
      throw err;
    }
    if (!this.supabaseService?.admin) {
      const err = new Error('Supabase admin client not configured');
      err.status = 500;
      throw err;
    }
    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (e) {
      const err = new Error('Token inválido');
      err.status = 401;
      throw err;
    }
    // Validación y normalización del archivo
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/pjpeg',
      'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif',
    ];
    let mimetype = (file.mimetype || '').toLowerCase();
    let bufferToUpload = file.buffer;
    let ext = (file.originalname?.split('.')?.pop() || '').toLowerCase();
    const bucket = process.env.BUCKET_FOTOS || 'fotos_perfil';

    if (!allowed.includes(mimetype)) {
      // Intentar detectar/normalizar usando sharp
      try {
        const meta = await sharp(file.buffer).metadata();
        const fmt = (meta?.format || '').toLowerCase();
        if (!fmt) {
          const err = new Error('El archivo no parece ser una imagen válida');
          err.status = 400;
          throw err;
        }
        if (fmt === 'jpeg' || fmt === 'jpg') {
          mimetype = 'image/jpeg';
          ext = 'jpg';
        } else if (fmt === 'png') {
          mimetype = 'image/png';
          ext = 'png';
        } else if (fmt === 'webp') {
          mimetype = 'image/webp';
          ext = 'webp';
        } else if (fmt === 'heif' || fmt === 'heic' || fmt === 'avif') {
          // Transcodificar a WEBP para compatibilidad en navegadores
          bufferToUpload = await sharp(file.buffer).toFormat('webp').toBuffer();
          mimetype = 'image/webp';
          ext = 'webp';
        } else {
          const err = new Error('Formato de imagen no permitido');
          err.status = 400;
          throw err;
        }
      } catch (e) {
        const err = new Error('No se pudo procesar la imagen');
        err.status = 400;
        throw err;
      }
    } else if (!ext || ext.length > 4) {
      // Si la extensión original es rara (ej. .jpq) mapear por mimetype
      if (mimetype.includes('jpeg') || mimetype.endsWith('/jpg') || mimetype.endsWith('/pjpeg')) ext = 'jpg';
      else if (mimetype.endsWith('/png')) ext = 'png';
      else if (mimetype.endsWith('/webp')) ext = 'webp';
      else if (mimetype.endsWith('/avif') || mimetype.endsWith('/heic') || mimetype.endsWith('/heif')) ext = 'webp';
      else ext = 'jpg';
    }
  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, '0');
  const d = String(ts.getDate()).padStart(2, '0');
  const hh = String(ts.getHours()).padStart(2, '0');
  const mm = String(ts.getMinutes()).padStart(2, '0');
  const ss = String(ts.getSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8);
  // Guardar dentro de la carpeta del usuario para mantener historial: user-<id>/...
  const folder = `user-${payload.sub}`;
  const filename = `perfil_user-${payload.sub}_${y}${m}${d}_${hh}${mm}${ss}-${rand}.${ext}`;
  const path = `${folder}/${filename}`;
    const { error: upErr } = await this.supabaseService.admin
      .storage
      .from(bucket)
      .upload(path, bufferToUpload, { contentType: mimetype || 'image/jpeg', upsert: true });
    if (upErr) {
      const err = new Error(`Error subiendo archivo: ${upErr.message}`);
      err.status = 500;
      throw err;
    }
    const { data: pub } = this.supabaseService.admin.storage.from(bucket).getPublicUrl(path);
    const url = pub?.publicUrl || path;
    const updated = await this.usuariosRepository.updateFields(payload.sub, { foto_perfil: url });
    return { url, path, user: updated };
  }
}

export default UploadPhotoUseCase;