import { Injectable, Dependencies } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
@Dependencies(SupabaseService)
export class LibrosRepositoryImpl {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async findById(id) {
    const { data, error } = await this.supabase.admin
      .from('tbl_libros')
      .select('id_libro, titulo, descripcion, portada, archivo, paginas, palabras')
      .eq('id_libro', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  }

  async findIdiomaForBook(id) {
    // Attempt to select id_idioma if this column exists in tbl_libros
    try {
      const { data, error } = await this.supabase.admin
        .from('tbl_libros')
        .select('id_idioma')
        .eq('id_libro', id)
        .maybeSingle();
      if (error) throw error;
      return data?.id_idioma || null;
    } catch (_) {
      return null;
    }
  }

  async findAllWithArchivo(limit = 1000) {
    const { data, error } = await this.supabase.admin
      .from('tbl_libros')
      .select('id_libro, titulo, archivo, paginas, palabras')
      .not('archivo', 'is', null)
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async findMissingMeta(limit = 1000) {
    const { data, error } = await this.supabase.admin
      .from('tbl_libros')
      .select('id_libro, titulo, archivo, paginas, palabras')
      .not('archivo', 'is', null)
      .or('paginas.is.null,palabras.is.null')
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async updateFields(id, fields) {
    const allowed = {};
    if (Number.isInteger(fields.paginas)) allowed.paginas = fields.paginas;
    if (Number.isInteger(fields.palabras)) allowed.palabras = fields.palabras;
    if (Object.keys(allowed).length === 0) return await this.findById(id);
    const { error } = await this.supabase.admin
      .from('tbl_libros')
      .update(allowed)
      .eq('id_libro', id);
    if (error) throw new Error(error.message);
    return await this.findById(id);
  }

  async findAll({ limit = 50, offset = 0 } = {}) {
    const { data, error } = await this.supabase.admin
      .from('tbl_libros')
      .select('id_libro, titulo, descripcion, fecha_publicacion, portada, archivo, paginas, palabras, id_pais, id_estado')
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async findByGenre(idGenero, { limit = 50, offset = 0 } = {}) {
    // Preferred: inner join via relationship
    try {
      const { data, error } = await this.supabase.admin
        .from('tbl_libros')
        .select('id_libro, titulo, descripcion, fecha_publicacion, portada, archivo, paginas, palabras, id_pais, id_estado, tbl_libros_x_generos!inner(id_genero)')
        .eq('tbl_libros_x_generos.id_genero', idGenero)
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return (data || []).map(({ tbl_libros_x_generos, ...rest }) => rest);
    } catch (e) {
      // Fallback: two-step lookup via mapping table
      const { data: map, error: mapErr } = await this.supabase.admin
        .from('tbl_libros_x_generos')
        .select('id_libro')
        .eq('id_genero', idGenero)
        .limit(1000);
      if (mapErr) throw new Error(mapErr.message);
      const allIds = (map || []).map((m) => m.id_libro);
      const ids = allIds.slice(offset, offset + limit);
      if (!ids.length) return [];
      const { data, error } = await this.supabase.admin
        .from('tbl_libros')
        .select('id_libro, titulo, descripcion, fecha_publicacion, portada, archivo, paginas, palabras, id_pais, id_estado')
        .in('id_libro', ids);
      if (error) throw new Error(error.message);
      return data || [];
    }
  }
}

export default LibrosRepositoryImpl;// Supabase implementation placeholder: LibrosRepository
