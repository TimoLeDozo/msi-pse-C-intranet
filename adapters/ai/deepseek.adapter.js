/**
 * DeepSeek Adapter
 * Rôle : appeler l'API DeepSeek et retourner une réponse structurée
 *
 * AUCUNE logique métier ici
 * AUCUN prompt métier ici
 */

const axios = require('axios');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

class DeepSeekAdapter {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    if (!this.apiKey) {
      console.warn('⚠️ DEEPSEEK_API_KEY manquante. Mode MOCK activé.');
    }
  }

  /**
   * Appel IA structuré
   * @param {Object} promptPayload - prompt déjà construit
   * @returns {Promise<Object>}
   */
  async generateStructuredContent(promptPayload) {
    const startTime = Date.now();

    // Mode MOCK si pas de clé API
    if (!this.apiKey) {
      console.log('🔮 Simulation appel IA (Mock)...');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Latence artificielle

      const mockContent = {
        titre: "Proposition Commerciale Optimisée (MOCK)",
        contexte: "Ceci est un contexte généré par le mode mock car la clé API est absente. L'entreprise semble faire face à des défis logistiques importants.",
        demarche: "Nous proposons une démarche en trois temps : audit approfondi, co-construction de la solution, et déploiement accompagné.",
        phases: "1. Audit (2 semaines)\n2. Ateliers (1 semaine)\n3. Implémentation (4 semaines)",
        phrase: "Ensemble, transformons vos défis en opportunités de croissance durable."
      };

      return {
        model: 'mock-model',
        sections: mockContent,
        usage: { total_tokens: 123, prompt_tokens: 50, completion_tokens: 73 },
        cost: { totalUsd: 0.000246 },
        durationMs: Date.now() - startTime
      };
    }

    try {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: MODEL,
          messages: promptPayload.messages,
          temperature: promptPayload.temperature ?? 0.2,
          max_tokens: promptPayload.maxTokens ?? 4000
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000
        }
      );

      const choice = response.data.choices?.[0];
      if (!choice?.message?.content) {
        throw new Error('Réponse IA vide');
      }

      // 🔐 Parsing JSON sécurisé (B2-like)
      const parsed = this.safeJsonParse(choice.message.content);

      return {
        model: MODEL,
        sections: parsed,
        usage: response.data.usage || null,
        cost: this.estimateCost(response.data.usage),
        durationMs: Date.now() - startTime
      };

    } catch (error) {
      throw new Error(`DeepSeekAdapter error: ${error.message}`);
    }
  }

  /**
   * Parsing JSON tolérant (copié conceptuellement de B2)
   */
  safeJsonParse(rawContent) {
    try {
      return JSON.parse(rawContent);
    } catch {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('JSON IA introuvable');
      }
      return JSON.parse(match[0]);
    }
  }

  /**
   * Estimation coût (alignée MSI / B2)
   */
  estimateCost(usage) {
    if (!usage) return null;

    const COST_PER_1K_TOKENS = 0.002; // ajustable
    const totalTokens = usage.total_tokens || 0;

    return {
      totalUsd: Number(((totalTokens / 1000) * COST_PER_1K_TOKENS).toFixed(6))
    };
  }
}

module.exports = new DeepSeekAdapter();
