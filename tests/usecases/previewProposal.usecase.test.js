/**
 * Tests for previewProposal.usecase
 * Tests business logic with mocked adapters
 */

// Mock adapters before requiring the use case
jest.mock('../../adapters/ai');
jest.mock('../../prompts/icam.prompt');
jest.mock('../../services/validation.service', () => ({
  validateProposalDraft: jest.fn()
}));

const previewProposalUseCase = require('../../usecases/previewProposal.usecase');
const aiAdapter = require('../../adapters/ai');
const promptService = require('../../prompts/icam.prompt');
const validationService = require('../../services/validation.service');

describe('previewProposal.usecase', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup default prompt service mock
    promptService.buildDynamicPrompt = jest.fn(() => 'System prompt for testing');
    promptService.buildUserMessage = jest.fn((draft) => `User message for ${draft.titre}`);
  });

  describe('execute', () => {
    it('should successfully generate AI sections from proposal draft', async () => {
      // Arrange
      const proposalDraft = {
        titre: 'Test Project',
        entrepriseNom: 'Test Company',
        thematique: 'Technology',
        dureeSemaines: 12,
        ia_probleme: 'Need automation',
        ia_solution: 'AI-powered solution'
      };

      const mockAiResponse = {
        sections: {
          titre: 'Professional Project Title',
          contexte: 'Detailed context...',
          demarche: 'Methodological approach...',
          phases: 'Phase 1, Phase 2...',
          phrase: 'Closing statement'
        },
        cost: {
          inputUsd: 0.0001,
          outputUsd: 0.0002,
          totalUsd: 0.0003
        },
        model: 'qwen2.5:14b',
        durationMs: 1500
      };

      aiAdapter.generateStructuredContent.mockResolvedValue(mockAiResponse);

      // Act
      const result = await previewProposalUseCase.execute(proposalDraft);

      // Assert
      expect(result.success).toBe(true);
      expect(result.aiSections).toEqual(mockAiResponse.sections);
      expect(result.cost).toEqual(mockAiResponse.cost);
      expect(result.meta).toEqual({
        model: mockAiResponse.model,
        durationMs: mockAiResponse.durationMs
      });

      // Verify adapter was called with correct parameters
      expect(aiAdapter.generateStructuredContent).toHaveBeenCalledTimes(1);
      expect(aiAdapter.generateStructuredContent).toHaveBeenCalledWith({
        messages: [
          { role: 'system', content: 'System prompt for testing' },
          { role: 'user', content: expect.any(String) }
        ],
        temperature: 0.7,
        maxTokens: 2000
      });

      // Verify prompt service was called
      expect(promptService.buildDynamicPrompt).toHaveBeenCalledWith({
        typeContrat: proposalDraft.typeContrat || proposalDraft.thematique,
        contratPrecedent: proposalDraft.contratPrecedent
      });
      expect(promptService.buildUserMessage).toHaveBeenCalledWith(proposalDraft);
    });

    it('should call validation service if available', async () => {
      // Arrange
      const proposalDraft = {
        titre: 'Test Project',
        entrepriseNom: 'Test Company'
      };

      aiAdapter.generateStructuredContent.mockResolvedValue({
        sections: {},
        cost: {},
        model: 'qwen2.5:14b',
        durationMs: 1000
      });

      // Act
      await previewProposalUseCase.execute(proposalDraft);

      // Assert
      expect(validationService.validateProposalDraft).toHaveBeenCalledWith(proposalDraft);
    });

    it('should propagate errors from Ollama adapter', async () => {
      // Arrange
      const proposalDraft = { titre: 'Test' };
      const error = new Error('Ollama adapter error: Rate limit exceeded');

      aiAdapter.generateStructuredContent.mockRejectedValue(error);

      // Act & Assert
      await expect(previewProposalUseCase.execute(proposalDraft)).rejects.toThrow(
        'Ollama adapter error: Rate limit exceeded'
      );
    });

    it('should handle validation errors', async () => {
      // Arrange
      const proposalDraft = { titre: '' };
      const validationError = new Error('Validation failed: titre is required');

      validationService.validateProposalDraft.mockImplementationOnce(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(previewProposalUseCase.execute(proposalDraft)).rejects.toThrow(
        'Validation failed: titre is required'
      );

      // Adapter should not be called if validation fails
      expect(aiAdapter.generateStructuredContent).not.toHaveBeenCalled();
    });

    it('should handle missing optional fields in proposal draft', async () => {
      // Arrange
      const minimalDraft = {
        titre: 'Minimal Project'
        // All other fields missing
      };

      const mockAiResponse = {
        sections: {
          titre: 'Generated Title',
          contexte: 'Context based on minimal info',
          demarche: 'Approach',
          phases: 'Phases',
          phrase: 'Conclusion'
        },
        cost: { inputUsd: 0.0001, outputUsd: 0.0001, totalUsd: 0.0002 },
        model: 'qwen2.5:14b',
        durationMs: 1000
      };

      aiAdapter.generateStructuredContent.mockResolvedValue(mockAiResponse);

      // Act
      const result = await previewProposalUseCase.execute(minimalDraft);

      // Assert
      expect(result.success).toBe(true);
      expect(promptService.buildUserMessage).toHaveBeenCalledWith(minimalDraft);
    });

    it('should pass correct temperature and maxTokens to adapter', async () => {
      // Arrange
      const proposalDraft = { titre: 'Test' };

      aiAdapter.generateStructuredContent.mockResolvedValue({
        sections: {},
        cost: {},
        model: 'qwen2.5:14b',
        durationMs: 1000
      });

      // Act
      await previewProposalUseCase.execute(proposalDraft);

      // Assert
      const callArgs = aiAdapter.generateStructuredContent.mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.7);
      expect(callArgs.maxTokens).toBe(2000);
    });

    it('should structure messages correctly for AI', async () => {
      // Arrange
      const proposalDraft = { titre: 'Test Project' };
      const expectedUserMessage = 'User message for Test Project';

      promptService.buildDynamicPrompt.mockReturnValue('System prompt for testing');
      promptService.buildUserMessage.mockReturnValue(expectedUserMessage);

      aiAdapter.generateStructuredContent.mockResolvedValue({
        sections: {},
        cost: {},
        model: 'qwen2.5:14b',
        durationMs: 1000
      });

      // Act
      await previewProposalUseCase.execute(proposalDraft);

      // Assert
      const callArgs = aiAdapter.generateStructuredContent.mock.calls[0][0];
      expect(callArgs.messages).toEqual([
        { role: 'system', content: 'System prompt for testing' },
        { role: 'user', content: expectedUserMessage }
      ]);
    });

    it('should return all expected fields in result', async () => {
      // Arrange
      const proposalDraft = { titre: 'Test' };
      const mockAiResponse = {
        sections: { titre: 'Title', contexte: 'Context' },
        cost: { inputUsd: 0.001, outputUsd: 0.002, totalUsd: 0.003 },
        model: 'qwen2.5:14b',
        durationMs: 2000
      };

      aiAdapter.generateStructuredContent.mockResolvedValue(mockAiResponse);

      // Act
      const result = await previewProposalUseCase.execute(proposalDraft);

      // Assert
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('aiSections');
      expect(result).toHaveProperty('cost');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('model');
      expect(result.meta).toHaveProperty('durationMs');
    });
  });
});
