/**
 * Image Utility
 * Provides image processing functions for DOCX integration
 *
 * Supports: PNG, JPG/JPEG
 * Features:
 * - Image validation (format, size)
 * - Dimension extraction from image headers
 * - EMU (English Metric Units) conversion for OOXML
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

// OOXML uses EMUs (English Metric Units): 914400 EMU = 1 inch
const EMU_PER_INCH = 914400;
const EMU_PER_CM = 360000;
const EMU_PER_PIXEL_96DPI = 9525; // At 96 DPI

// Supported image formats with their MIME types and DOCX content types
const SUPPORTED_FORMATS = {
  '.png': { mime: 'image/png', contentType: 'image/png', extension: 'png' },
  '.jpg': { mime: 'image/jpeg', contentType: 'image/jpeg', extension: 'jpeg' },
  '.jpeg': { mime: 'image/jpeg', contentType: 'image/jpeg', extension: 'jpeg' }
};

// Default constraints
const DEFAULT_MAX_WIDTH_CM = 16; // Max width in cm (A4 with margins)
const DEFAULT_MAX_HEIGHT_CM = 20; // Max height in cm
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validate image file format and size
 * @param {string} imagePath - Path to image file
 * @param {Object} options - Validation options
 * @param {number} [options.maxFileSize] - Max file size in bytes (default 5MB)
 * @returns {Promise<{valid: boolean, format: Object|null, error: string|null}>}
 */
async function validateImage(imagePath, options = {}) {
  const maxFileSize = options.maxFileSize || DEFAULT_MAX_FILE_SIZE;

  try {
    // Check file exists
    await fsp.access(imagePath, fs.constants.R_OK);

    // Check extension
    const ext = path.extname(imagePath).toLowerCase();
    const format = SUPPORTED_FORMATS[ext];

    if (!format) {
      return {
        valid: false,
        format: null,
        error: `Format non supporté: ${ext}. Formats acceptés: PNG, JPG/JPEG`
      };
    }

    // Check file size
    const stats = await fsp.stat(imagePath);
    if (stats.size > maxFileSize) {
      return {
        valid: false,
        format,
        error: `Fichier trop volumineux: ${Math.round(stats.size / 1024 / 1024)}MB (max ${Math.round(maxFileSize / 1024 / 1024)}MB)`
      };
    }

    // Validate image header (magic bytes)
    const buffer = Buffer.alloc(8);
    const fd = await fsp.open(imagePath, 'r');
    try {
      await fd.read(buffer, 0, 8, 0);
    } finally {
      await fd.close();
    }

    const isValidHeader = validateMagicBytes(buffer, ext);
    if (!isValidHeader) {
      return {
        valid: false,
        format,
        error: `En-tête de fichier invalide: le fichier n'est pas un ${ext.toUpperCase()} valide`
      };
    }

    return { valid: true, format, error: null };

  } catch (error) {
    return {
      valid: false,
      format: null,
      error: `Erreur de validation: ${error.message}`
    };
  }
}

/**
 * Validate magic bytes in image header
 * @param {Buffer} buffer - First bytes of the file
 * @param {string} ext - File extension
 * @returns {boolean}
 */
function validateMagicBytes(buffer, ext) {
  if (ext === '.png') {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    return buffer[0] === 0x89 && buffer[1] === 0x50 &&
           buffer[2] === 0x4E && buffer[3] === 0x47;
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    // JPEG signature: FF D8 FF
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  return false;
}

/**
 * Extract image dimensions from file
 * Reads image header without loading entire file into memory
 *
 * @param {string} imagePath - Path to image file
 * @returns {Promise<{width: number, height: number}|null>} Dimensions in pixels
 */
async function getImageDimensions(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const buffer = await fsp.readFile(imagePath);

  if (ext === '.png') {
    return getPngDimensions(buffer);
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    return getJpegDimensions(buffer);
  }

  return null;
}

/**
 * Extract dimensions from PNG file
 * PNG stores dimensions in IHDR chunk at fixed offset
 * @param {Buffer} buffer - PNG file buffer
 * @returns {{width: number, height: number}|null}
 */
function getPngDimensions(buffer) {
  // PNG header: 8 bytes signature + 4 bytes chunk length + 4 bytes chunk type (IHDR)
  // IHDR data starts at offset 16: 4 bytes width + 4 bytes height
  if (buffer.length < 24) return null;

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return { width, height };
}

/**
 * Extract dimensions from JPEG file
 * JPEG stores dimensions in SOF0/SOF2 marker
 * @param {Buffer} buffer - JPEG file buffer
 * @returns {{width: number, height: number}|null}
 */
function getJpegDimensions(buffer) {
  // JPEG structure: markers start with 0xFF
  // SOF0 (0xFFC0) or SOF2 (0xFFC2) contains dimensions
  let offset = 2; // Skip SOI marker (FF D8)

  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xFF) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // SOF0 (baseline) or SOF2 (progressive) markers
    if (marker === 0xC0 || marker === 0xC2) {
      // Format: FF C0 [length 2 bytes] [precision 1 byte] [height 2 bytes] [width 2 bytes]
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }

    // Skip other markers
    if (marker >= 0xC0 && marker <= 0xFE && marker !== 0xD0 &&
        marker !== 0xD1 && marker !== 0xD2 && marker !== 0xD3 &&
        marker !== 0xD4 && marker !== 0xD5 && marker !== 0xD6 &&
        marker !== 0xD7 && marker !== 0xD8 && marker !== 0xD9) {
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    } else {
      offset += 2;
    }
  }

  return null;
}

