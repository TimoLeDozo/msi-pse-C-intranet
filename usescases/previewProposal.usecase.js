/**
 * Use case : Preview IA d'une proposition commerciale
 * Équivalent fonctionnel Apps Script : previewAIContent
 *
 * Responsabilités :
 * - Valider le brouillon
 * - Construire le prompt ICAM
 * - Appeler l'IA (DeepSeek)
 * - Retourner des sections éditables
 * - Journaliser le coût
 *
 * AUCUNE génération de document ici.
 */

const { validateProposalDraft } = require('../services/validation.service');
const deepSeekAdapter = require('../adapters/ai/deepseek.adapter');
const costService = require('../services/cost.service');
const buildPrompt = require('../prompts/deepseek.icam.prompt');

class PreviewProposalUseCase {
  /**
   * @param {Object} proposalDraft - Brouillon normalisé (ProposalDraft)
   * @returns {Promise<Object>} sections IA + coût
   */
  async execute(proposalDraft) {
    // 1. Validation métier minimale (équivalent Apps Script B2)
    validateProposalDraft(proposalDraft, {
      requireEntreprise: true,
      requireIAContext: true,
      previewMode: true
    });

    // 2. Construction du prompt ICAM (versionné)
    const prompt = buildPrompt({
      titre: proposalDraft.titre,
      thematique: proposalDraft.thematique,
      entrepriseNom: proposalDraft.entrepriseNom,
      ia_histoire: proposalDraft.ia_histoire,
      ia_lieux: proposalDraft.ia_lieux,
      ia_probleme: proposalDraft.ia_probleme,
      ia_solution: proposalDraft.ia_solution,
      ia_objectifs: proposalDraft.ia_objectifs,
      dureeSemaines: proposalDraft.dureeSemaines,
      attachments: proposalDraft.attachments || []
    });

    // 3. Appel IA (DeepSeek)
    const aiResponse = await deepSeekAdapter.generateStructuredContent(prompt);

    /**
     * aiResponse attendu :
     * {
     *   sections: {
     *     titre,
     *     contexte,
     *     demarche,
     *     phases,
     *     phrase
     *   },
     *   usage: {
     *     promptTokens,
     *     completionTokens,
     *     totalTokens
     *   },
     *   cost: {
     *     totalUsd
     *   }
     * }
     */

    // 4. Validation de la réponse IA (sécurité minimale)
    const sections = aiResponse.sections || {};
    const requiredFields = ['titre', 'contexte', 'demarche', 'phases', 'phrase'];

    for (const field of requiredFields) {
      if (!sections[field] || typeof sections[field] !== 'string') {
        throw new Error(`Réponse IA invalide : champ "${field}" manquant`);
      }
    }

    // 5. Journalisation du coût (aligné B2)
    await costService.log({
      provider: 'deepseek',
      model: aiResponse.model || 'deepseek-reasoner',
      usage: aiResponse.usage,
      cost: aiResponse.cost,
      context: {
        entreprise: proposalDraft.entrepriseNom,
        titre: proposalDraft.titre,
        mode: 'preview'
      }
    });

    // 6. Retour strictement éditable (pour UI preview)
    return {
      success: true,
      aiSections: {
        titre: sections.titre,
        contexte: sections.contexte,
        demarche: sections.demarche,
        phases: sections.phases,
        phrase: sections.phrase
      },
      cost: aiResponse.cost,
      usage: aiResponse.usage
    };
  }
}

module.exports = new PreviewProposalUseCase();
