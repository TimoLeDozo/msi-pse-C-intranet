/**
 * AI Adapter Factory
 * Rôle : Sélectionne l'adaptateur IA selon la configuration
 *
 * USE_LOCAL_AI=true  → Ollama (Local/Intranet)
 * USE_LOCAL_AI=false → DeepSeek (Cloud)
 */

const useLocal = process.env.USE_LOCAL_AI === 'true';

console.log(`[AI Factory] Mode sélectionné : ${useLocal ? '🏠 LOCAL (Ollama)' : '☁️ CLOUD (DeepSeek)'}`);

// Chargement conditionnel pour éviter les erreurs si la clé API manque en mode local
let adapter;
if (useLocal) {
  adapter = require('./ollama.adapter');
} else {
  adapter = require('./deepseek.adapter');
}

module.exports = adapter;
