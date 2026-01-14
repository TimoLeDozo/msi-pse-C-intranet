/**
 * Ollama Adapter (Local AI)
 * Rôle : Interface avec le serveur d'inférence local
 * Avantage : Gratuit, Privé (Intranet), Agnostique au matériel
 */
const axios = require('axios');

// Configuration par défaut (peut être surchargée par .env)
const BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
const CHAT_COMPLETIONS_URL = `${BASE_URL}/chat/completions`;
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:14b';
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 300000); // 5 min (local est plus lent que le cloud)

class OllamaAdapter {
  constructor() {
    console.log(`[OllamaAdapter] 🟢 Initialisé | URL: ${BASE_URL} | Modèle: ${MODEL}`);
  }

  async generateStructuredContent(promptPayload = {}) {
    const startTime = Date.now();
    const messages = promptPayload.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('OllamaAdapter: messages requis');
    }

    const payload = {
      model: MODEL,
      messages,
      temperature: promptPayload.temperature ?? 0.2,
      stream: false,
      // Force le mode JSON natif d'Ollama (essentiel pour Qwen/Llama)
      response_format: promptPayload.forceJson ? { type: 'json_object' } : undefined
    };

    try {
      const response = await axios.post(CHAT_COMPLETIONS_URL, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: TIMEOUT_MS
      });

      const content = response?.data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Réponse IA vide');

      const parsed = this.safeJsonParse(content);

      // Métriques pour le debug
      return {
        model: MODEL,
        sections: parsed,
        usage: response.data?.usage || {},
        cost: 0, // Gratuit
        durationMs: Date.now() - startTime
      };

    } catch (error) {
      this.handleError(error);
    }
  }

  // Nettoyage robuste du JSON (les LLM locaux sont parfois bavards)
  safeJsonParse(rawContent) {
    const raw = String(rawContent ?? '').trim();
    // Extraction du bloc JSON uniquement
    const jsonBlock = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
    try {
      return JSON.parse(jsonBlock);
    } catch (e) {
      console.warn("⚠️ JSON IA invalide, dump:", raw.substring(0, 100));
      throw new Error(`Erreur parsing JSON IA: ${e.message}`);
    }
  }

  handleError(error) {
    if (error.code === 'ECONNREFUSED') {
       throw new Error(`❌ Impossible de contacter Ollama sur ${BASE_URL}. Vérifie que l'application est lancée.`);
    }
    const apiErr = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`OllamaAdapter Error: ${apiErr}`);
  }
}

module.exports = new OllamaAdapter();
