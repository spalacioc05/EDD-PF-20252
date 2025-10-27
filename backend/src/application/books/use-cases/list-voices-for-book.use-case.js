import { env } from '../../../infrastructure/config/env';

export class ListVoicesForBookUseCase {
  constructor(librosRepository, vocesRepository) {
    this.librosRepository = librosRepository;
    this.vocesRepository = vocesRepository;
  }

  async execute({ id, tones } = {}) {
    if (!id || !Number.isFinite(id)) {
      const err = new Error('Invalid book id');
      err.status = 400;
      throw err;
    }
    // Try to detect idioma: prefer libros.id_idioma when available
    let idIdioma = null;
    // First get basic book
    const book = await this.librosRepository.findById(id);
    if (!book) {
      const err = new Error('Libro no encontrado');
      err.status = 404;
      throw err;
    }
    if (typeof this.librosRepository.findIdiomaForBook === 'function') {
      try {
        idIdioma = await this.librosRepository.findIdiomaForBook(id);
      } catch (_) {}
    }
    if (!idIdioma) {
      // Fallback: configurable default idioma code (e.g., 'es')
      const code = process.env.DEFAULT_IDIOMA_CODE || env.defaultIdiomaCode || 'es';
      try {
        idIdioma = await this.vocesRepository.getIdiomaIdByCode(code);
      } catch {}
      if (!idIdioma) {
        const err = new Error('No se pudo determinar el idioma del libro');
        err.status = 400;
        throw err;
      }
    }
    const toneIds = (tones || []).filter((t) => Number.isFinite(t));
    const voces = await this.vocesRepository.listByIdioma(idIdioma, { toneIds });
    // Map to minimal structure for UI: only id and display name
    return { voces: (voces || []).map((v) => ({ id_voz: v.id_voz, display_name: v.display_name })) };
  }
}

export default ListVoicesForBookUseCase;