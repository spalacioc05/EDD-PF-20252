import { env } from '../../../infrastructure/config/env';

export async function downloadPdfBuffer(supabaseService, archivo) {
  if (!supabaseService?.admin || !archivo) throw new Error('Missing storage client or archivo');
  const bucketDefault = env.bucketArchivos || 'archivos_libros';
  let bucket = bucketDefault;
  let path = archivo;
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
  const { data, error } = await supabaseService.admin.storage.from(bucket).download(path);
  if (error) throw new Error(error.message);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function extractPdfText(buffer) {
  // Try pdf-parse first
  try {
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
      pdfParse = pdfParse?.default || pdfParse;
    } catch (_) {
      pdfParse = null;
    }
    if (pdfParse) {
      const data = await pdfParse(buffer);
      const text = (data?.text || '').trim();
      if (text) return text;
    }
  } catch (_) {}
  // Fallback to pdfjs-dist
  try {
    const pdfjsLib = require('pdfjs-dist');
    const { getDocument } = pdfjsLib;
    const loadingTask = getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    let text = '';
    const numPages = pdf.numPages || 0;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items?.map((it) => it.str).filter(Boolean) || [];
      text += strings.join(' ') + '\n';
    }
    return text.trim();
  } catch (e) {
    // Final fallback: empty string
    return '';
  }
}