/**
 * Convert pixels to EMUs (English Metric Units)
 * Used in OOXML for precise positioning
 *
 * @param {number} pixels - Size in pixels
 * @param {number} [dpi=96] - Dots per inch (default 96)
 * @returns {number} Size in EMUs
 */
function pixelsToEmu(pixels, dpi = 96) {
  return Math.round(pixels * EMU_PER_INCH / dpi);
}

/**
 * Convert centimeters to EMUs
 * @param {number} cm - Size in centimeters
 * @returns {number} Size in EMUs
 */
function cmToEmu(cm) {
  return Math.round(cm * EMU_PER_CM);
}

/**
 * Convert EMUs to centimeters
 * @param {number} emu - Size in EMUs
 * @returns {number} Size in centimeters
 */
function emuToCm(emu) {
  return emu / EMU_PER_CM;
}

/**
 * Calculate scaled dimensions to fit within maximum bounds
 * Maintains aspect ratio
 *
 * @param {Object} original - Original dimensions in pixels
 * @param {number} original.width - Original width
 * @param {number} original.height - Original height
 * @param {Object} [maxSize] - Maximum dimensions
 * @param {number} [maxSize.widthCm] - Max width in cm
 * @param {number} [maxSize.heightCm] - Max height in cm
 * @param {number} [dpi=96] - Image DPI for conversion
 * @returns {{widthEmu: number, heightEmu: number, widthCm: number, heightCm: number}}
 */
function calculateScaledDimensions(original, maxSize = {}, dpi = 96) {
  const maxWidthCm = maxSize.widthCm || DEFAULT_MAX_WIDTH_CM;
  const maxHeightCm = maxSize.heightCm || DEFAULT_MAX_HEIGHT_CM;

  // Convert pixels to cm
  const inchesPerPixel = 1 / dpi;
  const cmPerPixel = inchesPerPixel * 2.54;

  let widthCm = original.width * cmPerPixel;
  let heightCm = original.height * cmPerPixel;

  // Scale down if exceeds max dimensions (maintain aspect ratio)
  const widthRatio = maxWidthCm / widthCm;
  const heightRatio = maxHeightCm / heightCm;

  if (widthRatio < 1 || heightRatio < 1) {
    const scale = Math.min(widthRatio, heightRatio);
    widthCm *= scale;
    heightCm *= scale;
  }

  return {
    widthCm: Math.round(widthCm * 100) / 100,
    heightCm: Math.round(heightCm * 100) / 100,
    widthEmu: cmToEmu(widthCm),
    heightEmu: cmToEmu(heightCm)
  };
}

/**
 * Generate a unique relationship ID for DOCX
 * @param {number} index - Image index
 * @returns {string} Relationship ID (e.g., "rId10")
 */
function generateRelationshipId(index) {
  // Start at rId10 to avoid conflicts with existing relationships
  return `rId${10 + index}`;
}

/**
 * Generate unique image filename for DOCX media folder
 * @param {string} originalName - Original filename
 * @param {number} index - Image index
 * @returns {string} Unique filename (e.g., "image1.png")
 */
function generateMediaFilename(originalName, index) {
  const ext = path.extname(originalName).toLowerCase();
  const format = SUPPORTED_FORMATS[ext];
  return `image${index + 1}.${format.extension}`;
}

module.exports = {
  // Constants
  SUPPORTED_FORMATS,
  EMU_PER_INCH,
  EMU_PER_CM,
  EMU_PER_PIXEL_96DPI,
  DEFAULT_MAX_WIDTH_CM,
  DEFAULT_MAX_HEIGHT_CM,
  DEFAULT_MAX_FILE_SIZE,

  // Validation
  validateImage,
  validateMagicBytes,

  // Dimensions
  getImageDimensions,
  getPngDimensions,
  getJpegDimensions,
  calculateScaledDimensions,

  // Unit conversion
  pixelsToEmu,
  cmToEmu,
  emuToCm,

  // ID generation
  generateRelationshipId,
  generateMediaFilename
};
