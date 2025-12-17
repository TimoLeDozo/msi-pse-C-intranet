/**
 * Use case : Génération finale d'une proposition commerciale
 * Équivalent fonctionnel Apps Script : generateFromForm
 *
 * Responsabilités :
 * - Valider le brouillon final
 * - Générer (ou compléter) les sections IA si besoin
 * - Injecter les placeholders dans le template DOCX
 * - Générer DOCX + PDF
 * - Journaliser les coûts
 *
 * La preview humaine est supposée avoir eu lieu AVANT.
 */

const { validateProposalDraft } = require('../services/validation.service');
const deepSeekAdapter = require('../adapters/ai/deepseek.adapter');
const documentAdapter = require('../adapters/document/docx.adapter');
const pdfAdapter = require('../adapters/document/pdf.adapter');
const fileAdapter = require('../adapters/storage/file.adapter');
const costService = require('../services/cost.service');
const buildPrompt = require('../prompts/deepseek.icam.prompt');

class GenerateProposalUseCase {
  /**
   * @param {Object} proposalDraft - Brouillon validé (ProposalDraft)
   * @returns {Promise<Object>} liens DOCX / PDF + coût
   */
  async execute(proposalDraft) {
    // 1. Validation métier stricte (équivalent B2 génération)
    validateProposalDraft(proposalDraft, {
      requireEntreprise: true,
      requireClient: true,
      requireProjectMeta: true,
      requireFinalSections: false // IA possible ici
    });

    let aiSections = {
      titre: proposalDraft.titre,
      contexte: proposalDraft.contexte,
      demarche: proposalDraft.demarche,
      phases: proposalDraft.phases,
      phrase: proposalDraft.phrase
    };

    let aiCost = null;
    let aiUsage = null;

    // 2. Si sections IA manquantes → génération IA (fallback contrôlé)
    const missingSections = Object.entries(aiSections)
      .filter(([_, value]) => !value || typeof value !== 'string')
      .map(([key]) => key);

    if (missingSections.length > 0) {
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

      const aiResponse = await deepSeekAdapter.generateStructuredContent(prompt);

      aiSections = {
        titre: aiSections.titre || aiResponse.sections.titre,
        contexte: aiSections.contexte || aiResponse.sections.contexte,
        demarche: aiSections.demarche || aiResponse.sections.demarche,
        phases: aiSections.phases || aiResponse.sections.phases,
        phrase: aiSections.phrase || aiResponse.sections.phrase
      };

      aiCost = aiResponse.cost;
      aiUsage = aiResponse.usage;

      await costService.log({
        provider: 'deepseek',
        model: aiResponse.model || 'deepseek-reasoner',
        usage: aiUsage,
        cost: aiCost,
        context: {
          entreprise: proposalDraft.entrepriseNom,
          titre: proposalDraft.titre,
          mode: 'generate'
        }
      });
    }

    // 3. Construction du payload template (placeholders ICAM)
    const templateData = {
      // Métadonnées projet
      titre: aiSections.titre,
      thematique: proposalDraft.thematique,
      codeProjet: proposalDraft.codeProjet,
      dateDebut: proposalDraft.dateDebut,
      dureeSemaines: proposalDraft.dureeSemaines,
      budgetTotal: proposalDraft.budgetTotal,

      // Entreprise
      entrepriseNom: proposalDraft.entrepriseNom,
      entrepriseAdresse: proposalDraft.entrepriseAdresse,
      entrepriseLogo: proposalDraft.entrepriseLogo,

      // Client
      clientNom: proposalDraft.clientNom,
      clientFonction: proposalDraft.clientFonction,
      clientEmail: proposalDraft.clientEmail,
      clientTelephone: proposalDraft.clientTelephone,

      // Sections IA
      contexte: aiSections.contexte,
      demarche: aiSections.demarche,
      phases: aiSections.phases,
      phrase: aiSections.phrase,

      // Versioning
      versionDoc: proposalDraft.versionDoc || 'v1.0'
    };

    // 4. Génération DOCX (placeholder engine)
    const docxPath = await documentAdapter.generate({
      templateName: 'contrat_rnd_icam.docx',
      data: templateData
    });

    // 5. Conversion PDF (non bloquante, comme B2)
    const pdfPath = await pdfAdapter.convert(docxPath);

    // 6. Stockage & URLs
    const docxUrl = fileAdapter.expose(docxPath);
    const pdfUrl = pdfPath ? fileAdapter.expose(pdfPath) : null;

    // 7. Résultat final (aligné UI B2)
    return {
      success: true,
      documents: {
        docx: {
          path: docxPath,
          url: docxUrl
        },
        pdf: pdfPath
          ? { path: pdfPath, url: pdfUrl }
          : null
      },
      ai: {
        used: Boolean(aiCost),
        cost: aiCost,
        usage: aiUsage
      }
    };
  }
}

module.exports = new GenerateProposalUseCase();
