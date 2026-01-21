const { getConfig } = require('../../services/pdf-render.service');

describe('pdf-render.service', () => {
  describe('getConfig', () => {
    it('should return default configuration', () => {
      const config = getConfig();

      expect(config).toHaveProperty('timeoutMs');
      expect(config).toHaveProperty('format');
      expect(config).toHaveProperty('marginMm');
      expect(config).toHaveProperty('displayHeaderFooter');
    });

    it('should have A4 format by default', () => {
      const config = getConfig();
      expect(config.format).toBe('A4');
    });

    it('should have 20mm margin by default', () => {
      const config = getConfig();
      expect(config.marginMm).toBe(20);
    });

    it('should have 60s timeout by default', () => {
      const config = getConfig();
      expect(config.timeoutMs).toBe(60000);
    });

    it('should enable header/footer by default', () => {
      const config = getConfig();
      expect(config.displayHeaderFooter).toBe(true);
    });
  });

  // Note: renderHtmlToPdf requires Playwright browser
  // Full integration tests are in E2E suite
});
