import { verify } from 'jsonwebtoken';
import { env } from '../../../infrastructure/config/env';

export class GetBookDetailUseCase {
  constructor(librosRepository, librosUsuariosRepository) {
    this.librosRepository = librosRepository;
    this.librosUsuariosRepository = librosUsuariosRepository;
  }

  async execute({ id, token }) {
    if (!id || !Number.isFinite(id)) {
      const err = new Error('Invalid book id');
      err.status = 400;
      throw err;
    }
    const book = await this.librosRepository.findById(id);
    if (!book) return null;

    let userId = null;
    if (token) {
      try {
        const payload = verify(token, env.jwtSecret);
        userId = payload?.sub || payload?.id_usuario || payload?.id;
      } catch (_) {
        // ignore token errors for public book detail
      }
    }

    if (userId) {
      const reading = await this.librosUsuariosRepository.findByUserAndBook(userId, id);
      return { ...book, reading };
    }
    return book;
  }
}

export default GetBookDetailUseCase;
