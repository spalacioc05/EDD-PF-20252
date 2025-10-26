import jwt from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class LogoutUseCase {
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
    if (!userId) {
      const err = new Error('Token inválido');
      err.status = 401;
      throw err;
    }
    await this.usuariosRepository.updateUltimoLogin(userId, new Date());
    return { ok: true };
  }
}

export default LogoutUseCase;