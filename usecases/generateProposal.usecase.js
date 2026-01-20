/**
 * Use case: Generate Proposal
 * Role: Transform draft proposal into final PDF document with structured archiving
 *
 * Pipeline (PDF-only):
 * 1. Build document data from proposalDraft (AI sections + form data + financial data)
 * 2. Create archive directory: out/{Nom_Client}/{Date_Projet}/
 * 3. Load HTML template and render with data
 * 4. Generate PDF using Playwright
 * 5. Save metadata.json
 * 6. Return public URL for generated PDF
 */

const path = require('path');
const fs = require('fs').promises;
const fileAdapter = require('../adapters/storage/file.adapter.js');
const costService = require('../services/cost.service.js');
const { renderTemplate } = require('../utils/template.util.js');
const { renderHtmlToPdf } = require('../services/pdf-render.service.js');

/**
 * @typedef {Object} ProposalDraft
 * @property {string} [titre] - AI-generated title
 * @property {string} [contexte] - AI-generated context section
 * @property {string} [demarche] - AI-generated approach description
 * @property {string} [phases] - AI-generated project phases
 * @property {string} [phrase] - AI-generated concluding phrase
 * @property {string} [typeContrat] - Contract type label
 * @property {string} entrepriseNom - Company name from form (required for archiving)
 * @property {string} [entrepriseAdresse] - Company address
 * @property {string} [entrepriseLogo] - Company logo URL or label
 * @property {string} [codeProjet] - Project reference code
 * @property {string|Date} [dateDebut] - Project start date
 * @property {string} [clientNom] - Client contact name
 * @property {string} [clientFonction] - Client contact role
 * @property {string} [clientEmail] - Client contact email
 * @property {string} [clientTelephone] - Client contact phone
 * @property {number} [dureeSemaines] - Project duration in weeks
 * @property {string} [contactNom] - Contact name
 * @property {string} [contactEmail] - Contact email
 * @property {string} [thematique] - Project theme (Lean, Audit, R&D, etc.)
 * @property {number} [budgetOverride] - Optional budget override
 * @property {number} [phaseCount] - Number of phases for payment schedule
 * @property {string} [eligibiliteCII] - Optional CII eligibility note
 * @property {Date} [projectDate] - Project date for archive directory (defaults to now)
 */

/**
 * @typedef {Object} DocumentResult
 * @property {string} url - Public URL to access the document
 * @property {string} path - Local filesystem path
 */

/**
 * @typedef {Object} GenerationResult
 * @property {boolean} success - Whether generation succeeded
 * @property {Object} documents - Generated documents
 * @property {DocumentResult} documents.pdf - PDF document info
 * @property {Object} metadata - Generation metadata
 * @property {string} metadata.generatedAt - ISO timestamp
 * @property {string} metadata.entreprise - Company name
 * @property {number} metadata.budget - Budget amount
 * @property {string} metadata.archiveDir - Path to the archive directory
 * @property {string} [error] - Error message if generation failed
 */

// HTML template path
const HTML_TEMPLATE_PATH = path.join(__dirname, '../templates/proposal.html');

/**
 * Build complete document data by merging AI sections, form data, and financial calculations
 * @param {ProposalDraft} proposalDraft - Input draft data
 * @returns {Object} Complete data object for HTML template
 */
function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function formatDateInput(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }
  return costService.formatFrenchDate(date);
}

function buildDocumentData(proposalDraft) {
  const dureeSemaines = toPositiveNumber(proposalDraft.dureeSemaines, 24);
  const nbEquipes = toPositiveNumber(proposalDraft.nbEquipes, 1);
  const phaseCount = toPositiveNumber(proposalDraft.phaseCount, 3);

  const clientNom = proposalDraft.clientNom || proposalDraft.contactNom || '';
  const clientEmail = proposalDraft.clientEmail || proposalDraft.contactEmail || '';
  const contactNom = proposalDraft.contactNom || clientNom;
  const contactEmail = proposalDraft.contactEmail || clientEmail;
  const objectifs = proposalDraft.objectifs || proposalDraft.ia_objectifs || '';
  const livrables = proposalDraft.livrables || proposalDraft.ia_solution || '';
  const methodologieBase = proposalDraft.methodologie || proposalDraft.demarche || '';
  const phasesText = proposalDraft.phases || '';
  const methodologie = [methodologieBase, phasesText].filter(Boolean).join('\n\n');
  const echeancierText = typeof proposalDraft.echeancier === 'string'
    ? proposalDraft.echeancier
    : '';

  // Get financial data from cost service
  const financialData = costService.getFinancialData({
    dureeSemaines,
    nbEquipes,
    budgetOverride: proposalDraft.budgetOverride,
    nbPhases: phaseCount
  });

  const scheduleText = financialData.echeancier || echeancierText;
  const scheduleLines = scheduleText.split('\n').filter((line) => line.trim());
  const splitIndex = Math.ceil(scheduleLines.length / 2);
  const echeancierLeft = scheduleLines.slice(0, splitIndex).join('\n');
  const echeancierRight = scheduleLines.slice(splitIndex).join('\n');

  // Merge all data sources for template placeholders
  return {
    // AI-generated sections
    titre: proposalDraft.titre || '',
    contexte: proposalDraft.contexte || '',
    demarche: proposalDraft.demarche || '',
    phases: proposalDraft.phases || '',
    phrase: proposalDraft.phrase || '',
    objectifs,
    livrables,
    methodologie,

    // Form data
    entrepriseNom: proposalDraft.entrepriseNom || '',
    entrepriseAdresse: proposalDraft.entrepriseAdresse || '',
    entrepriseLogo: proposalDraft.entrepriseLogo || '',
    codeProjet: proposalDraft.codeProjet || '',
    typeContrat: proposalDraft.typeContrat || proposalDraft.thematique || '',
    dateDebut: formatDateInput(proposalDraft.dateDebut),
    clientNom,
    clientFonction: proposalDraft.clientFonction || '',
    clientEmail,
    clientTelephone: proposalDraft.clientTelephone || '',
    contactNom,
    contactEmail,
    thematique: proposalDraft.thematique || '',
    dureeSemaines,

    // Financial data from cost service
    budget: financialData.budget,
    budgetRaw: financialData.budgetRaw,
    budgetEnLettres: financialData.budgetEnLettres,
    budget_texte: financialData.budgetEnLettres,
    echeancier: echeancierLeft || scheduleText,
    'echeancier 2': echeancierRight,
    echeancier2: echeancierRight,
    DateDuJour: financialData.DateDuJour,
    eligibiliteCII: proposalDraft.eligibiliteCII || '',
    eligibiliteCIR: proposalDraft.eligibiliteCIR || '',

    // Additional computed fields for template compatibility
    dureeTexte: `${dureeSemaines} semaines`,
    annee: new Date().getFullYear().toString()
  };
}

