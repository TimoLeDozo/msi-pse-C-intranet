/**
 * XLSX Adapter
 * Role : extraire le texte d'un fichier Excel (.xlsx)
 *
 * Les fichiers XLSX sont des archives ZIP contenant des fichiers XML.
 * - xl/sharedStrings.xml : contient toutes les chaines de texte partagees
 * - xl/worksheets/sheet*.xml : contient les cellules et leurs references
 *
 * Pattern async conforme aux autres adapters du projet.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const PizZip = require('pizzip');

/**
 * Verifie si un chemin existe
 * @param {string} targetPath - Chemin a verifier
 * @returns {Promise<boolean>}
 */
async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

class XlsxAdapter {
  /**
   * Extrait le texte d'un fichier XLSX
   * @param {string} xlsxPath - Chemin absolu vers le fichier .xlsx
   * @returns {Promise<string|null>} Texte extrait ou null si echec
   */
  async extract(xlsxPath) {
    if (!xlsxPath || !await pathExists(xlsxPath)) {
      console.warn(`[XLSX] Fichier introuvable : ${xlsxPath}`);
      return null;
    }

    try {
      const content = await fsp.readFile(xlsxPath);
      const zip = new PizZip(content);

      // 1. Charger les chaines partagees (sharedStrings.xml)
      const sharedStrings = this.loadSharedStrings(zip);

      // 2. Charger les noms des feuilles depuis workbook.xml
      const sheetNames = this.loadSheetNames(zip);

      // 3. Extraire le contenu de chaque feuille
      const sheetFiles = Object.keys(zip.files)
        .filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
        .sort((a, b) => {
          const numA = parseInt(a.match(/sheet(\d+)\.xml$/)[1], 10);
          const numB = parseInt(b.match(/sheet(\d+)\.xml$/)[1], 10);
          return numA - numB;
        });

      if (sheetFiles.length === 0) {
        console.warn('[XLSX] Aucune feuille trouvee dans le fichier');
        return null;
      }

      const textParts = [];

      for (let i = 0; i < sheetFiles.length; i++) {
        const sheetFile = sheetFiles[i];
        const sheetXml = zip.file(sheetFile).asText();
        const sheetText = this.extractSheetText(sheetXml, sharedStrings);

        if (sheetText.trim()) {
          const sheetName = sheetNames[i] || `Feuille ${i + 1}`;
          textParts.push(`[${sheetName}]\n${sheetText}`);
        }
      }

      return textParts.join('\n\n').trim() || null;

    } catch (error) {
      console.warn(`[XLSX] Erreur extraction : ${error.message}`);
      return null;
    }
  }

  /**
   * Charge les chaines partagees depuis sharedStrings.xml
   * @param {PizZip} zip - Archive ZIP du XLSX
   * @returns {string[]} Tableau des chaines indexees
   */
  loadSharedStrings(zip) {
    const ssFile = zip.file('xl/sharedStrings.xml');
    if (!ssFile) return [];

    const xml = ssFile.asText();
    const strings = [];

    // Pattern pour extraire les chaines <si><t>...</t></si>
    // Gere aussi les chaines avec formatage <si><r><t>...</t></r></si>
    const siMatches = xml.match(/<si>[\s\S]*?<\/si>/g) || [];

    for (const si of siMatches) {
      // Extraire tous les <t>...</t> dans ce <si>
      const tMatches = si.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
      const text = tMatches
        .map(t => t.replace(/<t[^>]*>|<\/t>/g, ''))
        .join('');
      strings.push(text);
    }

    return strings;
  }

  /**
   * Charge les noms des feuilles depuis workbook.xml
   * @param {PizZip} zip - Archive ZIP du XLSX
   * @returns {string[]} Tableau des noms de feuilles
   */
  loadSheetNames(zip) {
    const wbFile = zip.file('xl/workbook.xml');
    if (!wbFile) return [];

    const xml = wbFile.asText();
    const names = [];

    // Pattern pour extraire les noms : <sheet name="..." .../>
    const sheetMatches = xml.match(/<sheet[^>]+name="([^"]+)"[^>]*\/>/g) || [];

