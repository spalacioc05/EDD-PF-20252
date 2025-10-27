import { downloadPdfBuffer, extractPdfText } from '../services/pdf-text.service';

export class GetBookTextUseCase {
  constructor(librosRepository, supabaseService) {
    this.librosRepository = librosRepository;
    this.supabaseService = supabaseService;
  }

  async execute({ id } = {}) {
    if (!id || !Number.isFinite(id)) {
      const err = new Error('Invalid book id');
      err.status = 400;
      throw err;
    }
    const book = await this.librosRepository.findById(id);
    if (!book) {
      const err = new Error('Libro no encontrado');
      err.status = 404;
      throw err;
    }
    try {
      const buffer = await downloadPdfBuffer(this.supabaseService, book.archivo);
      const text = await extractPdfText(buffer);
      return { text: text || '' };
    } catch (e) {
      // As a fallback, return description or title if available
      const text = book.descripcion || book.titulo || '';
      return { text };
    }
  }
}

export default GetBookTextUseCase;
