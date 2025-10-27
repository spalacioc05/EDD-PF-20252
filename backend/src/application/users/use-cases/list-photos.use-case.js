import jwt from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class ListPhotosUseCase {
  constructor(supabaseService) {
    this.supabaseService = supabaseService;
  }

  /**
   * @param {{token: string}} input
   */
  async execute(input) {
    const { token } = input || {};
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
    if (!this.supabaseService?.admin) {
      const err = new Error('Supabase admin client not configured');
      err.status = 500;
      throw err;
    }
    const bucket = process.env.BUCKET_FOTOS || 'fotos_perfil';
    const folder = `user-${payload.sub}`;

    const { data, error } = await this.supabaseService.admin.storage
      .from(bucket)
      .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) {
      const err = new Error(`Error listando fotos: ${error.message}`);
      err.status = 500;
      throw err;
    }
    const files = (data || []).filter((f) => f?.name).map((f) => {
      const path = `${folder}/${f.name}`;
      const { data: pub } = this.supabaseService.admin.storage.from(bucket).getPublicUrl(path);
      return {
        name: f.name,
        path,
        url: pub?.publicUrl || path,
        created_at: f.created_at || f.updated_at,
        size: f.metadata?.size || f.size,
        contentType: f.metadata?.mimetype || f.metadata?.contentType,
      };
    });
    return { files };
  }
}

export default ListPhotosUseCase;