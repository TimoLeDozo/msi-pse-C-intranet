/**
 * Tests for generateProposal.usecase
 * Tests business logic for document generation
 *
 * NOTE: Current implementation is a stub. Tests verify the contract
 * and should be extended when real DOCX/PDF generation is implemented.
 */

const generateProposalUseCase = require('../../usecases/generateProposal.usecase');

describe('generateProposal.usecase', () => {
  describe('execute', () => {
    it('should return success response with document URLs', async () => {
      // Arrange
      const proposalDraft = {
        titre: 'Test Project',
        entrepriseNom: 'Test Company',
        thematique: 'Technology',
        aiSections: {
          titre: 'Professional Title',
          contexte: 'Context...',
          demarche: 'Approach...',
          phases: 'Phases...',
          phrase: 'Conclusion'
        }
      };

      // Act
      const result = await generateProposalUseCase.execute(proposalDraft);

      // Assert
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('documents');
    });

    it('should return DOCX and PDF document URLs', async () => {
      // Arrange
      const proposalDraft = {
        titre: 'Test Project',
        aiSections: {
          titre: 'Title',
          contexte: 'Context'
        }
      };

      // Act
      const result = await generateProposalUseCase.execute(proposalDraft);

      // Assert
      expect(result.documents).toHaveProperty('docx');
      expect(result.documents).toHaveProperty('pdf');
      expect(result.documents.docx).toHaveProperty('url');
      expect(result.documents.pdf).toHaveProperty('url');
    });

    it('should handle minimal proposal draft', async () => {
      // Arrange
      const minimalDraft = {
        titre: 'Minimal Project'
      };

      // Act
      const result = await generateProposalUseCase.execute(minimalDraft);

      // Assert
      expect(result.success).toBe(true);
      expect(result.documents).toBeDefined();
    });

    it('should include implementation note', async () => {
      // Arrange
      const proposalDraft = { titre: 'Test' };

      // Act
      const result = await generateProposalUseCase.execute(proposalDraft);

      // Assert
      expect(result).toHaveProperty('note');
      expect(result.note).toContain('Generation pipeline à implémenter');
    });

    // TODO: Add these tests when real implementation is added
    describe.skip('when real implementation is added', () => {
      it('should call DOCX adapter with correct template and data', async () => {
        // This test should be implemented when DOCX generation is integrated
      });

      it('should call PDF adapter to convert DOCX to PDF', async () => {
        // This test should be implemented when PDF conversion is integrated
      });

      it('should validate proposal draft before generation', async () => {
        // This test should be implemented when validation is added
      });

      it('should handle DOCX adapter errors gracefully', async () => {
        // This test should be implemented when error handling is added
      });

      it('should handle PDF conversion errors gracefully', async () => {
        // This test should be implemented when error handling is added
      });

      it('should save generated files to storage/outputs', async () => {
        // This test should be implemented when file storage is integrated
      });

      it('should return accessible file URLs', async () => {
        // This test should verify URLs match FILE_BASE_URL configuration
      });

      it('should clean up temporary files on error', async () => {
        // This test should verify cleanup logic
      });

      it('should merge AI sections into template placeholders', async () => {
        // This test should verify placeholder replacement logic
      });

      it('should handle special characters in proposal data', async () => {
        // This test should verify text sanitization for Word/PDF
      });
    });
  });
});
