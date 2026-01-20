/**
 * Path Utilities
 * Role: Handle path sanitization and structured archive directory creation
 *
 * Supports the archive structure: out/{Nom_Client}/{Date_Projet}/
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

/**
 * Sanitize a string for use as a directory/file name
 * - Removes or replaces special characters
 * - Handles accented characters
 * - Replaces spaces with underscores
 * - Limits length to avoid filesystem issues
 *
 * @param {string} name - Raw name to sanitize
 * @param {Object} [options] - Sanitization options
 * @param {number} [options.maxLength=100] - Maximum length of the result
 * @param {string} [options.replacement='_'] - Character to replace invalid chars
 * @returns {string} Sanitized name safe for filesystem
 */
function sanitizeFileName(name, options = {}) {
  const { maxLength = 100, replacement = '_' } = options;

  if (!name || typeof name !== 'string') {
    return 'unknown';
  }

  // Normalize unicode (NFD decomposition then remove diacritics)
  let sanitized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics

  // Replace common problematic characters
  sanitized = sanitized
    // Replace path separators and special chars
    .replace(/[<>:"/\\|?*'\u2019]/g, replacement)
    // Replace control characters
    .replace(/[\x00-\x1f\x7f]/g, '')
    // Replace multiple spaces/underscores with single
    .replace(/\s+/g, replacement)
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores and dots
    .replace(/^[_.\s]+|[_.\s]+$/g, '');

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).replace(/_+$/, '');
  }

  // Fallback if empty after sanitization
  return sanitized || 'unknown';
}

/**
 * Format a date as YYYY-MM-DD
 *
 * @param {Date} [date] - Date to format (defaults to now)
 * @returns {string} Formatted date string
 */
function formatDateForPath(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return formatDateForPath(new Date()); // Fallback to current date
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Build the archive directory path for a client/project
 * Structure: {baseDir}/{Nom_Client}/{Date_Projet}/
 *
 * @param {Object} params - Parameters
 * @param {string} params.baseDir - Base output directory
 * @param {string} params.clientName - Client/company name
 * @param {Date} [params.projectDate] - Project date (defaults to now)
 * @returns {string} Full path to the archive directory
 */
function buildArchivePath({ baseDir, clientName, projectDate }) {
  const sanitizedClient = sanitizeFileName(clientName);
  const dateStr = formatDateForPath(projectDate);

  return path.join(baseDir, sanitizedClient, dateStr);
}

/**
 * Ensure a directory exists, creating it recursively if needed
 *
 * @param {string} dirPath - Directory path to ensure
 * @returns {Promise<void>}
 */
async function ensureDirectory(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

/**
 * Check if a path exists
 *
 * @param {string} targetPath - Path to check
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

/**
 * Generate a unique filename if the target already exists
 * Appends _1, _2, etc. before the extension
 *
 * @param {string} dirPath - Directory path
 * @param {string} baseName - Base filename (e.g., 'proposal')
 * @param {string} extension - File extension with dot (e.g., '.docx')
 * @returns {Promise<string>} Full path to a unique filename
 */
async function getUniqueFilePath(dirPath, baseName, extension) {
  let candidate = path.join(dirPath, `${baseName}${extension}`);
  let counter = 1;

  while (await pathExists(candidate)) {
    candidate = path.join(dirPath, `${baseName}_${counter}${extension}`);
    counter++;

    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Cannot generate unique filename after 1000 attempts');
    }
  }

  return candidate;
}

module.exports = {
  sanitizeFileName,
  formatDateForPath,
  buildArchivePath,
  ensureDirectory,
  pathExists,
  getUniqueFilePath
};
