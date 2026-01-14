/**
 * Use case: preview proposal
 * Rôle : transformer un draft → sections IA
 */

const aiAdapter = require('../adapters/ai'); // Charge index.js automatiquement
const promptService = require('../prompts/icam.prompt');

// Optionnel : validation si ton service existe
let validationService = null;
try {
  validationService = require('../services/validation.service');
} catch (_) {}

module.exports = {
  async execute(proposalDraft) {
    if (validationService?.validateProposalDraft) {
      validationService.validateProposalDraft(proposalDraft);
    }

    const messages = [
      { role: 'system', content: promptService.SYSTEM_PROMPT },
      { role: 'user', content: promptService.buildUserMessage(proposalDraft) }
    ];

    const aiResponse = await aiAdapter.generateStructuredContent({
      messages,
      temperature: 0.7,
      maxTokens: 2000
    });

    return {
      success: true,
      aiSections: aiResponse.sections,
      cost: aiResponse.cost,
      meta: {
        model: aiResponse.model,
        durationMs: aiResponse.durationMs
      }
    };
  }
};
