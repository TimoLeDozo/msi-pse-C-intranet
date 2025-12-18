<<<<<<< HEAD
const deepSeekAdapter = require('../adapters/ai/deepseek.adapter');
const promptService = require('../prompts/icam.prompt');

exports.preview = async (req, res, next) => {
  try {
    console.log('Preview request received:', req.body);

    // Construction du prompt
    const messages = [
      { role: 'system', content: promptService.SYSTEM_PROMPT },
      { role: 'user', content: promptService.buildUserMessage(req.body) }
    ];

    // Appel à l'IA via l'adapter
    const aiResponse = await deepSeekAdapter.generateStructuredContent({
      messages: messages,
      temperature: 0.7, // Un peu de créativité pour la rédaction
      maxTokens: 2000
    });

    // Extraction des sections générées
    const aiSections = aiResponse.sections;

    res.json({
      success: true,
      aiSections: aiSections,
      cost: aiResponse.cost
    });

  } catch (error) {
    console.error("Erreur lors de la génération de la prévisualisation:", error);
    next(error);
  }
};

exports.generate = async (req, res, next) => {
  try {
    console.log('Generate request received:', req.body);
    // Mock response for generate
    // In a real scenario, this would generate documents and return URLs.
    // We return dummy URLs.

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json({
      success: true,
      documents: {
        docx: { url: "#" },
        pdf: { url: "#" }
      }
    });
  } catch (error) {
    next(error);
  }
};
=======
/**
 * Proposal Controller
 * Rôle : interface HTTP ↔ use cases
 */

const previewProposalUseCase = require('../usecases/previewProposal.usecase');
const generateProposalUseCase = require('../usecases/generateProposal.usecase');

class ProposalController {
  /**
   * POST /api/proposal/preview
   */
  async preview(req, res, next) {
    try {
      const proposalDraft = req.body;

      const result = await previewProposalUseCase.execute(proposalDraft);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/proposal/generate
   */
  async generate(req, res, next) {
    try {
      const proposalDraft = req.body;

      const result = await generateProposalUseCase.execute(proposalDraft);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProposalController();
>>>>>>> feat/frontend-fetch
