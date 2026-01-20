/**
 * DOCX Adapter
 * Rôle : générer un document DOCX à partir d'un template et de placeholders
 *
 * Équivalent fonctionnel du moteur PlaceHolder Apps Script B2
 * (sans dépendance Google)
 *
 * Enhancements (Phase 3 - CLAUDE.md):
 * - cleanResidualPlaceholders: Remove unreplaced {{...}} placeholders
 * - Advanced Markdown cleanup (headers, code blocks, inline code)
 * - generateWithFinance: Merge financial data with template data
 *
 * Media Management (Phase 4):
 * - insertImage: Insert image into DOCX (PNG, JPG support)
 * - replaceImagePlaceholder: Replace {{IMG_xxx}} placeholders with actual images
 * - generateWithImages: Generate DOCX with embedded images
 *
 * Fragmented Placeholders Fix (Phase 4.1):
 * - defragmentPlaceholders: Merge XML runs to reconstruct {{...}} tags split by Word
 * - Pre-process template XML before Docxtemplater parsing
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { formatCurrency } = require('../../services/cost.service.js');
const imageUtil = require('../../utils/image.util.js');

const TEMPLATE_DIR = path.join(__dirname, '../../templates');
const OUTPUT_DIR = path.join(__dirname, '../../storage/outputs');

// OOXML namespaces for DrawingML
const NAMESPACES = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture'
};

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

class DocxAdapter {
  async ensureOutputDir() {
    await fsp.mkdir(OUTPUT_DIR, { recursive: true });
  }

  /**
   * Defragment placeholders in XML content
   * Word often splits {{placeholder}} across multiple <w:t> elements.
   * This method merges adjacent text runs to reconstruct complete placeholders.
   *
   * Algorithm:
   * 1. Extract all <w:t> content preserving run boundaries
   * 2. Detect fragmented {{ ... }} patterns spanning multiple runs
   * 3. Merge the text content into a single <w:t> element
   * 4. Remove the now-empty sibling runs
   *
   * @param {string} xml - Raw XML content from document.xml or similar
   * @returns {string} XML with defragmented placeholders
   */
  defragmentPlaceholders(xml) {
    if (!xml || typeof xml !== 'string') return xml || '';

    // Strategy: Find sequences of <w:r> elements that together form a placeholder
    // We'll use a state machine approach to track open {{ and closing }}

    // First, let's identify paragraph boundaries to scope our search
    const paragraphPattern = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;

    return xml.replace(paragraphPattern, (paragraph) => {
      return this._defragmentParagraph(paragraph);
    });
  }

  /**
   * Defragment placeholders within a single paragraph
   * @param {string} paragraph - A single <w:p>...</w:p> element
   * @returns {string} Paragraph with merged placeholder runs
   */
  _defragmentParagraph(paragraph) {
    // Extract all text content to find placeholders
    const textPattern = /<w:t(?=[\s>])[^>]*>([\s\S]*?)<\/w:t>/g;
    const texts = [];
    let match;

    while ((match = textPattern.exec(paragraph)) !== null) {
      const openTagMatch = match[0].match(/^<w:t[^>]*>/);
      const openTag = openTagMatch ? openTagMatch[0] : '<w:t>';
      texts.push({
        fullMatch: match[0],
        content: match[1],
        originalLength: match[1].length,
        index: match.index,
        start: match.index,
        end: match.index + match[0].length,
        openTag
      });
    }

    if (texts.length === 0) return paragraph;

    // Build combined text to find placeholder boundaries
    const combined = texts.map(t => t.content).join('');

    // Find all placeholder positions in combined text
    const placeholderPattern = /\{\{[^}]*\}\}/g;
    const placeholders = [];
    let pMatch;

    while ((pMatch = placeholderPattern.exec(combined)) !== null) {
      placeholders.push({
        start: pMatch.index,
        end: pMatch.index + pMatch[0].length,
        text: pMatch[0]
      });
    }

    if (placeholders.length === 0) return paragraph;

    // Map character positions to text node indices
    let charPos = 0;
    const charToNode = [];

    for (let i = 0; i < texts.length; i++) {
      for (let j = 0; j < texts[i].content.length; j++) {
        charToNode[charPos++] = i;
      }
    }

    // Check if any placeholder spans multiple nodes (fragmented)
    const fragmentedPlaceholders = placeholders.filter(p => {
      const startNode = charToNode[p.start];
      const endNode = charToNode[p.end - 1];
      return startNode !== endNode;
    });

    if (fragmentedPlaceholders.length === 0) return paragraph;

    // For fragmented placeholders, we need to merge the runs
    // Strategy: Replace the content of the first run with the complete placeholder,
    // and clear the content of subsequent runs that were part of the fragment

    let modified = false;

    // Process in reverse order to maintain string positions
    for (let i = fragmentedPlaceholders.length - 1; i >= 0; i--) {
      const fp = fragmentedPlaceholders[i];
      const startNode = charToNode[fp.start];
      const endNode = charToNode[fp.end - 1];

      // Calculate position within first node
      let posBeforeStart = 0;
      for (let j = 0; j < startNode; j++) {
        posBeforeStart += texts[j].originalLength;
      }
      const offsetInFirstNode = fp.start - posBeforeStart;

      // Calculate position within last node
      let posBeforeEnd = 0;
      for (let j = 0; j < endNode; j++) {
        posBeforeEnd += texts[j].originalLength;
      }
      const offsetInLastNode = fp.end - posBeforeEnd;

      // Build new content for first node: prefix + complete placeholder
      const firstNodeContent = texts[startNode].content;
      const prefix = firstNodeContent.substring(0, offsetInFirstNode);
      const newFirstContent = prefix + fp.text;

      // Build new content for last node: suffix after placeholder
      const lastNodeContent = texts[endNode].content;
      const suffix = lastNodeContent.substring(offsetInLastNode);

      // Clear middle nodes completely, update first and last
      for (let j = startNode; j <= endNode; j++) {
        let newContent = '';

        if (j === startNode) {
          newContent = newFirstContent;
        } else if (j === endNode && endNode !== startNode) {
          newContent = suffix;
        }
        // Middle nodes get empty content

        texts[j].content = newContent;
        modified = true;
      }
    }

    if (!modified) return paragraph;

    let cursor = 0;
    const rebuilt = [];
    for (const node of texts) {
      rebuilt.push(paragraph.slice(cursor, node.start));
      // No escapeXml here because node.content comes from existing XML content which is already escaped
      rebuilt.push(`${node.openTag}${node.content}</w:t>`);
      cursor = node.end;
    }
    rebuilt.push(paragraph.slice(cursor));

    return rebuilt.join('');
  }

  /**
   * Escape special XML characters
   * @param {string} text - Text to escape
   * @returns {string} XML-safe text
   */
  _escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Pre-process a DOCX zip to defragment all placeholders
   * @param {PizZip} zip - PizZip instance containing DOCX content
   * @returns {PizZip} Modified zip with defragmented XML files
   */
  defragmentZip(zip) {
    const xmlFiles = zip.file(/word\/(document|header\d*|footer\d*)\.xml/);

    xmlFiles.forEach((file) => {
      const content = file.asText();
      const defragmented = this.defragmentPlaceholders(content);
      zip.file(file.name, defragmented);
    });

    return zip;
  }

  /**
   * Génération DOCX
   * @param {Object} params - Parameters for document generation
   * @param {string} params.templateName - Name of the template file in templates directory
   * @param {Object} params.data - Key-value pairs for placeholder replacement
   * @returns {Promise<string>} Absolute path to the generated DOCX file
   * @throws {Error} If template not found or render fails
   */
  async generate({ templateName, data }) {
    const templatePath = path.join(TEMPLATE_DIR, templateName);
    await this.ensureOutputDir();
    if (!await pathExists(templatePath)) {
      throw new Error(`Template introuvable : ${templateName}`);
    }

    // 1. Lecture du template
    const content = await fsp.readFile(templatePath, 'binary');
    const zip = new PizZip(content);
    this.defragmentZip(zip);

    // 2. Préparation des données (clean B2-like)
    const sanitizedData = this.sanitizeData(data);

    // 3. Injection placeholders
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '—',
      parser: (tag) => {
        const key = tag.trim();
        return {
          get: (scope) => (scope && Object.prototype.hasOwnProperty.call(scope, key) ? scope[key] : undefined)
        };
      }
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

    // 5. Post-process: Clean residual placeholders from the generated content
    const cleanedBuffer = this.cleanResidualPlaceholdersFromBuffer(buffer);

    // 6. Écriture fichier
    const outputName = `propale_${Date.now()}.docx`;
    const outputPath = path.join(OUTPUT_DIR, outputName);
    await fsp.writeFile(outputPath, cleanedBuffer);

    return outputPath;
  }

  /**
   * Génération DOCX avec données financières intégrées
   * Merges financial data (budget, echeancier, etc.) with template data
   *
   * @param {Object} params - Parameters for document generation
   * @param {string} params.templateName - Name of the template file
   * @param {Object} params.data - Base template data (placeholders)
   * @param {Object} params.financialData - Financial data to merge
   * @param {number} [params.financialData.budget] - Budget amount in euros
   * @param {Array<Object>} [params.financialData.echeancier] - Payment schedule array
   * @param {string} [params.financialData.echeancier[].phase] - Phase name
   * @param {number} [params.financialData.echeancier[].pourcentage] - Percentage
   * @param {number} [params.financialData.echeancier[].montant] - Amount in euros
   * @param {string} [params.financialData.budgetEnLettres] - Budget written in letters
   * @param {string} [params.financialData.DateDuJour] - Current date in French literal format
   * @returns {Promise<string>} Absolute path to the generated DOCX file
   */
  async generateWithFinance({ templateName, data, financialData }) {
    // Build merged data object
    const mergedData = { ...data };

    if (financialData) {
      // Add budget if provided
      if (financialData.budget !== undefined) {
        mergedData.budget = formatCurrency(financialData.budget);
      }

      // Format echeancier as bullet list string
      if (financialData.echeancier && Array.isArray(financialData.echeancier)) {
        mergedData.echeancier = this.formatEcheancier(financialData.echeancier);
      }

      // Add budget in letters
      if (financialData.budgetEnLettres) {
        mergedData.budgetEnLettres = financialData.budgetEnLettres;
      }

      // Add current date in French format
      if (financialData.DateDuJour) {
        mergedData.DateDuJour = financialData.DateDuJour;
      }
    }

    // Delegate to standard generate method
    return this.generate({ templateName, data: mergedData });
  }

  /**
   * Format payment schedule as bullet list string
   * @param {Array<Object>} echeancier - Array of payment phases
   * @returns {string} Formatted bullet list for Word insertion
   */
  formatEcheancier(echeancier) {
    if (!Array.isArray(echeancier) || echeancier.length === 0) {
      return '';
    }

    return echeancier
      .map(item => {
        const phase = item.phase || item.label || 'Phase';
        const pourcentage = item.pourcentage !== undefined ? `${item.pourcentage}%` : '';
        const montant = item.montant !== undefined ? formatCurrency(item.montant) : '';

        // Build line: "• Phase X : 30% - 6 000 €"
        let line = `• ${phase}`;
        if (pourcentage) line += ` : ${pourcentage}`;
        if (montant) line += ` - ${montant}`;

        return line;
      })
      .join('\n');
  }

  /**
   * Clean residual placeholders from text
   * Removes any {{...}} placeholders that weren't replaced during rendering
   *
   * @param {string} text - Text potentially containing unreplaced placeholders
   * @returns {string} Text with all {{...}} patterns removed
   */
  cleanResidualPlaceholders(text) {
    if (!text || typeof text !== 'string') return text || '';
    return text.replace(/\{\{.*?\}\}/g, '');
  }

  /**
   * Clean residual placeholders from DOCX buffer
   * Processes the document.xml inside the DOCX to remove unreplaced placeholders
   *
   * @param {Buffer} buffer - DOCX file buffer
   * @returns {Buffer} Cleaned DOCX buffer
   */
  cleanResidualPlaceholdersFromBuffer(buffer) {
    try {
      const zip = new PizZip(buffer);
      const xmlFiles = zip.file(/word\/.*\.xml/);
      xmlFiles.forEach((file) => {
        const content = this.cleanResidualPlaceholders(file.asText());
        zip.file(file.name, content);
      });

      return zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
    } catch (error) {
      // If cleaning fails, return original buffer
      console.warn('Warning: Could not clean residual placeholders:', error.message);
      return buffer;
    }
  }

  /**
   * Nettoyage & normalisation des données
   * (aligné comportement Apps Script B2)
   *
   * @param {Object} rawData - Raw data object with placeholder values
   * @returns {Object} Sanitized data with cleaned text values
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
   * Handles advanced Markdown cleanup:
   * - Headers (# ## ###) -> remove markers, keep text
   * - Bold (**text**) -> keep text
   * - Italic (*text*) -> keep text
   * - Code blocks (```...```) -> remove markers
   * - Inline code (`code`) -> keep text, remove backticks
   * - Lists (- or *) -> convert to bullet points
   * - Normalizes line breaks for Word compatibility
   *
   * @param {string} text - Text with potential Markdown formatting
   * @returns {string} Cleaned text suitable for Word document
   */
  cleanText(text) {
    if (!text) return '';

    return text
      // Code blocks (```language ... ```) - must be processed before other patterns
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
      // Inline code (`code`) - remove backticks, keep content
      .replace(/`([^`]+)`/g, '$1')
      // Headers (# ## ### etc.) - remove markers at line start, keep text
      .replace(/^#{1,6}\s+(.*)$/gm, '$1')
      // Listes markdown (- or * at line start)
      .replace(/^\s*[-*]\s+/gm, '• ')
      // Bold (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      // Italic (*text* or _text_) - single markers
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Horizontal rules (--- or ***)
      .replace(/^[-*]{3,}$/gm, '')
      // Blockquotes (> at line start)
      .replace(/^\s*>\s?/gm, '')
      // Links [text](url) -> keep text only
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Images ![alt](url) -> remove entirely
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Retours ligne Word-friendly - normalize multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim trailing whitespace per line
      .replace(/[ \t]+$/gm, '')
      // Final trim
      .trim();
  }
}

module.exports = new DocxAdapter();
