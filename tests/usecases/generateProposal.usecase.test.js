/**
 * Tests for generateProposal.usecase
 * Tests business logic for document generation pipeline
 *
 * Pipeline (PDF-only):
 * 1. Build document data (AI sections + form data + financial data)
 * 2. Create archive directory: out/{Nom_Client}/{Date_Projet}/
 * 3. Load HTML template and render with data
 * 4. Generate PDF using Playwright
 * 5. Save metadata.json
 * 6. Return public URL for generated PDF
 */

const path = require('path');
const fs = require('fs');

// Mock the adapters and services
jest.mock('../../adapters/storage/file.adapter.js', () => ({
  expose: jest.fn(),
  createArchiveDir: jest.fn(),
  saveMetadata: jest.fn()
}));

jest.mock('../../utils/template.util.js', () => ({
  renderTemplate: jest.fn((template, data) => `<html>Rendered for ${data.entrepriseNom}</html>`)
}));

jest.mock('../../services/pdf-render.service.js', () => ({
  renderHtmlToPdf: jest.fn()
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn()
  }
}));

const generateProposalUseCase = require('../../usecases/generateProposal.usecase');
const fileAdapter = require('../../adapters/storage/file.adapter.js');
const { renderTemplate } = require('../../utils/template.util.js');
const { renderHtmlToPdf } = require('../../services/pdf-render.service.js');
const costService = require('../../services/cost.service.js');

