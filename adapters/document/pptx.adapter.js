/**
 * PPTX Adapter
 * Role : extraire le texte d'un fichier PowerPoint (.pptx)
 *
 * Les fichiers PPTX sont des archives ZIP contenant des fichiers XML.
 * Le texte des slides se trouve dans ppt/slides/slide*.xml
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

class PptxAdapter {
  /**
   * Extrait le texte d'un fichier PPTX
   * @param {string} pptxPath - Chemin absolu vers le fichier .pptx
   * @returns {Promise<string|null>} Texte extrait ou null si echec
   */
  async extract(pptxPath) {
    if (!pptxPath || !await pathExists(pptxPath)) {
      console.warn(`[PPTX] Fichier introuvable : ${pptxPath}`);
      return null;
    }

    try {
      const content = await fsp.readFile(pptxPath);
      const zip = new PizZip(content);

      // Recuperer tous les fichiers slide*.xml
      const slideFiles = Object.keys(zip.files)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
          // Trier par numero de slide
          const numA = parseInt(a.match(/slide(\d+)\.xml$/)[1], 10);
          const numB = parseInt(b.match(/slide(\d+)\.xml$/)[1], 10);
          return numA - numB;
        });

      if (slideFiles.length === 0) {
        console.warn('[PPTX] Aucun slide trouve dans le fichier');
        return null;
      }

      const textParts = [];

      for (const slideFile of slideFiles) {
        const slideXml = zip.file(slideFile).asText();
        const slideText = this.extractTextFromXml(slideXml);

        if (slideText.trim()) {
          const slideNum = slideFile.match(/slide(\d+)\.xml$/)[1];
          textParts.push(`[Slide ${slideNum}]\n${slideText}`);
        }
      }

      // Extraire aussi les notes du presentateur si disponibles
      const notesText = this.extractNotes(zip);
      if (notesText) {
        textParts.push(`\n[Notes du presentateur]\n${notesText}`);
      }

      return textParts.join('\n\n').trim() || null;

    } catch (error) {
      console.warn(`[PPTX] Erreur extraction : ${error.message}`);
      return null;
    }
  }

  /**
   * Extrait le texte brut d'un contenu XML PowerPoint
   * Les textes sont dans les balises <a:t>...</a:t>
   * @param {string} xml - Contenu XML du slide
   * @returns {string} Texte extrait
   */
  extractTextFromXml(xml) {
    if (!xml) return '';

    // Pattern pour extraire le texte des balises <a:t>
    const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];

    const texts = textMatches.map(match => {
      const content = match.replace(/<\/?a:t>/g, '');
      return content;
    });

    // Regrouper les textes par paragraphe (heuristique basee sur les balises <a:p>)
    // Simplification : joindre avec espace, puis normaliser
    let result = texts.join(' ');

    // Nettoyer les espaces multiples
    result = result.replace(/\s+/g, ' ').trim();

    // Ajouter des retours a la ligne pour les elements de liste
    // (heuristique basee sur les patterns courants)
    result = result.replace(/\s*([•\-\*])\s*/g, '\n$1 ');

    return result;
  }

  /**
   * Extrait les notes du presentateur
   * @param {PizZip} zip - Archive ZIP du PPTX
   * @returns {string|null} Notes extraites ou null
   */
  extractNotes(zip) {
    const notesFiles = Object.keys(zip.files)
      .filter(name => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/notesSlide(\d+)\.xml$/)[1], 10);
        const numB = parseInt(b.match(/notesSlide(\d+)\.xml$/)[1], 10);
        return numA - numB;
      });

    if (notesFiles.length === 0) return null;

    const notesParts = [];

    for (const notesFile of notesFiles) {
      const notesXml = zip.file(notesFile).asText();
      const notesText = this.extractTextFromXml(notesXml);

      if (notesText.trim()) {
        const slideNum = notesFile.match(/notesSlide(\d+)\.xml$/)[1];
        notesParts.push(`Slide ${slideNum}: ${notesText}`);
      }
    }

    return notesParts.length > 0 ? notesParts.join('\n') : null;
  }

  /**
   * Extrait le texte et retourne des metadonnees
   * @param {string} pptxPath - Chemin absolu vers le fichier .pptx
   * @returns {Promise<Object|null>} Objet avec texte et metadonnees
   */
  async extractWithMetadata(pptxPath) {
    if (!pptxPath || !await pathExists(pptxPath)) {
      return null;
    }

    try {
      const content = await fsp.readFile(pptxPath);
      const zip = new PizZip(content);

      const slideFiles = Object.keys(zip.files)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));

      const text = await this.extract(pptxPath);
      const stats = await fsp.stat(pptxPath);

      return {
        text,
        metadata: {
          filename: path.basename(pptxPath),
          slideCount: slideFiles.length,
          fileSize: stats.size,
          extractedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.warn(`[PPTX] Erreur extraction metadata : ${error.message}`);
      return null;
    }
  }
}

module.exports = new PptxAdapter();
