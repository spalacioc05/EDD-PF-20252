import { computePdfMetrics } from '../services/pdf-metrics.service';
import { env } from '../../../infrastructure/config/env';

export class AnalyzeMissingBooksUseCase {
  constructor(librosRepository, supabaseService) {
    this.librosRepository = librosRepository;
    this.supabaseService = supabaseService;
  }

  async execute() {
    if (!this.supabaseService?.admin) {
      const err = new Error('Supabase admin client not configured');
      err.status = 500;
      throw err;
    }
    const bucketDefault = env.bucketArchivos || 'archivos_libros';
    const items = await this.librosRepository.findMissingMeta();
    const results = [];
    for (const it of items) {
      if (!it?.archivo) continue;
      let bucket = bucketDefault;
      let path = it.archivo;
      try {
        if (/^https?:\/\//i.test(path)) {
          const u = new URL(path);
          const idx = u.pathname.indexOf('/storage/v1/object/public/');
          if (idx !== -1) {
            const rest = u.pathname.substring(idx + '/storage/v1/object/public/'.length);
            const segs = rest.split('/');
            bucket = segs.shift();
            path = segs.join('/');
          }
        }
        const { data, error } = await this.supabaseService.admin.storage.from(bucket).download(path);
        if (error) throw new Error(error.message);
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

export default AnalyzeMissingBooksUseCase;