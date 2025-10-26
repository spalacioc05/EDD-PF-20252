import jwt from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class LoginUseCase {
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
      err.status = 401;
      throw err;
    }
    if (Number(user.id_estado) === 2) {
      const err = new Error('Cuenta inactiva');
      err.status = 403;
      err.code = 'inactive_user';
      throw err;
    }
    const payload = { sub: user.id_usuario, correo: user.correo };
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
    return { token, user };
  }
}

export default LoginUseCase;