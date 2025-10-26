// Contract for Usuarios repository
export class UsuariosRepository {
  /**
   * @param {string} correo
   * @returns {Promise<object|null>} user or null
   */
  async findByCorreo(correo) { throw new Error('Not implemented'); }

  /**
   * @param {number|string} idUsuario
   * @param {Date} fecha
   * @returns {Promise<void>}
   */
  async updateUltimoLogin(idUsuario, fecha) { throw new Error('Not implemented'); }

  /**
   * @param {number|string} idUsuario
   * @returns {Promise<object|null>}
   */
  async findById(idUsuario) { throw new Error('Not implemented'); }
}

export default UsuariosRepository;// Repository contract placeholder: Usuarios
