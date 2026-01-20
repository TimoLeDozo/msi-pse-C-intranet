/**
 * PDF Converter Service
 *
 * Robust DOCX to PDF conversion using LibreOffice headless mode
 * with timeout, retry logic, and proper cleanup
 *
 * Features:
 * - Direct LibreOffice CLI invocation (more stable than wrappers)
 * - Configurable timeout (default 30s)
 * - Automatic retry with exponential backoff
 * - Temporary file cleanup
 * - Process isolation and cleanup
 */

const { spawn } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

// Configuration from environment or defaults
const CONFIG = {
  libreOfficePath: process.env.LIBREOFFICE_PATH || 'soffice',
  timeout: parseInt(process.env.LIBREOFFICE_TIMEOUT, 10) || 30000,
  tempDir: process.env.LIBREOFFICE_TEMP_DIR || path.join(__dirname, '../storage/temp'),
  maxRetries: parseInt(process.env.LIBREOFFICE_MAX_RETRIES, 10) || 2,
  retryDelay: 1000
};

/**
 * Generate a unique temporary directory name
 * @returns {string} Unique directory path
 */
function generateTempDirName() {
  const uniqueId = crypto.randomBytes(8).toString('hex');
  return path.join(CONFIG.tempDir, `convert_${uniqueId}`);
}

/**
 * Ensure a directory exists
 * @param {string} dirPath - Directory path to create
 */
async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

/**
 * Remove a directory and its contents
 * @param {string} dirPath - Directory to remove
 */
async function cleanupDir(dirPath) {
  try {
    await fsp.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.warn(`[PDF-Converter] Cleanup warning: ${err.message}`);
  }
}

/**
 * Copy file to a new location
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 */
async function copyFile(src, dest) {
  await fsp.copyFile(src, dest);
}

/**
 * Execute LibreOffice conversion with timeout
 * @param {string} inputPath - Input DOCX file path
 * @param {string} outputDir - Output directory for PDF
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} Path to generated PDF
 */
function executeConversion(inputPath, outputDir, timeout) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless',
      '--invisible',
      '--nodefault',
      '--nofirststartwizard',
      '--nolockcheck',
      '--nologo',
      '--norestore',
      '--convert-to', 'pdf',
      '--outdir', outputDir,
      inputPath
    ];

    const proc = spawn(CONFIG.libreOfficePath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeout
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`LibreOffice conversion timeout after ${timeout}ms`));
    }, timeout);

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`LibreOffice spawn error: ${err.message}`));
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        // Find the generated PDF file
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const pdfPath = path.join(outputDir, `${baseName}.pdf`);
        resolve(pdfPath);
      } else {
        reject(new Error(`LibreOffice exited with code ${code}: ${stderr || stdout}`));
      }
    });
  });
}

/**
 * Wait for a file to exist (LibreOffice may finish before file is flushed)
 * @param {string} filePath - File path to check
 * @param {number} maxWait - Maximum wait time in ms
 * @returns {Promise<boolean>} True if file exists
 */
async function waitForFile(filePath, maxWait = 5000) {
  const startTime = Date.now();
  const checkInterval = 100;

  while (Date.now() - startTime < maxWait) {
    try {
      await fsp.access(filePath, fs.constants.F_OK);
      // Verify file has content
      const stats = await fsp.stat(filePath);
      if (stats.size > 0) {
        return true;
      }
    } catch (_) {
      // File not ready yet
    }
    await new Promise(r => setTimeout(r, checkInterval));
  }
  return false;
}

/**
 * Convert DOCX to PDF with retry logic
 *
 * @param {string} docxPath - Absolute path to the DOCX file
 * @param {Object} options - Conversion options
 * @param {string} [options.outputDir] - Output directory for PDF (default: same as input)
 * @param {string} [options.outputName] - Custom output filename (without extension)
 * @param {number} [options.timeout] - Timeout in ms (default: from config)
 * @param {number} [options.retries] - Number of retries (default: from config)
 * @returns {Promise<{success: boolean, pdfPath: string|null, error: string|null, duration: number}>}
 */
async function convertToPdf(docxPath, options = {}) {
  const startTime = Date.now();
  const timeout = options.timeout || CONFIG.timeout;
  const maxRetries = options.retries ?? CONFIG.maxRetries;
  const outputDir = options.outputDir || path.dirname(docxPath);

  // Validate input file exists
  try {
    await fsp.access(docxPath, fs.constants.R_OK);
  } catch (_) {
    return {
      success: false,
      pdfPath: null,
      error: `Input file not found or not readable: ${docxPath}`,
      duration: Date.now() - startTime
    };
  }

  // Create temp working directory
  const tempWorkDir = generateTempDirName();

  try {
    await ensureDir(tempWorkDir);
    await ensureDir(outputDir);

    // Copy input file to temp directory (isolation)
    const tempInputPath = path.join(tempWorkDir, path.basename(docxPath));
    await copyFile(docxPath, tempInputPath);

    let lastError = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        if (attempt > 0) {
          console.log(`[PDF-Converter] Retry attempt ${attempt}/${maxRetries}`);
          await new Promise(r => setTimeout(r, CONFIG.retryDelay * attempt));
        }

        // Execute conversion
        const tempPdfPath = await executeConversion(tempInputPath, tempWorkDir, timeout);

        // Wait for file to be fully written
        const fileReady = await waitForFile(tempPdfPath);
        if (!fileReady) {
          throw new Error('PDF file not generated or empty');
        }

        // Determine final output path
        const baseName = options.outputName || path.basename(docxPath, path.extname(docxPath));
        const finalPdfPath = path.join(outputDir, `${baseName}.pdf`);

        // Move PDF to final location
        await copyFile(tempPdfPath, finalPdfPath);

        // Verify final file
        const finalStats = await fsp.stat(finalPdfPath);
        if (finalStats.size === 0) {
          throw new Error('Generated PDF is empty');
        }

        return {
          success: true,
          pdfPath: finalPdfPath,
          error: null,
          duration: Date.now() - startTime
        };

      } catch (err) {
        lastError = err;
        attempt++;
      }
    }

    // All retries failed
    return {
      success: false,
      pdfPath: null,
      error: lastError?.message || 'Unknown conversion error',
      duration: Date.now() - startTime
    };

  } finally {
    // Always cleanup temp directory
    await cleanupDir(tempWorkDir);
  }
}

/**
 * Check if LibreOffice is available
 * @returns {Promise<{available: boolean, version: string|null, path: string}>}
 */
async function checkLibreOffice() {
  return new Promise((resolve) => {
    const proc = spawn(CONFIG.libreOfficePath, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('error', () => {
      resolve({
        available: false,
        version: null,
        path: CONFIG.libreOfficePath
      });
    });

    proc.on('close', (code) => {
      if (code === 0) {
        const versionMatch = output.match(/LibreOffice\s+([\d.]+)/i);
        resolve({
          available: true,
          version: versionMatch ? versionMatch[1] : output.trim(),
          path: CONFIG.libreOfficePath
        });
      } else {
        resolve({
          available: false,
          version: null,
          path: CONFIG.libreOfficePath
        });
      }
    });
  });
}

/**
 * Get current configuration
 * @returns {Object} Current configuration values
 */
function getConfig() {
  return { ...CONFIG };
}

module.exports = {
  convertToPdf,
  checkLibreOffice,
  getConfig
};
