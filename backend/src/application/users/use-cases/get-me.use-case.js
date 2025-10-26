import jwt from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class GetMeUseCase {
  constructor(usuariosRepository) {
    this.usuariosRepository = usuariosRepository;
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
    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (e) {
      const err = new Error('Token inválido');
      err.status = 401;
      throw err;
    }
    const userId = decoded?.sub;
    const user = await this.usuariosRepository.findById(userId);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }
    return { user };
  }
}

export default GetMeUseCase;