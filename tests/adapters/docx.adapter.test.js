const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');

jest.mock('docxtemplater', () => {
  const PizZip = require('pizzip');
  return jest.fn().mockImplementation(() => ({
    setData: jest.fn(),
    render: jest.fn(),
    getZip: () => {
      const zip = new PizZip();
      zip.file('word/document.xml', '<w:document></w:document>');
      return {
        generate: () => zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
      };
    }
  }));
});

const docxAdapter = require('../../adapters/storage/docx.adapter.js');
const templatesDir = path.join(__dirname, '../../templates');

async function createTempTemplate() {
  const zip = new PizZip();
  zip.file('word/document.xml', 'Hello {{name}}');
  const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const filename = `test_template_${Date.now()}.docx`;
  const filePath = path.join(templatesDir, filename);
  await fs.promises.writeFile(filePath, buffer);
  return { filename, filePath };
}

describe('docx.adapter', () => {
  it('removes residual placeholders from text', () => {
    const input = 'Hello {{name}} and {{company}}';
    const output = docxAdapter.cleanResidualPlaceholders(input);

    expect(output).not.toMatch(/\{\{.*?\}\}/);
  });

  it('removes residual placeholders from a docx buffer', () => {
    const zip = new PizZip();
    zip.file('word/document.xml', 'Hello {{name}} world');
    zip.file('word/header1.xml', 'Header {{title}}');
    const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    const cleaned = docxAdapter.cleanResidualPlaceholdersFromBuffer(buffer);
    const cleanedZip = new PizZip(cleaned);
    const xml = cleanedZip.file('word/document.xml').asText();
    const headerXml = cleanedZip.file('word/header1.xml').asText();

    expect(xml).not.toMatch(/\{\{.*?\}\}/);
    expect(headerXml).not.toMatch(/\{\{.*?\}\}/);
  });

  it('cleans common markdown markers', () => {
    const input = '# Header\n- item\n**bold** and `code`';
    const output = docxAdapter.cleanText(input);

    expect(output).not.toMatch(/[#`*]/);
    expect(output).toContain('Header');
    expect(output).toContain('item');
    expect(output).toContain('bold');
  });

  it('formats an echeancier list', () => {
    const output = docxAdapter.formatEcheancier([
      { phase: 'Phase 1', pourcentage: 30, montant: 1000 }
    ]);

    expect(output).toContain('Phase 1');
    expect(output).toContain('30%');
    expect(typeof output).toBe('string');
  });

  it('generates a docx file from a template', async () => {
    const { filename, filePath } = await createTempTemplate();
    const outputPath = await docxAdapter.generate({
      templateName: filename,
      data: {
        entrepriseNom: 'TestCo',
        titre: 'Test Title',
        demarche: '**bold**',
        phases: '- phase 1',
        phrase: '`code`'
      }
    });

    try {
      const exists = await fs.promises.access(outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    } finally {
      await fs.promises.unlink(filePath);
      await fs.promises.unlink(outputPath);
    }
  });

  it('generates a docx with finance data', async () => {
    const { filename, filePath } = await createTempTemplate();
    const outputPath = await docxAdapter.generateWithFinance({
      templateName: filename,
      data: {
        entrepriseNom: 'TestCo',
        titre: 'Finance Title'
      },
      financialData: {
        budget: 20000,
        echeancier: [{ phase: 'Phase 1', pourcentage: 30, montant: 6000 }],
        budgetEnLettres: 'vingt mille euros',
        DateDuJour: '1 janvier 2026'
      }
    });

    try {
      const exists = await fs.promises.access(outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    } finally {
      await fs.promises.unlink(filePath);
      await fs.promises.unlink(outputPath);
    }
  });
});
