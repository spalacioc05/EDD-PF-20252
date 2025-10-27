import { verify } from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class ListUserReadingUseCase {
  constructor(librosUsuariosRepository) {
    this.librosUsuariosRepository = librosUsuariosRepository;
  }
  async execute({ token, id_estado, limit = 20, offset = 0 } = {}) {
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
    const items = await this.librosUsuariosRepository.listByUsuario(userId, { idEstado: id_estado, limit, offset });
    return { items };
  }
}

export default ListUserReadingUseCase;
