import { Injectable, Dependencies } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
@Dependencies(SupabaseService)
export class VocesRepositoryImpl {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async listByIdioma(idIdioma, { toneIds } = {}) {
    if (!idIdioma) return [];
    if (toneIds && toneIds.length) {
      // Inner join with tones mapping
      const { data, error } = await this.supabase.admin
        .from('tbl_voces')
        .select('id_voz, display_name, short_name, id_idioma, descripcion, id_genero_voz, tbl_voces_x_tonos!inner(id_tono)')
        .eq('id_idioma', idIdioma)
        .in('tbl_voces_x_tonos.id_tono', toneIds);
      if (error) throw new Error(error.message);
      return (data || []).map(({ tbl_voces_x_tonos, ...rest }) => rest);
    }
    const { data, error } = await this.supabase.admin
      .from('tbl_voces')
      .select('id_voz, display_name, short_name, id_idioma, descripcion, id_genero_voz')
      .eq('id_idioma', idIdioma);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async getIdiomaIdByCode(codigo) {
    if (!codigo) return null;
    const { data, error } = await this.supabase.admin
      .from('tbl_idiomas')
      .select('id_idioma, codigo')
      .eq('codigo', codigo)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.id_idioma || null;
  }
}

export default VocesRepositoryImpl;// Supabase implementation placeholder: VocesRepository
