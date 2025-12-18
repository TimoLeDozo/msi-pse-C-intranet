/**
 * PDF Adapter
 * Rôle : convertir un DOCX en PDF
 *
 * Adapter non bloquant :
 * - si la conversion échoue, on retourne null
 * - la génération DOCX reste valide
 */

const fs = require('fs');
const path = require('path');
const libre = require('libreoffice-convert');
const util = require('util');

const convertAsync = util.promisify(libre.convert);

const OUTPUT_DIR = path.join(__dirname, '../../storage/outputs');

class PdfAdapter {
  constructor() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  }

  /**
   * Conversion DOCX → PDF
   * @param {string} docxPath
   * @returns {Promise<string|null>} chemin PDF ou null si échec
   */
  async convert(docxPath) {
    if (!docxPath || !fs.existsSync(docxPath)) {
      return null;
    }

    try {
      const docxBuffer = fs.readFileSync(docxPath);
      const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);

      const pdfName =
        path.basename(docxPath, path.extname(docxPath)) + '.pdf';
      const pdfPath = path.join(OUTPUT_DIR, pdfName);

      fs.writeFileSync(pdfPath, pdfBuffer);
      return pdfPath;

    } catch (error) {
      // ⚠️ volontairement non bloquant
      console.warn(`PDF conversion skipped: ${error.message}`);
      return null;
    }
  }
}

module.exports = new PdfAdapter();
