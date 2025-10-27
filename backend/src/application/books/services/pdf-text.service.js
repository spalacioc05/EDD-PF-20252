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

export async function extractPdfText(buffer, opts = {}) {
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
    // Use legacy build in Node to avoid missing APIs/warnings
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
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
    const t = text.trim();
    if (t) return t;
  } catch (e) {
    // Final fallback: empty string
    // continue to next fallback
  }
  // Fallback 3: pdf2json (pure JS) — handles some PDFs where pdfjs textContent is empty
  try {
    const PDFParser = require('pdf2json');
    const pdfParser = new PDFParser();
    const buf = buffer; // Node Buffer
    const result = await new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', resolve);
      pdfParser.on('pdfParser_dataError', (err) => reject(err?.parserError || err));
      // pdf2json expects a file path or a binary buffer
      pdfParser.parseBuffer(buf);
    });
    const pages = (result?.formImage?.Pages) || [];
    const chunks = [];
    for (const p of pages) {
      const texts = p.Texts || [];
      for (const t of texts) {
        // t.R is array of { T: encodedText }
        for (const r of (t.R || [])) {
          try {
            const decoded = decodeURIComponent(r.T || '');
            if (decoded) chunks.push(decoded);
          } catch (_) {
            if (r.T) chunks.push(r.T);
          }
        }
      }
      chunks.push('\n');
    }
    const finalText = chunks.join(' ').replace(/\s+\n/g, '\n').trim();
    return finalText;
  } catch (_) {
    // give up
    return '';
  }
}
