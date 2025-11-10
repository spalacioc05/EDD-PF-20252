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
    // If we reach here and still have no text, attempt OCR if enabled
    return '';
  }
}

// OCR fallback: use tesseract.js if conventional extraction yields too few words
export async function extractPdfTextWithOcr(buffer, opts = {}) {
  const {
    minWordsForOcr = 500,
    ocrMaxPages = parseInt(process.env.OCR_MAX_PAGES || '40', 10),
    ocrLang = process.env.OCR_LANG || 'spa',
    forceOcr = false,
  } = opts;
  let baseText = await extractPdfText(buffer, opts);
  const wordCount = (baseText || '').trim().split(/\s+/).filter(Boolean).length;
  if (!forceOcr && wordCount >= minWordsForOcr) return baseText;
  // Attempt OCR on each page rendered to PNG via pdfjs-dist
  try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    const { getDocument } = pdfjsLib;
    const loadingTask = getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages || 0;
    const pagesToProcess = Math.min(totalPages, ocrMaxPages);
    const Tesseract = require('tesseract.js');
    const { createCanvas } = require('canvas');
    let ocrTextChunks = [];
    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');
      // Render page
      await page.render({ canvasContext: ctx, viewport }).promise;
      // Convert to buffer
      const imgBuffer = canvas.toBuffer('image/png');
      const result = await Tesseract.recognize(imgBuffer, ocrLang, {
        logger: () => {}, // silence
      });
      const pageText = (result.data?.text || '').replace(/\s+/g, ' ').trim();
      if (pageText) ocrTextChunks.push(pageText);
    }
    const ocrText = ocrTextChunks.join('\n\n');
    // Merge if original extraction produced some text
    if (baseText && baseText.length > 50) {
      // Avoid duplicating: if OCR text seems subset/superset we choose longer
      if (ocrText.length > baseText.length * 1.1) {
        return ocrText;
      }
      return baseText.length >= ocrText.length ? baseText : ocrText;
    }
    return ocrText || baseText;
  } catch (e) {
    return baseText; // fallback to whatever we had
  }
}
