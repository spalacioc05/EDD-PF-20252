// Centralized access to environment variables
export const env = {
	nodeEnv: process.env.NODE_ENV || 'development',
	port: parseInt(process.env.PORT || '3000', 10),

	// Supabase
	supabaseUrl: process.env.SUPABASE_URL,
	supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
	supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

	// Postgres
	databaseUrl: process.env.DATABASE_URL,

	// Auth
	jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',

	// Storage buckets
	bucketPortadas: process.env.BUCKET_PORTADAS || 'portadas_libros',
	bucketArchivos: process.env.BUCKET_ARCHIVOS || 'archivos_libros',
	bucketAudios: process.env.BUCKET_AUDIOS || 'audios_libros',
	bucketFotos: process.env.BUCKET_FOTOS || 'fotos_perfil',

	// Books analysis
	wordsPerPageFallback: parseInt(process.env.WORDS_PER_PAGE_FALLBACK || '300', 10),
};

export function validateEnv() {
	const missing = [];
	if (!env.supabaseUrl) missing.push('SUPABASE_URL');
	if (!env.supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
	if (!env.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
	if (!env.databaseUrl) missing.push('DATABASE_URL');
	if (missing.length) {
		// Log a warning but do not crash the app; health endpoint will reflect actual status
		// eslint-disable-next-line no-console
		console.warn('[env] Missing variables:', missing.join(', '));
	}
}