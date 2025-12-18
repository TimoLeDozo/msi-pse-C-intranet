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
