import { Injectable, Dependencies } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
@Dependencies(SupabaseService)
export class LibrosUsuariosRepositoryImpl {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async listByUsuario(idUsuario, { idEstado, limit = 20, offset = 0 } = {}) {
    let query = this.supabase.admin
      .from('tbl_libros_x_usuarios')
      .select('id_libro_usuario, id_usuario, id_libro, pagina, palabra, progreso, tiempo_escucha, fecha_ultima_lectura, id_estado, audio, tbl_libros(id_libro, titulo, descripcion, portada, archivo, paginas, palabras)');
    query = query.eq('id_usuario', idUsuario);
    if (idEstado) query = query.eq('id_estado', idEstado);
    query = query.order('fecha_ultima_lectura', { ascending: false }).range(offset, offset + limit - 1);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async findByUserAndBook(idUsuario, idLibro) {
    const { data, error } = await this.supabase.admin
      .from('tbl_libros_x_usuarios')
      .select('id_libro_usuario, id_usuario, id_libro, pagina, palabra, progreso, tiempo_escucha, fecha_ultima_lectura, id_estado, audio, tbl_libros(id_libro, titulo, descripcion, portada, archivo, paginas, palabras)')
      .eq('id_usuario', idUsuario)
      .eq('id_libro', idLibro)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  }

  async startReading(idUsuario, idLibro) {
    const now = new Date().toISOString();
    // Try to upsert by unique pair (if no constraint, simulate: fetch then insert/update)
    const existing = await this.findByUserAndBook(idUsuario, idLibro);
    if (existing) {
      const { error } = await this.supabase.admin
        .from('tbl_libros_x_usuarios')
        .update({ id_estado: 3, fecha_ultima_lectura: now })
        .eq('id_libro_usuario', existing.id_libro_usuario);
      if (error) throw new Error(error.message);
      return await this.findByUserAndBook(idUsuario, idLibro);
    }
    const { data, error } = await this.supabase.admin
      .from('tbl_libros_x_usuarios')
      .insert({ id_usuario: idUsuario, id_libro: idLibro, id_estado: 3, progreso: 0, pagina: 0, palabra: 0, tiempo_escucha: 0, fecha_ultima_lectura: now })
      .select('id_libro_usuario')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return await this.findByUserAndBook(idUsuario, idLibro);
  }

  async setState(idUsuario, idLibro, idEstado) {
    const existing = await this.findByUserAndBook(idUsuario, idLibro);
    if (!existing) return null;
    const now = new Date().toISOString();
    const { error } = await this.supabase.admin
      .from('tbl_libros_x_usuarios')
      .update({ id_estado: idEstado, fecha_ultima_lectura: now })
      .eq('id_libro_usuario', existing.id_libro_usuario);
    if (error) throw new Error(error.message);
    return await this.findByUserAndBook(idUsuario, idLibro);
  }

  async updateProgress(idUsuario, idLibro, fields) {
    const allowed = {};
    if (Number.isFinite(fields.pagina)) allowed.pagina = fields.pagina;
    if (Number.isFinite(fields.palabra)) allowed.palabra = fields.palabra;
    if (typeof fields.progreso === 'number') allowed.progreso = fields.progreso;
    if (Number.isFinite(fields.tiempo_escucha)) allowed.tiempo_escucha = fields.tiempo_escucha;
    if (fields.audio !== undefined) allowed.audio = fields.audio;
    allowed.fecha_ultima_lectura = new Date().toISOString();
    const existing = await this.findByUserAndBook(idUsuario, idLibro);
    if (!existing) return null;
    const { error } = await this.supabase.admin
      .from('tbl_libros_x_usuarios')
      .update(allowed)
      .eq('id_libro_usuario', existing.id_libro_usuario);
    if (error) throw new Error(error.message);
    return await this.findByUserAndBook(idUsuario, idLibro);
  }
}

export default LibrosUsuariosRepositoryImpl;
