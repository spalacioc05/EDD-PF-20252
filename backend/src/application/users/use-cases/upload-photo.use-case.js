import jwt from 'jsonwebtoken';
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
    // basic validation
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      const err = new Error('Formato de imagen no permitido');
      err.status = 400;
      throw err;
    }
  const bucket = process.env.BUCKET_FOTOS || 'fotos_perfil';
  const ext = (file.originalname?.split('.')?.pop() || 'jpg').toLowerCase();
  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, '0');
  const d = String(ts.getDate()).padStart(2, '0');
  const hh = String(ts.getHours()).padStart(2, '0');
  const mm = String(ts.getMinutes()).padStart(2, '0');
  const ss = String(ts.getSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8);
  // Nombre de archivo estratégico en la raíz del bucket (sin carpetas)
  const path = `perfil_user-${payload.sub}_${y}${m}${d}_${hh}${mm}${ss}-${rand}.${ext}`;
    const { error: upErr } = await this.supabaseService.admin
      .storage
      .from(bucket)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (upErr) {
      const err = new Error(`Error subiendo archivo: ${upErr.message}`);
      err.status = 500;
      throw err;
    }
    const { data: pub } = this.supabaseService.admin.storage.from(bucket).getPublicUrl(path);
    const url = pub?.publicUrl || path;
    const updated = await this.usuariosRepository.updateFields(payload.sub, { foto_perfil: url });
    return { url, user: updated };
  }
}

export default UploadPhotoUseCase;