const { chromium } = require('playwright');

const CONFIG = {
  timeoutMs: parseInt(process.env.PDF_RENDER_TIMEOUT, 10) || 60000,
  format: process.env.PDF_RENDER_FORMAT || 'A4',
  marginMm: parseInt(process.env.PDF_RENDER_MARGIN_MM, 10) || 20,
  displayHeaderFooter: process.env.PDF_HEADER_FOOTER !== 'false' // Activé par défaut
};

/**
 * Génère le template header avec le nom de l'entreprise
 * @param {string} entrepriseNom - Nom de l'entreprise (optionnel)
 * @returns {string} Template HTML pour le header
 */
function buildHeaderTemplate(entrepriseNom = '') {
  const title = entrepriseNom
    ? `Icam GPS - Propale ${entrepriseNom}`
    : 'Proposition Commerciale - Confidentiel';

  return `
    <div style="
      width: 100%;
      font-size: 9px;
      font-family: Calibri, Arial, sans-serif;
      color: #666;
      padding: 0 20mm;
      box-sizing: border-box;
    ">
      <span style="float: left;">${title}</span>
    </div>
  `;
}

const FOOTER_TEMPLATE = `
  <div style="
    width: 100%;
    font-size: 9px;
    font-family: Calibri, Arial, sans-serif;
    color: #666;
    text-align: center;
    padding: 0 20mm;
    box-sizing: border-box;
  ">
    Page <span class="pageNumber"></span> sur <span class="totalPages"></span>
  </div>
`;

/**
 * Construit les options PDF avec header dynamique
 * @param {Object} options - Options supplémentaires
 * @param {string} [options.entrepriseNom] - Nom de l'entreprise pour le header
 * @returns {Object} Options Playwright PDF
 */
function buildPdfOptions(options = {}) {
  const baseMargin = `${CONFIG.marginMm}mm`;

  const pdfOptions = {
    format: CONFIG.format,
    printBackground: true,
    margin: {
      top: CONFIG.displayHeaderFooter ? '25mm' : baseMargin,
      bottom: CONFIG.displayHeaderFooter ? '20mm' : baseMargin,
      left: baseMargin,
      right: baseMargin
    }
  };

  // Ajouter headers/footers si activés
  if (CONFIG.displayHeaderFooter) {
    pdfOptions.displayHeaderFooter = true;
    pdfOptions.headerTemplate = buildHeaderTemplate(options.entrepriseNom);
    pdfOptions.footerTemplate = FOOTER_TEMPLATE;
  }

  return pdfOptions;
}

/**
 * Génère un PDF à partir de contenu HTML
 * @param {Object} params - Paramètres
 * @param {string} params.html - Contenu HTML à convertir
 * @param {string} params.outputPath - Chemin de sortie du PDF
 * @param {string} [params.entrepriseNom] - Nom de l'entreprise pour le header
 * @returns {Promise<string>} Chemin du fichier généré
 */
async function renderHtmlToPdf({ html, outputPath, entrepriseNom }) {
  if (!html) {
    throw new Error('HTML content is required for PDF rendering');
  }
  if (!outputPath) {
    throw new Error('Output path is required for PDF rendering');
  }

  let browser = null;

  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    page.setDefaultTimeout(CONFIG.timeoutMs);

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.pdf({ path: outputPath, ...buildPdfOptions({ entrepriseNom }) });

    return outputPath;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function checkAvailability() {
  try {
    const browser = await chromium.launch();
    await browser.close();
    return { available: true, engine: 'playwright' };
  } catch (error) {
    return { available: false, engine: 'playwright', error: error.message };
  }
}

function getConfig() {
  return { ...CONFIG };
}

module.exports = {
  renderHtmlToPdf,
  checkAvailability,
  getConfig
};
