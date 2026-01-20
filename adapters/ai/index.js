/**
 * AI Adapter
 * Mode: Ollama uniquement (Intranet souverain)
 */

const adapter = require('./ollama.adapter');

console.log('[AI] Ollama adapter charge');

module.exports = adapter;
