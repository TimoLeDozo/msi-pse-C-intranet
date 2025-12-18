/**
 * DeepSeek Adapter
 * Rôle : appeler l'API DeepSeek et retourner une réponse structurée
 *
 * AUCUNE logique métier ici
 * AUCUN prompt métier ici
 */

const axios = require('axios');

const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const CHAT_COMPLETIONS_URL = `${BASE_URL}/chat/completions`;

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'; // ou 'deepseek-reasoner'
const TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 120000);

class DeepSeekAdapter {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY manquante');
    }
  }

  /**
   * Appel IA structuré
   * @param {Object} promptPayload
   * @param {Array}  promptPayload.messages
   * @param {number} [promptPayload.temperature]
   * @param {number} [promptPayload.maxTokens]
   * @param {boolean} [promptPayload.forceJson]
   */
  async generateStructuredContent(promptPayload = {}) {
    const startTime = Date.now();

    const messages = promptPayload.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('DeepSeekAdapter: promptPayload.messages requis');
    }

    const payload = {
      model: MODEL,
      messages,
      temperature: promptPayload.temperature ?? 0.2,
      max_tokens: promptPayload.maxTokens ?? 4000,
      stream: false
    };

    // Optionnel : forcer une sortie JSON (OpenAI-compatible)
    if (promptPayload.forceJson) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const response = await axios.post(CHAT_COMPLETIONS_URL, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: TIMEOUT_MS
      });

      const content = response?.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Réponse IA vide');
      }

      const parsed = this.safeJsonParse(content);
      const usage = response.data?.usage || null;

      return {
        model: MODEL,
        sections: parsed,
        usage,
        cost: this.estimateCostUsd(usage),
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      const apiErr = error?.response?.data ? JSON.stringify(error.response.data) : null;
      throw new Error(`DeepSeekAdapter error: ${apiErr || error.message}`);
    }
  }

  /**
   * Parsing JSON tolérant
   */
  safeJsonParse(rawContent) {
    const raw = String(rawContent ?? '').trim();

    try {
      return JSON.parse(raw);
    } catch {
      const obj = raw.match(/\{[\s\S]*\}/)?.[0];
      const arr = raw.match(/\[[\s\S]*\]/)?.[0];
      const candidate = obj || arr;

      if (!candidate) throw new Error('JSON IA introuvable');

      try {
        return JSON.parse(candidate);
      } catch (e) {
        throw new Error(`JSON IA invalide: ${e.message}`);
      }
    }
  }

  /**
   * Estimation coût (USD) à partir du pricing officiel (ordre de grandeur)
   * - input: $0.28 / 1M tokens (cache miss)
   * - output: $0.42 / 1M tokens
   */
  estimateCostUsd(usage) {
    if (!usage) return null;

    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;

    const inputUsd = (promptTokens / 1_000_000) * 0.28;
    const outputUsd = (completionTokens / 1_000_000) * 0.42;

    return {
      inputUsd: Number(inputUsd.toFixed(6)),
      outputUsd: Number(outputUsd.toFixed(6)),
      totalUsd: Number((inputUsd + outputUsd).toFixed(6))
    };
  }
}

module.exports = new DeepSeekAdapter();
