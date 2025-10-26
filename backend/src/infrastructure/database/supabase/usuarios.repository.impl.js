import { Injectable, Dependencies } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
@Dependencies(SupabaseService)
export class UsuariosRepositoryImpl {
	constructor(supabase) {
		this.supabase = supabase;
	}

	async findByCorreo(correo) {
		if (!this.supabase?.admin) throw new Error('Supabase admin client not configured');
		const { data, error } = await this.supabase.admin
			.from('tbl_usuarios')
			.select('id_usuario, id_supabase, nombre, correo, fecha_registro, foto_perfil, id_estado, ultimo_login')
			.eq('correo', correo)
			.maybeSingle();
		if (error) throw new Error(error.message);
		return data || null;
	}

	async updateUltimoLogin(idUsuario, fecha) {
		if (!this.supabase?.admin) throw new Error('Supabase admin client not configured');
		const { error } = await this.supabase.admin
			.from('tbl_usuarios')
			.update({ ultimo_login: fecha.toISOString().replace('Z', '') })
			.eq('id_usuario', idUsuario);
		if (error) throw new Error(error.message);
	}

		async findById(idUsuario) {
			if (!this.supabase?.admin) throw new Error('Supabase admin client not configured');
			const { data, error } = await this.supabase.admin
				.from('tbl_usuarios')
				.select('id_usuario, id_supabase, nombre, correo, fecha_registro, foto_perfil, id_estado, ultimo_login')
				.eq('id_usuario', idUsuario)
				.maybeSingle();
			if (error) throw new Error(error.message);
			return data || null;
		}

	async updateFields(idUsuario, fields) {
		if (!this.supabase?.admin) throw new Error('Supabase admin client not configured');
		const allowed = {};
		if (typeof fields.nombre === 'string') allowed.nombre = fields.nombre;
		if (fields.id_estado !== undefined) allowed.id_estado = Number(fields.id_estado);
		if (typeof fields.foto_perfil === 'string') allowed.foto_perfil = fields.foto_perfil;
		if (Object.keys(allowed).length === 0) return await this.findById(idUsuario);
		const { error } = await this.supabase.admin
			.from('tbl_usuarios')
			.update(allowed)
			.eq('id_usuario', idUsuario);
		if (error) throw new Error(error.message);
		return await this.findById(idUsuario);
	}
}

export default UsuariosRepositoryImpl;
