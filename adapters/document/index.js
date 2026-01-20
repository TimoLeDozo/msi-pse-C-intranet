/**
 * Document Adapters
 * Export centralise des adapters d'extraction et de conversion de documents
 *
 * Adapters disponibles:
 * - pdfAdapter : Generation PDF (HTML -> PDF via Playwright, DOCX -> PDF via LibreOffice)
 * - pptxAdapter : Extraction texte depuis PowerPoint (.pptx)
 * - xlsxAdapter : Extraction texte depuis Excel (.xlsx)
 */

const pdfAdapter = require('./pdf.adapter');
const pptxAdapter = require('./pptx.adapter');
const xlsxAdapter = require('./xlsx.adapter');

module.exports = {
  pdfAdapter,
  pptxAdapter,
  xlsxAdapter
};
