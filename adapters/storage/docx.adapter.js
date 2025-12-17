/**
 * DOCX Adapter
 * Rôle : générer un document DOCX à partir d'un template et de placeholders
 *
 * Équivalent fonctionnel du moteur PlaceHolder Apps Script B2
 * (sans dépendance Google)
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const TEMPLATE_DIR = path.join(__dirname, '../../templates');
const OUTPUT_DIR = path.join(__dirname, '../../storage/outputs');

class DocxAdapter {
  constructor() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  }

  /**
   * Génération DOCX
   * @param {Object} params
   * @param {string} params.templateName
   * @param {Object} params.data
   * @returns {Promise<string>} chemin du DOCX généré
   */
  async generate({ templateName, data }) {
    const templatePath = path.join(TEMPLATE_DIR, templateName);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template introuvable : ${templateName}`);
    }

    // 1. Lecture du template
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // 2. Préparation des données (clean B2-like)
    const sanitizedData = this.sanitizeData(data);

    // 3. Injection placeholders
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '—'
    });

    try {
      doc.setData(sanitizedData);
      doc.render();
    } catch (error) {
      throw new Error(`Erreur DOCX render : ${error.message}`);
    }

    // 4. Export buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // 5. Écriture fichier
    const outputName = `propale_${Date.now()}.docx`;
    const outputPath = path.join(OUTPUT_DIR, outputName);
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  }

  /**
   * Nettoyage & normalisation des données
   * (aligné comportement Apps Script B2)
   */
  sanitizeData(rawData) {
    const sanitized = {};

    for (const [key, value] of Object.entries(rawData)) {
      if (value === null || value === undefined) {
        sanitized[key] = '';
        continue;
      }

      if (typeof value === 'string') {
        sanitized[key] = this.cleanText(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Nettoyage texte pour Word
   * - supprime Markdown léger
   * - normalise retours ligne
   */
  cleanText(text) {
    if (!text) return '';

    return text
      // listes markdown
      .replace(/^\s*[-*]\s+/gm, '• ')
      // gras / italique
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      // retours ligne Word-friendly
      .replace(/\n{2,}/g, '\n\n')
      .replace(/\n/g, '\n');
  }
}

module.exports = new DocxAdapter();