/**
 * Build metadata object for archiving
 * @param {Object} params - Parameters
 * @param {Object} params.documentData - Processed document data
 * @param {ProposalDraft} params.proposalDraft - Original proposal draft
 * @param {string} params.generatedAt - ISO timestamp
 * @param {string} params.templateName - Template used
 * @param {Object} params.files - Generated file paths
 * @returns {Object} Metadata object
 */
function buildMetadata({ documentData, proposalDraft, generatedAt, templateName, files }) {
  return {
    // Generation info
    generatedAt,
    templateUsed: templateName,
    pipelineType: 'html-to-pdf',

    // Client info
    entreprise: documentData.entrepriseNom,
    contact: {
      nom: documentData.contactNom || null,
      email: documentData.contactEmail || null
    },

    // Project info
    thematique: documentData.thematique || null,
    dureeSemaines: documentData.dureeSemaines,

    // Financial info
    budget: documentData.budgetRaw,
    budgetFormatted: documentData.budget,

    // AI generation context (for traceability)
    aiSections: {
      hasTitre: !!proposalDraft.titre,
      hasContexte: !!proposalDraft.contexte,
      hasDemarche: !!proposalDraft.demarche,
      hasPhases: !!proposalDraft.phases,
      hasPhrase: !!proposalDraft.phrase
    },

    // Generated files
    files: {
      pdf: files.pdf ? path.basename(files.pdf) : null
    }
  };
}

/**
 * Load HTML template from filesystem
 * @returns {Promise<string>} HTML template content
 */
async function loadHtmlTemplate() {
  const templatePath = process.env.HTML_TEMPLATE_PATH || HTML_TEMPLATE_PATH;
  try {
    return await fs.readFile(templatePath, 'utf8');
  } catch (error) {
    throw new Error(`Impossible de charger le template HTML: ${error.message}`);
  }
}

/**
 * Execute the document generation pipeline with structured archiving
 * @param {ProposalDraft} proposalDraft - The proposal draft containing AI and form data
 * @returns {Promise<GenerationResult>} Generation result with document URL
 */
async function execute(proposalDraft) {
  const generatedAt = new Date().toISOString();

  try {
    // Validate required fields
    if (!proposalDraft.entrepriseNom) {
      throw new Error('Le nom de l\'entreprise est requis pour la generation');
    }

    // 1. Build complete document data
    const documentData = buildDocumentData(proposalDraft);

    // 2. Create archive directory: out/{Nom_Client}/{Date_Projet}/
    const archiveDir = await fileAdapter.createArchiveDir({
      clientName: proposalDraft.entrepriseNom,
      projectDate: proposalDraft.projectDate || new Date()
    });

    // 3. Load HTML template
    const htmlTemplate = await loadHtmlTemplate();

    // 4. Render HTML with document data
    const renderedHtml = renderTemplate(htmlTemplate, documentData);

    // 5. Generate PDF using Playwright
    const pdfPath = path.join(archiveDir, 'proposal.pdf');
    await renderHtmlToPdf({
      html: renderedHtml,
      outputPath: pdfPath
    });

    // 6. Get public URL
    const pdfUrl = await fileAdapter.expose(pdfPath);

    // 7. Build and save metadata
    const templateName = process.env.HTML_TEMPLATE_PATH
      ? path.basename(process.env.HTML_TEMPLATE_PATH)
      : 'proposal.html';

    const metadata = buildMetadata({
      documentData,
      proposalDraft,
      generatedAt,
      templateName,
      files: { pdf: pdfPath }
    });

    await fileAdapter.saveMetadata({
      archiveDir,
      metadata
    });

    // 8. Return success result
    return {
      success: true,
      documents: {
        pdf: {
          url: pdfUrl,
          path: pdfPath
        }
      },
      metadata: {
        generatedAt,
        entreprise: documentData.entrepriseNom,
        budget: documentData.budgetRaw,
        budgetFormatted: documentData.budget,
        templateUsed: templateName,
        archiveDir
      }
    };

  } catch (error) {
    // Handle generation errors gracefully
    console.error(`Proposal generation failed: ${error.message}`);

    return {
      success: false,
      documents: {
        pdf: null
      },
      metadata: {
        generatedAt,
        entreprise: proposalDraft.entrepriseNom || 'Unknown'
      },
      error: error.message
    };
  }
}

module.exports = {
  execute,
  buildDocumentData, // Exported for testing
  buildMetadata // Exported for testing
};