    for (const sheet of sheetMatches) {
      const nameMatch = sheet.match(/name="([^"]+)"/);
      if (nameMatch) {
        names.push(nameMatch[1]);
      }
    }

    return names;
  }

  /**
   * Extrait le texte d'une feuille de calcul
   * @param {string} xml - Contenu XML de la feuille
   * @param {string[]} sharedStrings - Chaines partagees
   * @returns {string} Texte extrait, organise par lignes
   */
  extractSheetText(xml, sharedStrings) {
    if (!xml) return '';

    const rows = [];

    // Extraire chaque ligne <row>...</row>
    const rowMatches = xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [];

    for (const rowXml of rowMatches) {
      const cells = this.extractRowCells(rowXml, sharedStrings);
      if (cells.length > 0) {
        rows.push(cells.join('\t'));
      }
    }

    return rows.join('\n');
  }

  /**
   * Extrait les cellules d'une ligne
   * @param {string} rowXml - XML de la ligne
   * @param {string[]} sharedStrings - Chaines partagees
   * @returns {string[]} Valeurs des cellules
   */
  extractRowCells(rowXml, sharedStrings) {
    const cells = [];

    // Extraire chaque cellule <c>...</c>
    const cellMatches = rowXml.match(/<c[^>]*>[\s\S]*?<\/c>|<c[^>]*\/>/g) || [];

    for (const cellXml of cellMatches) {
      const value = this.extractCellValue(cellXml, sharedStrings);
      cells.push(value);
    }

    // Supprimer les cellules vides en fin de ligne
    while (cells.length > 0 && cells[cells.length - 1] === '') {
      cells.pop();
    }

    return cells;
  }

  /**
   * Extrait la valeur d'une cellule
   * @param {string} cellXml - XML de la cellule
   * @param {string[]} sharedStrings - Chaines partagees
   * @returns {string} Valeur de la cellule
   */
  extractCellValue(cellXml, sharedStrings) {
    // Verifier le type de cellule (t="s" = shared string, t="inlineStr" = inline)
    const typeMatch = cellXml.match(/\st="([^"]+)"/);
    const type = typeMatch ? typeMatch[1] : null;

    // Extraire la valeur <v>...</v>
    const vMatch = cellXml.match(/<v>([^<]*)<\/v>/);

    if (!vMatch) {
      // Verifier si c'est une chaine inline <is><t>...</t></is>
      const isMatch = cellXml.match(/<is>[\s\S]*?<t[^>]*>([^<]*)<\/t>[\s\S]*?<\/is>/);
      return isMatch ? isMatch[1] : '';
    }

    const rawValue = vMatch[1];

    if (type === 's') {
      // Shared string : l'index pointe vers sharedStrings
      const index = parseInt(rawValue, 10);
      return sharedStrings[index] || '';
    }

    // Valeur numerique ou autre
    return rawValue;
  }

  /**
   * Extrait le texte et retourne des metadonnees
   * @param {string} xlsxPath - Chemin absolu vers le fichier .xlsx
   * @returns {Promise<Object|null>} Objet avec texte et metadonnees
   */
  async extractWithMetadata(xlsxPath) {
    if (!xlsxPath || !await pathExists(xlsxPath)) {
      return null;
    }

    try {
      const content = await fsp.readFile(xlsxPath);
      const zip = new PizZip(content);

      const sheetNames = this.loadSheetNames(zip);
      const text = await this.extract(xlsxPath);
      const stats = await fsp.stat(xlsxPath);

      return {
        text,
        metadata: {
          filename: path.basename(xlsxPath),
          sheetCount: sheetNames.length,
          sheetNames,
          fileSize: stats.size,
          extractedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.warn(`[XLSX] Erreur extraction metadata : ${error.message}`);
      return null;
    }
  }

  /**
   * Extrait uniquement une feuille specifique par nom ou index
   * @param {string} xlsxPath - Chemin absolu vers le fichier .xlsx
   * @param {string|number} sheetIdentifier - Nom ou index (0-based) de la feuille
   * @returns {Promise<string|null>} Texte de la feuille ou null
   */
  async extractSheet(xlsxPath, sheetIdentifier) {
    if (!xlsxPath || !await pathExists(xlsxPath)) {
      return null;
    }

    try {
      const content = await fsp.readFile(xlsxPath);
      const zip = new PizZip(content);

      const sharedStrings = this.loadSharedStrings(zip);
      const sheetNames = this.loadSheetNames(zip);

      // Determiner l'index de la feuille
      let sheetIndex;
      if (typeof sheetIdentifier === 'number') {
        sheetIndex = sheetIdentifier;
      } else {
        sheetIndex = sheetNames.findIndex(
          name => name.toLowerCase() === sheetIdentifier.toLowerCase()
        );
      }

      if (sheetIndex < 0 || sheetIndex >= sheetNames.length) {
        console.warn(`[XLSX] Feuille non trouvee : ${sheetIdentifier}`);
        return null;
      }

      const sheetFile = `xl/worksheets/sheet${sheetIndex + 1}.xml`;
      const sheetZipFile = zip.file(sheetFile);

      if (!sheetZipFile) {
        console.warn(`[XLSX] Fichier feuille non trouve : ${sheetFile}`);
        return null;
      }

      const sheetXml = sheetZipFile.asText();
      return this.extractSheetText(sheetXml, sharedStrings);

    } catch (error) {
      console.warn(`[XLSX] Erreur extraction feuille : ${error.message}`);
      return null;
    }
  }
}

module.exports = new XlsxAdapter();
