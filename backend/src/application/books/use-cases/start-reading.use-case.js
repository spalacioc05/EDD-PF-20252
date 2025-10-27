import { verify } from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class StartReadingUseCase {
  constructor(librosUsuariosRepository) {
    this.librosUsuariosRepository = librosUsuariosRepository;
  }

  async execute({ token, id }) {
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
    const reading = await this.librosUsuariosRepository.startReading(userId, id);
    return { reading };
  }
}

export default StartReadingUseCase;
