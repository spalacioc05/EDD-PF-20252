import { Injectable, Dependencies } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
@Dependencies(SupabaseService)
export class GenerosRepositoryImpl {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async listAll() {
    const { data, error } = await this.supabase.admin
      .from('tbl_generos')
      .select('id_genero, nombre')
      .order('nombre', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
}

export default GenerosRepositoryImpl;
// Supabase implementation placeholder: GenerosRepository
