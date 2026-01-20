/**
 * Tests for path.util.js
 * Covers sanitization, date formatting, and archive path building
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const {
  sanitizeFileName,
  formatDateForPath,
  buildArchivePath,
  ensureDirectory,
  pathExists,
  getUniqueFilePath
} = require('../../utils/path.util.js');

describe('path.util', () => {
  describe('sanitizeFileName', () => {
    it('should handle simple names without changes', () => {
      expect(sanitizeFileName('Acme_Corp')).toBe('Acme_Corp');
      expect(sanitizeFileName('TestCompany')).toBe('TestCompany');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFileName('Acme Corp')).toBe('Acme_Corp');
      expect(sanitizeFileName('My Company Name')).toBe('My_Company_Name');
    });

    it('should handle accented characters', () => {
      expect(sanitizeFileName('Societe Generale')).toBe('Societe_Generale');
      expect(sanitizeFileName('Cafe Etude')).toBe('Cafe_Etude');
      expect(sanitizeFileName('Ecole Polytechnique')).toBe('Ecole_Polytechnique');
    });

    it('should remove special characters', () => {
      expect(sanitizeFileName('Company/Name')).toBe('Company_Name');
      expect(sanitizeFileName('Test:Name')).toBe('Test_Name');
      expect(sanitizeFileName('Name<>With|Chars')).toBe('Name_With_Chars');
      expect(sanitizeFileName('Test*Company?')).toBe('Test_Company');
    });

    it('should handle multiple consecutive special chars', () => {
      expect(sanitizeFileName('Test   Company')).toBe('Test_Company');
      expect(sanitizeFileName('Test___Company')).toBe('Test_Company');
    });

    it('should trim leading/trailing special characters', () => {
      expect(sanitizeFileName('_Company_')).toBe('Company');
      expect(sanitizeFileName('...Company...')).toBe('Company');
      expect(sanitizeFileName('  Company  ')).toBe('Company');
    });

    it('should limit length', () => {
      const longName = 'A'.repeat(200);
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should respect custom maxLength option', () => {
      const longName = 'A'.repeat(50);
      const result = sanitizeFileName(longName, { maxLength: 20 });
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should return "unknown" for empty or invalid input', () => {
      expect(sanitizeFileName('')).toBe('unknown');
      expect(sanitizeFileName(null)).toBe('unknown');
      expect(sanitizeFileName(undefined)).toBe('unknown');
      expect(sanitizeFileName('   ')).toBe('unknown');
    });

    it('should handle real-world French company names', () => {
      expect(sanitizeFileName('Saint-Gobain')).toBe('Saint-Gobain');
      expect(sanitizeFileName('L\'Oreal')).toBe('L_Oreal');
      expect(sanitizeFileName('BNP Paribas')).toBe('BNP_Paribas');
      expect(sanitizeFileName('Societe Generale')).toBe('Societe_Generale');
    });
  });

  describe('formatDateForPath', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(formatDateForPath(date)).toBe('2025-01-15');
    });

    it('should pad month and day with zeros', () => {
      const date = new Date(2025, 5, 5); // June 5, 2025
      expect(formatDateForPath(date)).toBe('2025-06-05');
    });

    it('should use current date when no argument provided', () => {
      const result = formatDateForPath();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle date from string', () => {
      const result = formatDateForPath('2025-03-20');
      expect(result).toBe('2025-03-20');
    });

    it('should fallback to current date for invalid input', () => {
      const result = formatDateForPath('invalid');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('buildArchivePath', () => {
    it('should build correct path structure', () => {
      const result = buildArchivePath({
        baseDir: '/storage/outputs',
        clientName: 'Acme Corp',
        projectDate: new Date(2025, 0, 20)
      });

      expect(result).toBe(path.join('/storage/outputs', 'Acme_Corp', '2025-01-20'));
    });

    it('should sanitize client name in path', () => {
      const result = buildArchivePath({
        baseDir: '/storage',
        clientName: 'Company/With:Special*Chars',
        projectDate: new Date(2025, 5, 15)
      });

      expect(result).toBe(path.join('/storage', 'Company_With_Special_Chars', '2025-06-15'));
    });

    it('should use current date when not provided', () => {
      const result = buildArchivePath({
        baseDir: '/storage',
        clientName: 'TestCo'
      });

      const today = formatDateForPath(new Date());
      expect(result).toBe(path.join('/storage', 'TestCo', today));
    });
  });

  describe('ensureDirectory', () => {
    const testDir = path.join(__dirname, '../../temp-test-dir-' + Date.now());

    afterAll(async () => {
      // Cleanup
      try {
        await fsp.rm(testDir, { recursive: true });
      } catch (_) {}
    });

    it('should create directory if it does not exist', async () => {
      const nestedDir = path.join(testDir, 'level1', 'level2');
      await ensureDirectory(nestedDir);

      const stats = await fsp.stat(nestedDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      await ensureDirectory(testDir);
      await expect(ensureDirectory(testDir)).resolves.not.toThrow();
    });
  });

  describe('pathExists', () => {
    it('should return true for existing directory', async () => {
      expect(await pathExists(__dirname)).toBe(true);
    });

    it('should return true for existing file', async () => {
      expect(await pathExists(__filename)).toBe(true);
    });

    it('should return false for non-existing path', async () => {
      expect(await pathExists('/non/existing/path')).toBe(false);
    });
  });

  describe('getUniqueFilePath', () => {
    const testDir = path.join(__dirname, '../../temp-unique-test-' + Date.now());

    beforeAll(async () => {
      await fsp.mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
      try {
        await fsp.rm(testDir, { recursive: true });
      } catch (_) {}
    });

    it('should return base path if file does not exist', async () => {
      const result = await getUniqueFilePath(testDir, 'proposal', '.docx');
      expect(result).toBe(path.join(testDir, 'proposal.docx'));
    });

    it('should append _1 if file exists', async () => {
      // Create the first file
      await fsp.writeFile(path.join(testDir, 'existing.docx'), 'test');

      const result = await getUniqueFilePath(testDir, 'existing', '.docx');
      expect(result).toBe(path.join(testDir, 'existing_1.docx'));
    });

    it('should increment counter for multiple existing files', async () => {
      // Create multiple files
      await fsp.writeFile(path.join(testDir, 'multi.docx'), 'test');
      await fsp.writeFile(path.join(testDir, 'multi_1.docx'), 'test');
      await fsp.writeFile(path.join(testDir, 'multi_2.docx'), 'test');

      const result = await getUniqueFilePath(testDir, 'multi', '.docx');
      expect(result).toBe(path.join(testDir, 'multi_3.docx'));
    });
  });
});
