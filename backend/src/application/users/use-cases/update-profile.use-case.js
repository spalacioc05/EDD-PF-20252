import jwt from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class UpdateProfileUseCase {
  constructor(usuariosRepository) {
    this.usuariosRepository = usuariosRepository;
  }

  /**
   * @param {{token: string, nombre?: string, id_estado?: number}} input
   */
  async execute(input) {
    const { token, nombre, id_estado } = input || {};
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
    const updates = {};
    if (typeof nombre === 'string') updates.nombre = nombre;
    if (id_estado !== undefined) {
      const v = Number(id_estado);
      if (![1, 2].includes(v)) {
        const err = new Error('id_estado inválido');
        err.status = 400;
        throw err;
      }
      updates.id_estado = v;
    }
    const updated = await this.usuariosRepository.updateFields(payload.sub, updates);
    return { user: updated };
  }
}

export default UpdateProfileUseCase;