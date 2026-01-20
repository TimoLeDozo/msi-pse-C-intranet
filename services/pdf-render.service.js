const { chromium } = require('playwright');

const CONFIG = {
  timeoutMs: parseInt(process.env.PDF_RENDER_TIMEOUT, 10) || 60000,
  format: process.env.PDF_RENDER_FORMAT || 'A4',
  marginMm: parseInt(process.env.PDF_RENDER_MARGIN_MM, 10) || 20
};

function buildPdfOptions() {
  const margin = `${CONFIG.marginMm}mm`;
  return {
    format: CONFIG.format,
    printBackground: true,
    margin: {
      top: margin,
      bottom: margin,
      left: margin,
      right: margin
    }
  };
}

async function renderHtmlToPdf({ html, outputPath }) {
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
    await page.pdf({ path: outputPath, ...buildPdfOptions() });

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
