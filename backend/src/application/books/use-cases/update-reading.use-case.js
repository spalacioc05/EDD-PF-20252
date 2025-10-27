import { verify } from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class UpdateReadingUseCase {
  constructor(librosUsuariosRepository) {
    this.librosUsuariosRepository = librosUsuariosRepository;
  }

  async execute({ token, id, pagina, palabra, progreso, tiempo_escucha, id_estado, audio }) {
    if (!token) {
      const err = new Error('Missing token');
      err.status = 401;
      throw err;
    }
    let payload;
    try {
      payload = verify(token, env.jwtSecret);
    } catch (e) {
      const err = new Error('Invalid token');
      err.status = 401;
      throw err;
    }
    const userId = payload?.sub || payload?.id_usuario || payload?.id;
    if (!userId) {
      const err = new Error('Invalid token payload');
      err.status = 401;
      throw err;
    }
    if (!id || !Number.isFinite(id)) {
      const err = new Error('Invalid book id');
      err.status = 400;
      throw err;
    }

    let updated = null;
    if (id_estado === 3 || id_estado === 4) {
      updated = await this.librosUsuariosRepository.setState(userId, id, id_estado);
    }
    // Update progress fields if provided
    const fields = { pagina, palabra, progreso, tiempo_escucha, audio };
    const hasProgressField = [pagina, palabra, progreso, tiempo_escucha, audio].some((v) => v !== undefined);
    if (hasProgressField) {
      updated = await this.librosUsuariosRepository.updateProgress(userId, id, fields);
    }

    // If no relation existed and only state requested 3, start it
    if (!updated && id_estado === 3) {
      updated = await this.librosUsuariosRepository.startReading(userId, id);
    }

    if (!updated) {
      const err = new Error('Reading relation not found');
      err.status = 404;
      throw err;
    }
    return { reading: updated };
  }
}

export default UpdateReadingUseCase;