describe('generateProposal.usecase', () => {
  const mockArchiveDir = '/storage/out/TestCompany/2026-01-20';
  const mockPdfPath = `${mockArchiveDir}/proposal.pdf`;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations for PDF-only pipeline
    fileAdapter.createArchiveDir.mockResolvedValue(mockArchiveDir);
    fileAdapter.expose.mockImplementation((filePath) => {
      const relativePath = filePath.replace(/^.*[\\\/]out[\\\/]/, 'out/');
      return `http://localhost:3000/files/${relativePath}`;
    });
    fileAdapter.saveMetadata.mockResolvedValue();

    // Mock HTML template loading
    fs.promises.readFile.mockResolvedValue('<html>{{entrepriseNom}}</html>');

    // Mock PDF rendering
    renderHtmlToPdf.mockResolvedValue();
  });

  describe('buildDocumentData', () => {
    it('should merge AI-generated sections into document data', () => {
      const draft = {
        titre: 'AI Title',
        contexte: 'AI Context',
        demarche: 'AI Approach',
        phases: 'AI Phases',
        phrase: 'AI Conclusion'
      };

      const result = generateProposalUseCase.buildDocumentData(draft);

      expect(result.titre).toBe('AI Title');
      expect(result.contexte).toBe('AI Context');
      expect(result.demarche).toBe('AI Approach');
      expect(result.phases).toBe('AI Phases');
      expect(result.phrase).toBe('AI Conclusion');
    });

    it('should include form data in document data', () => {
      const draft = {
        entrepriseNom: 'Acme Corp',
        contactNom: 'John Doe',
        contactEmail: 'john@acme.com',
        thematique: 'Lean',
        dureeSemaines: 12
      };

      const result = generateProposalUseCase.buildDocumentData(draft);

      expect(result.entrepriseNom).toBe('Acme Corp');
      expect(result.contactNom).toBe('John Doe');
      expect(result.contactEmail).toBe('john@acme.com');
      expect(result.thematique).toBe('Lean');
      expect(result.dureeSemaines).toBe(12);
    });

    it('should include financial data from costService', () => {
      const draft = {
        dureeSemaines: 24
      };

      const result = generateProposalUseCase.buildDocumentData(draft);

      expect(result.budget).toBeDefined();
      expect(result.budgetRaw).toBe(20000);
      expect(result.budgetEnLettres).toBe('vingt mille euros');
      expect(result.echeancier).toBeDefined();
      expect(result.DateDuJour).toBeDefined();
    });

    it('should calculate budget based on duration', () => {
      const draft12Weeks = { dureeSemaines: 12 };
      const draft24Weeks = { dureeSemaines: 24 };

      const result12 = generateProposalUseCase.buildDocumentData(draft12Weeks);
      const result24 = generateProposalUseCase.buildDocumentData(draft24Weeks);

      expect(result12.budgetRaw).toBe(10000);
      expect(result24.budgetRaw).toBe(20000);
    });

    it('should use default values for missing fields', () => {
      const result = generateProposalUseCase.buildDocumentData({});

      expect(result.titre).toBe('');
      expect(result.entrepriseNom).toBe('');
      expect(result.dureeSemaines).toBe(24);
      expect(result.dureeTexte).toBe('24 semaines');
    });

    it('should respect budgetOverride when provided', () => {
      const draft = {
        dureeSemaines: 24,
        budgetOverride: 50000
      };

      const result = generateProposalUseCase.buildDocumentData(draft);

      expect(result.budgetRaw).toBe(50000);
      expect(result.budgetEnLettres).toBe('cinquante mille euros');
    });

    it('should include computed fields for template compatibility', () => {
      const draft = { dureeSemaines: 16 };

      const result = generateProposalUseCase.buildDocumentData(draft);

      expect(result.dureeTexte).toBe('16 semaines');
      expect(result.annee).toBe(new Date().getFullYear().toString());
    });
  });

  describe('execute', () => {
    it('should return success response with PDF document', async () => {
      const proposalDraft = {
        titre: 'Test Project',
        entrepriseNom: 'Test Company',
        dureeSemaines: 24
      };

      const result = await generateProposalUseCase.execute(proposalDraft);

      expect(result.success).toBe(true);
      expect(result.documents).toBeDefined();
      expect(result.documents.pdf).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should require entrepriseNom field', async () => {
      const proposalDraft = {
        titre: 'Test Title'
        // entrepriseNom missing
      };

      const result = await generateProposalUseCase.execute(proposalDraft);

      expect(result.success).toBe(false);
      expect(result.error).toContain('entreprise');
    });

    it('should create archive directory with client name', async () => {
      const proposalDraft = {
        titre: 'Test Title',
        entrepriseNom: 'Test Corp'
      };

      await generateProposalUseCase.execute(proposalDraft);

      expect(fileAdapter.createArchiveDir).toHaveBeenCalledWith({
        clientName: 'Test Corp',
        projectDate: expect.any(Date)
      });
    });

    it('should load HTML template and render with document data', async () => {
      const proposalDraft = {
        titre: 'Test Title',
        entrepriseNom: 'Test Corp'
      };

      await generateProposalUseCase.execute(proposalDraft);

      expect(fs.promises.readFile).toHaveBeenCalled();
      expect(renderTemplate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          titre: 'Test Title',
          entrepriseNom: 'Test Corp'
        })
      );
    });

    it('should call renderHtmlToPdf with correct parameters', async () => {
      const proposalDraft = {
        titre: 'Test Title',
        entrepriseNom: 'Test Corp'
      };

      await generateProposalUseCase.execute(proposalDraft);

      expect(renderHtmlToPdf).toHaveBeenCalledWith({
        html: expect.any(String),
        outputPath: expect.stringContaining('proposal.pdf')
      });
    });

    it('should return PDF document with url and path', async () => {
      const proposalDraft = {
        titre: 'Test',
        entrepriseNom: 'Test Company'
      };

      const result = await generateProposalUseCase.execute(proposalDraft);

      expect(result.documents.pdf).toHaveProperty('url');
      expect(result.documents.pdf).toHaveProperty('path');
      expect(result.documents.pdf.url).toContain('proposal.pdf');
      expect(result.documents.pdf.path).toContain('proposal.pdf');
    });

    it('should save metadata to archive directory', async () => {
      const proposalDraft = {
        titre: 'Test',
        entrepriseNom: 'Acme'
      };

      await generateProposalUseCase.execute(proposalDraft);

      expect(fileAdapter.saveMetadata).toHaveBeenCalledWith({
        archiveDir: mockArchiveDir,
        metadata: expect.objectContaining({
          generatedAt: expect.any(String),
          templateUsed: expect.any(String),
          entreprise: 'Acme'
        })
      });
    });

    it('should include metadata in response', async () => {
      const result = await generateProposalUseCase.execute({
        titre: 'Test',
        entrepriseNom: 'Acme'
      });

      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.metadata.entreprise).toBe('Acme');
      expect(result.metadata.budget).toBeDefined();
      expect(result.metadata.templateUsed).toBe('proposal.html');
      expect(result.metadata.archiveDir).toBe(mockArchiveDir);
    });

    it('should handle PDF rendering errors gracefully', async () => {
      renderHtmlToPdf.mockRejectedValue(new Error('Playwright rendering failed'));

      const result = await generateProposalUseCase.execute({
        titre: 'Test',
        entrepriseNom: 'Test Corp'
      });

      expect(result.success).toBe(false);
      expect(result.documents.pdf).toBeNull();
      expect(result.error).toBe('Playwright rendering failed');
    });

    it('should handle template loading errors gracefully', async () => {
      fs.promises.readFile.mockRejectedValue(new Error('Template not found'));

      const result = await generateProposalUseCase.execute({
        titre: 'Test',
        entrepriseNom: 'Test Corp'
      });

      expect(result.success).toBe(false);
      expect(result.documents.pdf).toBeNull();
      expect(result.error).toContain('template');
    });

    it('should use fileAdapter.expose to generate PDF URL', async () => {
      await generateProposalUseCase.execute({
        titre: 'Test',
        entrepriseNom: 'Test Company'
      });

      expect(fileAdapter.expose).toHaveBeenCalledWith(expect.stringContaining('proposal.pdf'));
    });
  });

  describe('costService integration', () => {
    it('should use costService.getFinancialData for calculations', () => {
      const financialData = costService.getFinancialData({ dureeSemaines: 24 });

      expect(financialData.budget).toBeDefined();
      expect(financialData.budgetRaw).toBe(20000);
      expect(financialData.budgetEnLettres).toContain('vingt mille');
      expect(financialData.echeancier).toBeDefined();
      expect(financialData.DateDuJour).toBeDefined();
    });

    it('should calculate correct budget for different durations', () => {
      const data12 = costService.getFinancialData({ dureeSemaines: 12 });
      const data36 = costService.getFinancialData({ dureeSemaines: 36 });

      expect(data12.budgetRaw).toBe(10000);
      expect(data36.budgetRaw).toBe(30000);
    });

    it('should format dates in French literal format', () => {
      const data = costService.getFinancialData({ dureeSemaines: 24 });

      // Should match pattern like "19 janvier 2026"
      expect(data.DateDuJour).toMatch(/^\d{1,2}(er)?\s+[a-zA-Zéû]+\s+\d{4}$/);
    });
  });
});
