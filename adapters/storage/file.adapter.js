/**
 * File Adapter
 * Rôle : exposer des fichiers générés (DOCX / PDF)
 *
 * Adapter volontairement minimal :
 * - stockage local aujourd’hui
 * - abstraction claire pour intranet demain
 */

const path = require('path');
const fs = require('fs');

const STORAGE_DIR = path.join(__dirname, '../../storage/outputs');

/**
 * URL publique simulée (Node local)
 * En intranet : remplacé par un endpoint sécurisé
 */
const BASE_URL = process.env.FILE_BASE_URL || 'http://localhost:3000/files';

class FileAdapter {
  constructor() {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Vérifie que le fichier appartient bien au storage autorisé
   */
  isAllowedPath(filePath) {
    const resolved = path.resolve(filePath);
    return resolved.startsWith(path.resolve(STORAGE_DIR));
  }

  /**
   * Expose un fichier via une URL contrôlée
   * @param {string} filePath
   * @returns {string} URL publique
   */
  expose(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Fichier introuvable');
    }

    if (!this.isAllowedPath(filePath)) {
      throw new Error('Accès fichier interdit');
    }

    const fileName = path.basename(filePath);
    return `${BASE_URL}/${encodeURIComponent(fileName)}`;
  }

  /**
   * Utilitaire futur : suppression / archivage
   */
  remove(filePath) {
    if (this.isAllowedPath(filePath) && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = new FileAdapter();
