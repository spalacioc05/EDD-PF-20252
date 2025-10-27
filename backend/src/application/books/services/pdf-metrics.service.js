import { env } from '../../../infrastructure/config/env';
// Dynamic import to be robust across CJS/ESM environments

/**
 * Compute PDF metrics for pages and words from a Buffer.
 * @param {Buffer} buffer
 * @returns {Promise<{pages:number, words:number}>}
 */
export async function computePdfMetrics(buffer) {
  let pdfModule;
  try {
    // Prefer CJS require when available
    // eslint-disable-next-line global-require
    pdfModule = require('pdf-parse');
  } catch (e) {
    const mod = await import('pdf-parse');
    pdfModule = mod;
  }
  try {
    let parsed;
    if (pdfModule && typeof pdfModule === 'function') {
      parsed = await pdfModule(buffer);
    } else if (pdfModule && typeof pdfModule.default === 'function') {
      parsed = await pdfModule.default(buffer);
    } else if (pdfModule && typeof pdfModule.PDFParse === 'function') {
      // Some builds expose a callable PDFParse function
      parsed = await pdfModule.PDFParse(buffer);
    } else {
      throw new Error('pdf-parse module did not export a function');
    }
    const pages = parsed.numpages || parsed.numPages || 0;
    const text = parsed.text || '';
    let words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    if (pages > 0 && words === 0) {
      // Fallback to pdfjs-dist text extraction if pdf-parse didn't provide text
      try {
        // eslint-disable-next-line global-require
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        try {
          // eslint-disable-next-line global-require
          pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
        } catch (_) { /* ignore */ }
        const loadingTask = pdfjsLib.getDocument({ data: buffer, disableFontFace: true, useSystemFonts: true });
        const doc = await loadingTask.promise;
        const numPages = doc.numPages || pages;
        let totalWords = 0;
        for (let i = 1; i <= numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent({ disableCombineTextItems: false });
          const pageText = (content.items || []).map((it) => (typeof it.str === 'string' ? it.str : '')).join(' ');
          totalWords += pageText ? pageText.trim().split(/\s+/).filter(Boolean).length : 0;
        }
        words = totalWords;
      } catch (e) {
        // keep words as is if pdfjs-dist fails
      }
    }
    if (pages > 0 && words === 0) {
      const avg = parseInt(process.env.WORDS_PER_PAGE_FALLBACK || env.wordsPerPageFallback || '300', 10) || 300;
      words = pages * avg;
    }
    return { pages, words };
  } catch (err) {
    // Heuristic fallback: count pages by /Type /Page and words from simple text tokens
    const str = buffer.toString('latin1');
    const pageMatches = str.match(/\/Type\s*\/Page\b/g) || [];
    const pages = pageMatches.length || 0;
    // Basic text extraction heuristic: capture strings in parentheses, unescape, and split
    const textTokens = [];
    const re = /\(([^\)]*)\)\s*T[Jj]/g; // (text) Tj / TJ
    let m;
    while ((m = re.exec(str)) !== null) {
      textTokens.push(m[1].replace(/\\\)/g, ')').replace(/\\\(/g, '(').replace(/\\n/g, ' '));
    }
    const text = textTokens.join(' ');
    let words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    if (pages > 0 && words === 0) {
      const avg = parseInt(process.env.WORDS_PER_PAGE_FALLBACK || env.wordsPerPageFallback || '300', 10) || 300;
      words = pages * avg;
    }
    return { pages, words };
  }
}

export default computePdfMetrics;