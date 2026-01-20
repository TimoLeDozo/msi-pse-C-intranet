/**
 * Cleanup Scheduler - Optional node-cron integration
 *
 * This module provides scheduled cleanup functionality that can be
 * integrated into the main server.js if desired.
 *
 * Installation:
 *   npm install node-cron
 *
 * Usage in server.js:
 *   const { startCleanupScheduler } = require('./scripts/cleanup-scheduler');
 *   startCleanupScheduler(); // Runs daily at 3:00 AM by default
 *
 * Or with custom schedule:
 *   startCleanupScheduler('0 4 * * *'); // Run at 4:00 AM daily
 *
 * Environment:
 *   CLEANUP_SCHEDULE - Cron expression (default: '0 3 * * *' = 3:00 AM daily)
 *   CLEANUP_ENABLED  - Set to 'false' to disable scheduled cleanup
 */

const { cleanup } = require('./cleanup');

let cronJob = null;

/**
 * Start the cleanup scheduler
 * @param {string} schedule - Cron expression (optional, uses CLEANUP_SCHEDULE env or default)
 * @returns {object|null} The cron job instance, or null if disabled/unavailable
 */
function startCleanupScheduler(schedule) {
  // Check if cleanup is enabled
  const enabled = process.env.CLEANUP_ENABLED !== 'false';
  if (!enabled) {
    console.log('[CLEANUP] Scheduled cleanup is disabled (CLEANUP_ENABLED=false)');
    return null;
  }

  // Try to load node-cron
  let cron;
  try {
    cron = require('node-cron');
  } catch (err) {
    console.log('[CLEANUP] node-cron not installed. Scheduled cleanup disabled.');
    console.log('[CLEANUP] Install with: npm install node-cron');
    return null;
  }

  // Determine schedule
  const cronSchedule = schedule || process.env.CLEANUP_SCHEDULE || '0 3 * * *';

  // Validate cron expression
  if (!cron.validate(cronSchedule)) {
    console.error(`[CLEANUP] Invalid cron expression: ${cronSchedule}`);
    return null;
  }

  // Stop existing job if any
  if (cronJob) {
    cronJob.stop();
  }

  // Create new scheduled job
  cronJob = cron.schedule(cronSchedule, async () => {
    console.log('[CLEANUP] Starting scheduled cleanup...');
    try {
      const results = await cleanup();
      console.log(`[CLEANUP] Completed: ${results.deleted} items deleted, ${results.failed} failed`);
    } catch (err) {
      console.error(`[CLEANUP] Scheduled cleanup failed: ${err.message}`);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'Europe/Paris'
  });

  console.log(`[CLEANUP] Scheduler started with schedule: ${cronSchedule}`);
  return cronJob;
}

/**
 * Stop the cleanup scheduler
 */
function stopCleanupScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[CLEANUP] Scheduler stopped');
  }
}

/**
 * Run cleanup immediately (useful for testing or manual triggers)
 * @returns {Promise<object>} Cleanup results
 */
async function runCleanupNow() {
  console.log('[CLEANUP] Running immediate cleanup...');
  return await cleanup();
}

module.exports = {
  startCleanupScheduler,
  stopCleanupScheduler,
  runCleanupNow
};
