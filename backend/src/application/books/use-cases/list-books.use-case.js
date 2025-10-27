export class ListBooksUseCase {
  constructor(librosRepository) {
    this.librosRepository = librosRepository;
  }
  async execute({ genreId, limit = 50, offset = 0 } = {}) {
    let books;
    if (genreId) {
      books = await this.librosRepository.findByGenre(Number(genreId), { limit, offset });
    } else {
      books = await this.librosRepository.findAll({ limit, offset });
    }
    return { books };
  }
}
export default ListBooksUseCase;
