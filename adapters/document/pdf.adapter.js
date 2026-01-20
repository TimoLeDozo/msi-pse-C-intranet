/**
 * PDF Adapter
 * Role: Generate PDF documents using Playwright (HTML -> PDF)
 *
 * Two approaches supported:
 * 1. generatePdf({ html, outputPath }) - Direct HTML to PDF via Playwright
 * 2. convert(docxPath, options) - DOCX to PDF via LibreOffice (legacy compatibility)
 *
 * Pattern async conforme aux autres adapters du projet.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const pdfRenderService = require('../../services/pdf-render.service.js');

// Lazy-load libreoffice-convert for backward compatibility
let libreofficeConvert = null;

/**
 * Verifie si un chemin existe
 * @param {string} targetPath - Chemin a verifier
 * @returns {Promise<boolean>}
 */
async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Load libreoffice-convert lazily to avoid startup errors if not installed
 * @returns {Function|null} The convert function or null if unavailable
 */
function getLibreOfficeConvert() {
  if (libreofficeConvert === null) {
    try {
      const libre = require('libreoffice-convert');
      libreofficeConvert = libre.convertAsync || require('util').promisify(libre.convert);
    } catch (error) {
      console.warn('[PDF] LibreOffice converter not available:', error.message);
      libreofficeConvert = false;
    }
  }
  return libreofficeConvert || null;
}

class PdfAdapter {
  constructor() {
    this.config = {
      engine: 'playwright',
      fallbackEngine: 'libreoffice',
      timeout: parseInt(process.env.PDF_RENDER_TIMEOUT, 10) || 60000,
      format: process.env.PDF_RENDER_FORMAT || 'A4'
    };
  }

  /**
   * Generate PDF from HTML content using Playwright
   * @param {Object} params - Generation parameters
   * @param {string} params.html - HTML content to render
   * @param {string} params.outputPath - Path where PDF will be saved
   * @returns {Promise<string>} Path to the generated PDF
   * @throws {Error} If HTML is missing or rendering fails
   */
  async generatePdf({ html, outputPath }) {
    if (!html) {
      throw new Error('HTML content is required for PDF generation');
    }
    if (!outputPath) {
      throw new Error('Output path is required for PDF generation');
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fsp.mkdir(outputDir, { recursive: true });

    // Use the pdf-render service
    const result = await pdfRenderService.renderHtmlToPdf({ html, outputPath });
    return result;
  }

  /**
   * Convert DOCX file to PDF (backward compatibility)
   * Uses LibreOffice as fallback since DOCX cannot be directly rendered by Playwright
   * @param {string} docxPath - Path to the DOCX file
   * @param {Object} [options={}] - Conversion options
   * @param {number} [options.timeout] - Conversion timeout in ms
   * @param {number} [options.retries] - Number of retry attempts
   * @returns {Promise<string|null>} Path to the generated PDF or null if failed
   */
  async convert(docxPath, options = {}) {
    // Validate input path
    if (!docxPath) {
      console.warn('[PDF] No input path provided');
      return null;
    }

    if (!await pathExists(docxPath)) {
      console.warn(`[PDF] Input file not found: ${docxPath}`);
      return null;
    }

    // Get LibreOffice converter
    const convertFn = getLibreOfficeConvert();
    if (!convertFn) {
      console.warn('[PDF] LibreOffice converter not available for DOCX conversion');
      return null;
    }

    try {
      // Read DOCX file
      const docxBuffer = await fsp.readFile(docxPath);

      // Determine output path
      const outputDir = path.dirname(docxPath);
      const baseName = path.basename(docxPath, path.extname(docxPath));
      const pdfPath = path.join(outputDir, `${baseName}.pdf`);

      // Convert using LibreOffice
      const pdfBuffer = await convertFn(docxBuffer, '.pdf', undefined);

      // Write PDF file
      await fsp.writeFile(pdfPath, pdfBuffer);

      console.log(`[PDF] Successfully converted: ${pdfPath}`);
      return pdfPath;

    } catch (error) {
      console.warn(`[PDF] Conversion failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if PDF generation is available
   * Checks both Playwright (primary) and LibreOffice (fallback)
   * @returns {Promise<Object>} Availability status
   */
  async checkAvailability() {
    const result = {
      available: false,
      engines: {}
    };

    // Check Playwright availability
    try {
      const playwrightStatus = await pdfRenderService.checkAvailability();
      result.engines.playwright = playwrightStatus;
      if (playwrightStatus.available) {
        result.available = true;
        result.primaryEngine = 'playwright';
      }
    } catch (error) {
      result.engines.playwright = {
        available: false,
        error: error.message
      };
    }

    // Check LibreOffice availability
    const convertFn = getLibreOfficeConvert();
    result.engines.libreoffice = {
      available: !!convertFn,
      note: convertFn ? 'Available for DOCX conversion' : 'Not installed'
    };

    if (!result.available && convertFn) {
      result.available = true;
      result.primaryEngine = 'libreoffice';
    }

    return result;
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      ...this.config,
      pdfRenderConfig: pdfRenderService.getConfig()
    };
  }

  /**
   * Generate PDF from HTML template with data
   * @param {Object} params - Generation parameters
   * @param {string} params.template - HTML template with {{placeholders}}
   * @param {Object} params.data - Data to inject into template
   * @param {string} params.outputPath - Path where PDF will be saved
   * @returns {Promise<string>} Path to the generated PDF
   */
  async generateFromTemplate({ template, data, outputPath }) {
    const templateUtil = require('../../utils/template.util.js');
    const html = templateUtil.renderTemplate(template, data);
    return this.generatePdf({ html, outputPath });
  }
}

// Export singleton instance
module.exports = new PdfAdapter();
