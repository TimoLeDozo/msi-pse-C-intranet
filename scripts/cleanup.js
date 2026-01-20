#!/usr/bin/env node
/**
 * Cleanup Script - Automatic maintenance for output files
 *
 * Scans the out/ directory and removes files/folders older than RETENTION_DAYS.
 * Can be run standalone via cron/Task Scheduler or integrated with node-cron.
 *
 * Usage:
 *   node scripts/cleanup.js [--dry-run] [--verbose]
 *
 * Environment:
 *   RETENTION_DAYS - Number of days to keep files (default: 30)
 *   OUT_DIR - Output directory path (default: ./out)
 */

require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');

// Configuration helpers (read at call time for test isolation)
const DEFAULT_RETENTION_DAYS = 30;

function getRetentionDays() {
  const parsed = parseInt(process.env.RETENTION_DAYS, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
}

function getOutDir() {
  return process.env.OUT_DIR || path.join(__dirname, '..', 'out');
}

function isDryRun() {
  return process.argv.includes('--dry-run');
}

function isVerbose() {
  return process.argv.includes('--verbose');
}


// Logging utilities
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function logVerbose(message) {
  if (isVerbose()) {
    log(message, 'DEBUG');
  }
}

function logError(message) {
  log(message, 'ERROR');
}

function logWarning(message) {
  log(message, 'WARN');
}

/**
 * Calculate the cutoff date based on retention days
 * @returns {Date} Cutoff date - files older than this will be deleted
 */
function getCutoffDate(retentionDays = getRetentionDays()) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff;
}

/**
 * Check if a file/folder is older than the cutoff date
 * @param {object} stats - fs.Stats object
 * @param {Date} cutoffDate - Cutoff date for deletion
 * @returns {boolean} True if the item should be deleted
 */
function isExpired(stats, cutoffDate) {
  // Use mtime (modification time) as the reference
  const cutoffTime = cutoffDate instanceof Date ? cutoffDate.getTime() : new Date(cutoffDate).getTime();
  const mtime = Number.isFinite(stats.mtimeMs)
    ? stats.mtimeMs
    : (stats.mtime instanceof Date ? stats.mtime.getTime() : NaN);
  const birthtime = Number.isFinite(stats.birthtimeMs)
    ? stats.birthtimeMs
    : (stats.birthtime instanceof Date ? stats.birthtime.getTime() : NaN);
  const referenceTime = Number.isFinite(mtime) ? mtime : birthtime;

  if (!Number.isFinite(referenceTime) || !Number.isFinite(cutoffTime)) {
    return false;
  }

  return referenceTime <= cutoffTime;
}

/**
 * Recursively get all items (files and directories) in a directory
 * @param {string} dirPath - Directory to scan
 * @returns {Promise<Array>} Array of {path, stats} objects
 */
async function scanDirectory(dirPath) {
  const items = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      try {
        const stats = await fs.stat(fullPath);
        items.push({ path: fullPath, stats, isDirectory: entry.isDirectory() });

        // Recursively scan subdirectories
        if (entry.isDirectory()) {
          const subItems = await scanDirectory(fullPath);
          items.push(...subItems);
        }
      } catch (err) {
        logWarning(`Cannot stat ${fullPath}: ${err.message}`);
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      logWarning(`Directory does not exist: ${dirPath}`);
    } else {
      throw err;
    }
  }

  return items;
}

/**
 * Delete a file or directory
 * @param {string} itemPath - Path to delete
 * @param {boolean} isDirectory - Whether the item is a directory
 * @returns {Promise<boolean>} True if deletion was successful
 */
async function deleteItem(itemPath, isDirectory) {
  try {
    if (isDirectory) {
      await fs.rm(itemPath, { recursive: true, force: true });
    } else {
      await fs.unlink(itemPath);
    }
    return true;
  } catch (err) {
    logError(`Failed to delete ${itemPath}: ${err.message}`);
    return false;
  }
}

/**
 * Format file size for human readability
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format age in days
 * @param {Date} date - File date
 * @returns {string} Age in days
 */
