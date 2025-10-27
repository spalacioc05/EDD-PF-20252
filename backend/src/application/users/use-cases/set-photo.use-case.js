import jwt from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class SetPhotoUseCase {
  constructor(usuariosRepository, supabaseService) {
    this.usuariosRepository = usuariosRepository;
    this.supabaseService = supabaseService;
  }

  /**
   * @param {{token: string, path?: string, name?: string}} input
   */
  async execute(input) {
    const { token, path, name } = input || {};
    if (!token) {
      const err = new Error('Token requerido');
      err.status = 401;
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
    const bucket = process.env.BUCKET_FOTOS || 'fotos_perfil';
    const baseFolder = `user-${payload.sub}`;
    let finalPath = path;
    if (!finalPath && name) finalPath = `${baseFolder}/${name}`;
    if (!finalPath) {
      const err = new Error('Debe proporcionar path o name de la foto');
      err.status = 400;
      throw err;
    }
    // Seguridad básica: restringir a su carpeta
    if (!finalPath.startsWith(`${baseFolder}/`)) {
      const err = new Error('Ruta de foto no permitida');
      err.status = 403;
      throw err;
    }
    if (!this.supabaseService?.admin) {
      const err = new Error('Supabase admin client not configured');
      err.status = 500;
      throw err;
    }
    // Opcional: verificar existencia listando la carpeta y buscando el nombre
    const fileName = finalPath.split('/').pop();
    const { data: list, error: listErr } = await this.supabaseService.admin.storage
      .from(bucket)
      .list(baseFolder, { search: fileName });
    if (listErr) {
      const err = new Error(`Error validando foto: ${listErr.message}`);
      err.status = 500;
      throw err;
    }
    const exists = (list || []).some((f) => f.name === fileName);
    if (!exists) {
      const err = new Error('La foto no existe');
      err.status = 404;
      throw err;
    }
    const { data: pub } = this.supabaseService.admin.storage.from(bucket).getPublicUrl(finalPath);
    const url = pub?.publicUrl || finalPath;
    const updated = await this.usuariosRepository.updateFields(payload.sub, { foto_perfil: url });
    return { url, path: finalPath, user: updated };
  }
}

export default SetPhotoUseCase;