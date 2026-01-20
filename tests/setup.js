/**
 * Jest test setup
 * Sets up environment variables and global test configuration
 */

// Set required environment variables for testing
process.env.SESSION_SECRET = 'test-session-secret';
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD_HASH = '$2b$12$test.hash.for.testing';
process.env.FILE_BASE_URL = 'http://localhost:3000/files';
process.env.OLLAMA_BASE_URL = 'http://localhost:11434/v1';
process.env.OLLAMA_MODEL = 'qwen2.5:14b';

// Increase test timeout if needed
jest.setTimeout(10000);
