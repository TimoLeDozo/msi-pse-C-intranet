#!/usr/bin/env node
/**
 * Secure Secrets Generator
 *
 * Generates cryptographically secure secrets for application configuration.
 * Use this script to rotate secrets periodically or during initial setup.
 *
 * Usage:
 *   node scripts/generate-secrets.js
 *   node scripts/generate-secrets.js --password MyNewPassword123
 *
 * Output:
 *   Prints environment variable values ready to copy into .env
 *
 * Security Notes:
 *   - SESSION_SECRET: 64 bytes of random data (hex encoded = 128 chars)
 *   - Password hashes: bcrypt with cost factor 12 (recommended for production)
 *   - Never commit generated secrets to version control
 */

const crypto = require('crypto');

// Configuration
const SESSION_SECRET_BYTES = 64;  // 64 bytes = 128 hex characters
const BCRYPT_COST_FACTOR = 12;    // OWASP recommended minimum for production

/**
 * Generate a cryptographically secure random string
 * @param {number} bytes - Number of random bytes
 * @returns {string} Hex-encoded random string
 */
function generateSecureToken(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a bcrypt hash for a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} bcrypt hash
 */
async function generatePasswordHash(password) {
  // Dynamically import bcrypt to avoid requiring it if not needed
  const bcrypt = require('bcrypt');
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and messages
 */
function validatePassword(password) {
  const issues = [];

  if (password.length < 12) {
    issues.push('Password should be at least 12 characters long');
  }
  if (!/[a-z]/.test(password)) {
    issues.push('Password should contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    issues.push('Password should contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    issues.push('Password should contain at least one digit');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    issues.push('Password should contain at least one special character');
  }

  return {
    isValid: issues.length === 0,
    messages: issues
  };
}

/**
 * Print a separator line
 */
function printSeparator() {
  console.log('='.repeat(70));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const passwordIndex = args.indexOf('--password');
  const password = passwordIndex !== -1 ? args[passwordIndex + 1] : null;

  console.log('\n');
  printSeparator();
  console.log('SECURE SECRETS GENERATOR');
  console.log('MSI Propales - Security Configuration');
  printSeparator();

  // Generate SESSION_SECRET
  console.log('\n[1/2] Generating SESSION_SECRET...\n');
  const sessionSecret = generateSecureToken(SESSION_SECRET_BYTES);
  console.log('SESSION_SECRET=' + sessionSecret);
  console.log(`\n    Length: ${sessionSecret.length} characters`);
  console.log('    Entropy: 512 bits (cryptographically secure)');

  // Generate password hash if password provided
  if (password) {
    console.log('\n[2/2] Generating password hash...\n');

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.isValid) {
      console.log('[WARNING] Password strength issues detected:');
      validation.messages.forEach(msg => console.log(`  - ${msg}`));
      console.log('');
    }

    const hash = await generatePasswordHash(password);
    console.log('ADMIN_PASSWORD_HASH=' + hash);
    console.log(`\n    Algorithm: bcrypt`);
    console.log(`    Cost factor: ${BCRYPT_COST_FACTOR}`);
    console.log('    Hash length: 60 characters');
  } else {
    console.log('\n[2/2] Password hash generation skipped');
    console.log('    Use --password YOUR_PASSWORD to generate a hash');
    console.log('    Example: node scripts/generate-secrets.js --password MySecurePass123!');
  }

  // Print instructions
  printSeparator();
  console.log('INSTRUCTIONS');
  printSeparator();
  console.log(`
1. Copy the generated values above into your .env file
2. NEVER commit .env to version control
3. Rotate SESSION_SECRET periodically (recommended: every 90 days)
4. Keep a backup of these secrets in a secure password manager
5. Invalidate old sessions when rotating SESSION_SECRET

IMPORTANT: Rotating SESSION_SECRET will log out all active users.
`);
  printSeparator();

  // Security reminders
  console.log('\nSECURITY CHECKLIST:');
  console.log('  [ ] .env is in .gitignore');
  console.log('  [ ] No secrets in .env.example');
  console.log('  [ ] Old secrets removed from git history (if leaked)');
  console.log('  [ ] Secrets stored securely for disaster recovery');
  console.log('  [ ] Production uses different secrets than development');
  console.log('\n');
}

// Run main function
main().catch(err => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
