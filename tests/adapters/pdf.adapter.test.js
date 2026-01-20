/**
 * Tests for pdf.adapter.js
 * Tests PDF generation using Playwright (primary) and LibreOffice (fallback for DOCX)
 *
 * The new PDF adapter has two main methods:
 * 1. generatePdf({ html, outputPath }) - HTML to PDF via Playwright
 * 2. convert(docxPath, options) - DOCX to PDF via LibreOffice (legacy)
 */

const path = require('path');
const fs = require('fs');

// Mock the pdf-render service (used by generatePdf)
jest.mock('../../services/pdf-render.service.js', () => ({
  renderHtmlToPdf: jest.fn(),
  checkAvailability: jest.fn(),
  getConfig: jest.fn()
}));

const pdfRenderService = require('../../services/pdf-render.service.js');
const pdfAdapter = require('../../adapters/document/pdf.adapter.js');

describe('pdf.adapter', () => {
  const outputsDir = path.join(__dirname, '../../storage/outputs');

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    pdfRenderService.renderHtmlToPdf.mockResolvedValue('/path/to/output.pdf');
    pdfRenderService.checkAvailability.mockResolvedValue({
      available: true,
      engine: 'playwright'
    });
    pdfRenderService.getConfig.mockReturnValue({
      timeoutMs: 60000,
      format: 'A4',
      marginMm: 20
    });
  });

  describe('generatePdf', () => {
    it('throws error when HTML is not provided', async () => {
      await expect(pdfAdapter.generatePdf({ outputPath: '/path/to/output.pdf' }))
        .rejects.toThrow('HTML content is required');
    });

    it('throws error when outputPath is not provided', async () => {
      await expect(pdfAdapter.generatePdf({ html: '<html></html>' }))
        .rejects.toThrow('Output path is required');
    });

    it('calls pdf-render service with correct parameters', async () => {
      const html = '<html><body>Test</body></html>';
      const outputPath = path.join(outputsDir, 'test-output.pdf');

      await pdfAdapter.generatePdf({ html, outputPath });

      expect(pdfRenderService.renderHtmlToPdf).toHaveBeenCalledWith({
        html,
        outputPath
      });
    });

    it('returns the output path on success', async () => {
      const html = '<html><body>Test</body></html>';
      const outputPath = path.join(outputsDir, 'test-output.pdf');
      pdfRenderService.renderHtmlToPdf.mockResolvedValue(outputPath);

      const result = await pdfAdapter.generatePdf({ html, outputPath });

      expect(result).toBe(outputPath);
    });

    it('propagates errors from pdf-render service', async () => {
      pdfRenderService.renderHtmlToPdf.mockRejectedValue(new Error('Playwright failed'));

      await expect(pdfAdapter.generatePdf({
        html: '<html></html>',
        outputPath: '/path/to/output.pdf'
      })).rejects.toThrow('Playwright failed');
    });
  });

  describe('convert (DOCX to PDF - legacy)', () => {
    it('returns null when no path is provided', async () => {
      const result = await pdfAdapter.convert(null);

      expect(result).toBeNull();
    });

    it('returns null when the input file does not exist', async () => {
      const result = await pdfAdapter.convert(path.join(outputsDir, 'missing.docx'));

      expect(result).toBeNull();
    });

    // Note: The convert method requires libreoffice-convert package to be installed.
    // If not installed, it returns null gracefully.
    it('handles missing libreoffice-convert gracefully', async () => {
      // Create a test file
      const docxPath = path.join(outputsDir, `test_${Date.now()}.docx`);
      await fs.promises.mkdir(outputsDir, { recursive: true });
      await fs.promises.writeFile(docxPath, Buffer.from('test-content'));

      try {
        const result = await pdfAdapter.convert(docxPath);
        // Result will be null if LibreOffice is not available, or a path if it is
        expect(result === null || typeof result === 'string').toBe(true);
      } finally {
        // Cleanup
        await fs.promises.unlink(docxPath).catch(() => {});
      }
    });
  });

  describe('checkAvailability', () => {
    it('returns availability status with engines object', async () => {
      pdfRenderService.checkAvailability.mockResolvedValue({
        available: true,
        engine: 'playwright'
      });

      const result = await pdfAdapter.checkAvailability();

      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('engines');
      expect(result.engines).toHaveProperty('playwright');
    });

    it('reports playwright availability from pdf-render service', async () => {
      pdfRenderService.checkAvailability.mockResolvedValue({
        available: true,
        engine: 'playwright'
      });

      const result = await pdfAdapter.checkAvailability();

      expect(result.engines.playwright.available).toBe(true);
    });

    it('includes libreoffice availability status', async () => {
      const result = await pdfAdapter.checkAvailability();

      expect(result.engines).toHaveProperty('libreoffice');
      expect(result.engines.libreoffice).toHaveProperty('available');
    });

    it('handles playwright service errors gracefully', async () => {
      pdfRenderService.checkAvailability.mockRejectedValue(new Error('Browser not found'));

      const result = await pdfAdapter.checkAvailability();

      expect(result.engines.playwright.available).toBe(false);
      expect(result.engines.playwright.error).toBe('Browser not found');
    });
  });

  describe('getConfig', () => {
    it('returns current configuration with engine info', () => {
      const config = pdfAdapter.getConfig();

      expect(config).toHaveProperty('engine');
      expect(config).toHaveProperty('fallbackEngine');
      expect(config.engine).toBe('playwright');
      expect(config.fallbackEngine).toBe('libreoffice');
    });

    it('includes timeout and format settings', () => {
      const config = pdfAdapter.getConfig();

      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('format');
      expect(typeof config.timeout).toBe('number');
    });

    it('includes pdfRenderConfig from pdf-render service', () => {
      const config = pdfAdapter.getConfig();

      expect(config).toHaveProperty('pdfRenderConfig');
      expect(config.pdfRenderConfig).toEqual({
        timeoutMs: 60000,
        format: 'A4',
        marginMm: 20
      });
    });
  });

  describe('generateFromTemplate', () => {
    it('renders template and generates PDF', async () => {
      const template = '<html><body>{{name}}</body></html>';
      const data = { name: 'Test' };
      const outputPath = '/path/to/output.pdf';

      pdfRenderService.renderHtmlToPdf.mockResolvedValue(outputPath);

      const result = await pdfAdapter.generateFromTemplate({
        template,
        data,
        outputPath
      });

      // The adapter calls renderHtmlToPdf via generatePdf
      expect(pdfRenderService.renderHtmlToPdf).toHaveBeenCalled();
      expect(result).toBe(outputPath);
    });
  });
});
