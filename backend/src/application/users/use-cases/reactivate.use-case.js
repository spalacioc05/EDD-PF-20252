import jwt from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class ReactivateUseCase {
  constructor(usuariosRepository) {
    this.usuariosRepository = usuariosRepository;
  }

  /**
   * @param {{correo: string}} input
   */
  async execute(input) {
    const { correo } = input || {};
    if (!correo || !/.+@.+\..+/.test(correo)) {
      const err = new Error('Correo inválido');
      err.status = 400;
      throw err;
    }
    const user = await this.usuariosRepository.findByCorreo(correo);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }
    if (Number(user.id_estado) !== 2) {
      const err = new Error('La cuenta no está inactiva');
      err.status = 400;
      throw err;
    }
    const updated = await this.usuariosRepository.updateFields(user.id_usuario, { id_estado: 1 });
    const payload = { sub: updated.id_usuario, correo: updated.correo };
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
    return { token, user: updated };
  }
}

export default ReactivateUseCase;