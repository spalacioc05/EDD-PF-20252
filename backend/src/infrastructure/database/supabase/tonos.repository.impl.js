import { Injectable, Dependencies } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
@Dependencies(SupabaseService)
export class TonosRepositoryImpl {
  constructor(supabase) { this.supabase = supabase; }

  async listAll() {
    const { data, error } = await this.supabase.admin
      .from('tbl_tonos')
      .select('id_tono, nombre')
      .order('nombre', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
}

export default TonosRepositoryImpl;// Supabase implementation placeholder: TonosRepository
