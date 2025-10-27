export class ListGenresUseCase {
  constructor(generosRepository) {
    this.generosRepository = generosRepository;
  }
  async execute() {
    const genres = await this.generosRepository.listAll();
    return { genres };
  }
}
export default ListGenresUseCase;