function formatAge(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${diffDays} days`;
}

/**
 * Main cleanup function
 * @returns {Promise<object>} Cleanup results
 */
async function cleanup() {
  const retentionDays = getRetentionDays();
  const outDir = getOutDir();
  const dryRun = isDryRun();
  const results = {
    scanned: 0,
    deleted: 0,
    failed: 0,
    skipped: 0,
    bytesFreed: 0,
    errors: []
  };

  log(`Starting cleanup...`);
  log(`Output directory: ${outDir}`);
  log(`Retention period: ${retentionDays} days`);
  if (dryRun) {
    log(`DRY RUN MODE - No files will be deleted`, 'WARN');
  }

  // Check if output directory exists
  try {
    await fs.access(outDir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      log(`Output directory does not exist: ${outDir}`);
      log(`Nothing to clean up.`);
      return results;
    }
    throw err;
  }

  const cutoffDate = getCutoffDate(retentionDays);
  log(`Cutoff date: ${cutoffDate.toISOString()}`);

  // Scan directory
  const items = await scanDirectory(outDir);
  results.scanned = items.length;
  logVerbose(`Found ${items.length} items in ${outDir}`);

  // Filter expired items and sort by path length (deepest first for proper deletion order)
  const expiredItems = items
    .filter(item => isExpired(item.stats, cutoffDate))
    .sort((a, b) => b.path.length - a.path.length);

  if (expiredItems.length === 0) {
    log(`No expired items found.`);
    return results;
  }

  log(`Found ${expiredItems.length} expired items to delete`);

  // Track deleted directories to avoid deleting contents twice
  const deletedDirs = new Set();

  for (const item of expiredItems) {
    // Skip if parent directory was already deleted
    const parentDeleted = Array.from(deletedDirs).some(dir =>
      item.path.startsWith(dir + path.sep)
    );

    if (parentDeleted) {
      results.skipped++;
      logVerbose(`Skipping (parent deleted): ${item.path}`);
      continue;
    }

    const age = formatAge(item.stats.mtime);
    const size = item.isDirectory ? 'DIR' : formatSize(item.stats.size);
    const type = item.isDirectory ? 'directory' : 'file';

    if (dryRun) {
      log(`[DRY RUN] Would delete ${type}: ${item.path} (age: ${age}, size: ${size})`);
      results.deleted++;
      if (!item.isDirectory) {
        results.bytesFreed += item.stats.size;
      }
    } else {
      logVerbose(`Deleting ${type}: ${item.path} (age: ${age})`);

      const success = await deleteItem(item.path, item.isDirectory);

      if (success) {
        results.deleted++;
        if (!item.isDirectory) {
          results.bytesFreed += item.stats.size;
        }
        if (item.isDirectory) {
          deletedDirs.add(item.path);
        }
        log(`Deleted: ${item.path} (age: ${age})`);
      } else {
        results.failed++;
        results.errors.push(item.path);
      }
    }
  }

  return results;
}

/**
 * Print cleanup summary
 * @param {object} results - Cleanup results
 */
function printSummary(results) {
  console.log('\n' + '='.repeat(50));
  log('CLEANUP SUMMARY');
  console.log('='.repeat(50));
  console.log(`  Items scanned:  ${results.scanned}`);
  console.log(`  Items deleted:  ${results.deleted}`);
  console.log(`  Items skipped:  ${results.skipped}`);
  console.log(`  Items failed:   ${results.failed}`);
  console.log(`  Space freed:    ${formatSize(results.bytesFreed)}`);

  if (results.errors.length > 0) {
    console.log('\nFailed items:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }
  console.log('='.repeat(50) + '\n');
}

/**
 * Main entry point
 */
async function main() {
  try {
    const results = await cleanup();
    printSummary(results);

    // Exit with error code if there were failures
    if (results.failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    logError(`Cleanup failed: ${err.message}`);
    if (VERBOSE) {
      console.error(err.stack);
    }
    process.exitCode = 1;
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for integration with node-cron or testing
module.exports = {
  cleanup,
  getCutoffDate,
  isExpired,
  scanDirectory,
  deleteItem
};

Object.defineProperty(module.exports, 'RETENTION_DAYS', {
  get: () => getRetentionDays()
});

Object.defineProperty(module.exports, 'OUT_DIR', {
  get: () => getOutDir()
});
