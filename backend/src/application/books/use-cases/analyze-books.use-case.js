import { computePdfMetrics } from '../services/pdf-metrics.service';
import { env } from '../../../infrastructure/config/env';

export class AnalyzeBooksUseCase {
  constructor(librosRepository, supabaseService) {
    this.librosRepository = librosRepository;
    this.supabaseService = supabaseService;
  }

  /**
   * @param {{ id?: number }} input
   */
  async execute(input = {}) {
    if (!this.supabaseService?.admin) {
      const err = new Error('Supabase admin client not configured');
      err.status = 500;
      throw err;
    }
    const bucketDefault = env.bucketArchivos || 'archivos_libros';
    const items = [];
    if (input.id) {
      const row = await this.librosRepository.findById(Number(input.id));
      if (row) items.push(row);
    } else {
      const limit = Number(input.limit) || 10;
      items.push(...(await this.librosRepository.findAllWithArchivo(limit)));
    }
    const results = [];
    for (const it of items) {
      if (!it?.archivo) continue;
      let bucket = bucketDefault;
      let path = it.archivo;
      // If it's a public URL, extract bucket and path
      try {
        if (/^https?:\/\//i.test(path)) {
          const u = new URL(path);
          const idx = u.pathname.indexOf('/storage/v1/object/public/');
          if (idx !== -1) {
            const rest = u.pathname.substring(idx + '/storage/v1/object/public/'.length);
            const segs = rest.split('/');
            bucket = segs.shift();
            path = segs.join('/');
          } else if (u.pathname.startsWith('/storage/v1/object/public/')) {
            const rest = u.pathname.substring('/storage/v1/object/public/'.length);
            const segs = rest.split('/');
            bucket = segs.shift();
            path = segs.join('/');
          }
        }
        // Download from storage
        const { data, error } = await this.supabaseService.admin.storage.from(bucket).download(path);
        if (error) throw new Error(error.message);
        // Convert blob to buffer
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
  const { pages, words } = await computePdfMetrics(buffer);
        const updated = await this.librosRepository.updateFields(it.id_libro, { paginas: pages, palabras: words });
        results.push({ id_libro: it.id_libro, paginas: updated.paginas, palabras: updated.palabras });
      } catch (e) {
        results.push({ id_libro: it.id_libro, error: e?.message || String(e) });
      }
    }
    return { count: results.length, results };
  }
}

export default AnalyzeBooksUseCase;