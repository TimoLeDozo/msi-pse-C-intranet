/**
 * File Adapter
 * Role: Expose generated files (DOCX / PDF) and manage structured archiving
 *
 * Archive structure: out/{Nom_Client}/{Date_Projet}/
 * - proposal.docx
 * - proposal.pdf
 * - metadata.json
 *
 * Adapter designed for:
 * - Local storage today
 * - Clear abstraction for intranet deployment tomorrow
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const {
  sanitizeFileName,
  formatDateForPath,
  buildArchivePath,
  ensureDirectory,
  pathExists,
  getUniqueFilePath
} = require('../../utils/path.util.js');

const STORAGE_DIR = path.join(__dirname, '../../storage/outputs');

/**
 * Public URL base (simulated for local Node)
 * In intranet: replaced by a secured endpoint
 */
const BASE_URL = process.env.FILE_BASE_URL || 'http://localhost:3000/files';

class FileAdapter {
  constructor() {
    this.storageDir = STORAGE_DIR;
  }

  async ensureStorageDir() {
    await ensureDirectory(this.storageDir);
  }

  /**
   * Verify that the file belongs to the authorized storage
   * @param {string} filePath - Path to verify
   * @returns {boolean} True if path is within allowed storage
   */
  isAllowedPath(filePath) {
    const resolved = path.resolve(filePath);
    return resolved.startsWith(path.resolve(this.storageDir));
  }

  /**
   * Expose a file via a controlled URL
   * @param {string} filePath - Absolute path to the file
   * @returns {Promise<string>} Public URL
   */
  async expose(filePath) {
    await this.ensureStorageDir();
    if (!filePath || !await pathExists(filePath)) {
      throw new Error('Fichier introuvable');
    }

    if (!this.isAllowedPath(filePath)) {
      throw new Error('Acces fichier interdit');
    }

    // Build relative path from storage dir for URL
    const relativePath = path.relative(this.storageDir, filePath);
    // Encode each path segment for URL safety
    const encodedPath = relativePath
      .split(path.sep)
      .map(segment => encodeURIComponent(segment))
      .join('/');

    return `${BASE_URL}/${encodedPath}`;
  }

  /**
   * Create a structured archive directory for a client/project
   * Structure: out/{Nom_Client}/{Date_Projet}/
   *
   * @param {Object} params - Archive parameters
   * @param {string} params.clientName - Client/company name
   * @param {Date} [params.projectDate] - Project date (defaults to now)
   * @returns {Promise<string>} Absolute path to the archive directory
   */
  async createArchiveDir({ clientName, projectDate }) {
    if (!clientName) {
      throw new Error('Nom client requis pour l\'archivage');
    }

    const archivePath = buildArchivePath({
      baseDir: this.storageDir,
      clientName,
      projectDate: projectDate || new Date()
    });

    await ensureDirectory(archivePath);
    return archivePath;
  }

  /**
   * Get the archive path for saving a document
   * Returns a unique path to avoid overwriting existing files
   *
   * @param {Object} params - Parameters
   * @param {string} params.archiveDir - Archive directory path
   * @param {string} params.baseName - Base filename (e.g., 'proposal')
   * @param {string} params.extension - Extension with dot (e.g., '.docx')
   * @returns {Promise<string>} Full path for the file
   */
  async getArchiveFilePath({ archiveDir, baseName, extension }) {
    return getUniqueFilePath(archiveDir, baseName, extension);
  }

  /**
   * Save metadata for the archived documents
   *
   * @param {Object} params - Parameters
   * @param {string} params.archiveDir - Archive directory path
   * @param {Object} params.metadata - Metadata to save
   * @returns {Promise<string>} Path to the metadata file
   */
  async saveMetadata({ archiveDir, metadata }) {
    const metadataPath = path.join(archiveDir, 'metadata.json');

    const fullMetadata = {
      ...metadata,
      archivedAt: new Date().toISOString(),
      archiveVersion: '1.0'
    };

    await fsp.writeFile(
      metadataPath,
      JSON.stringify(fullMetadata, null, 2),
      'utf8'
    );

    return metadataPath;
  }

  /**
   * Read metadata from an archive directory
   *
   * @param {string} archiveDir - Archive directory path
   * @returns {Promise<Object|null>} Metadata object or null if not found
   */
  async readMetadata(archiveDir) {
    const metadataPath = path.join(archiveDir, 'metadata.json');

    if (!await pathExists(metadataPath)) {
      return null;
    }

    try {
      const content = await fsp.readFile(metadataPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to read metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * List all archives for a specific client
   *
   * @param {string} clientName - Client name
   * @returns {Promise<Array<{date: string, path: string}>>} List of archives
   */
  async listClientArchives(clientName) {
    const sanitizedClient = sanitizeFileName(clientName);
    const clientDir = path.join(this.storageDir, sanitizedClient);

    if (!await pathExists(clientDir)) {
      return [];
    }

    try {
      const entries = await fsp.readdir(clientDir, { withFileTypes: true });
      const archives = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          archives.push({
            date: entry.name,
            path: path.join(clientDir, entry.name)
          });
        }
      }

      // Sort by date descending (most recent first)
      return archives.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.warn(`Failed to list archives: ${error.message}`);
      return [];
    }
  }

  /**
   * Copy a file to the archive directory with a standard name
   *
   * @param {Object} params - Parameters
   * @param {string} params.sourcePath - Source file path
   * @param {string} params.archiveDir - Target archive directory
   * @param {string} params.targetName - Target filename (e.g., 'proposal.docx')
   * @returns {Promise<string>} Path to the copied file
   */
  async copyToArchive({ sourcePath, archiveDir, targetName }) {
    if (!await pathExists(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const targetPath = path.join(archiveDir, targetName);
    await fsp.copyFile(sourcePath, targetPath);

    return targetPath;
  }

  /**
   * Utility: delete a file
   * @param {string} filePath - Path to the file to delete
   */
  async remove(filePath) {
    if (this.isAllowedPath(filePath) && await pathExists(filePath)) {
      await fsp.unlink(filePath);
    }
  }

  /**
   * Utility: delete an entire archive directory
   * @param {string} archiveDir - Archive directory to remove
   */
  async removeArchive(archiveDir) {
    if (this.isAllowedPath(archiveDir) && await pathExists(archiveDir)) {
      await fsp.rm(archiveDir, { recursive: true });
    }
  }

  /**
   * Get the storage directory path (for external adapters)
   * @returns {string} Storage directory path
   */
  getStorageDir() {
    return this.storageDir;
  }
}

module.exports = new FileAdapter();
