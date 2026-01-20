/**
 * Context Window Management Utility
 * Gere l'optimisation de la fenetre de contexte pour les modeles LLM locaux
 *
 * @module utils/context-window.util
 */

// Configuration par defaut (Qwen 2.5 14B a un contexte de 32k tokens)
// On reserve ~3k pour le prompt systeme et la reponse
const DEFAULT_MAX_TOKENS = Number(process.env.AI_MAX_CONTEXT_TOKENS || 35000);
const RESERVED_SYSTEM_TOKENS = Number(process.env.AI_RESERVED_SYSTEM_TOKENS || 2000);
const RESERVED_RESPONSE_TOKENS = Number(process.env.AI_RESERVED_RESPONSE_TOKENS || 2000);

// Approximation: 1 token ~ 4 caracteres pour le francais
const CHARS_PER_TOKEN = 4;

/**
 * Priorites des sections pour la troncature
 * Plus le score est eleve, plus la section est prioritaire (preservee en premier)
 */
const SECTION_PRIORITIES = {
  // Sections critiques (jamais tronquees)
  'entrepriseNom': 100,
  'typeContrat': 100,
  'thematique': 100,
  'contactNom': 95,
  'contactEmail': 95,
  'dureeSemaines': 95,

  // Sections importantes (tronquees en dernier)
  'ia_probleme': 90,
  'ia_objectifs': 85,
  'ia_solution': 80,
  'titre': 75,

  // Sections contextuelles (tronquees en premier si necessaire)
  'ia_histoire': 60,
  'ia_lieux': 55,
  'contratPrecedent': 50,

  // Contenu extrait de documents (peut etre fortement tronque)
  'extractedContent': 40,
  'documentContext': 40,
  'pdfContent': 35,
  'pptxContent': 35,
  'xlsxContent': 30
};

/**
 * Estime le nombre de tokens pour un texte donne
 * Approximation: 1 token ~ 4 caracteres (adapte pour le francais)
 *
 * @param {string} text - Texte a evaluer
 * @returns {number} Estimation du nombre de tokens
 *
 * @example
 * estimateTokens("Bonjour le monde") // => 4
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estime le nombre de caracteres pour un nombre de tokens donne
 *
 * @param {number} tokens - Nombre de tokens
 * @returns {number} Estimation du nombre de caracteres
 */
function tokensToChars(tokens) {
  return tokens * CHARS_PER_TOKEN;
}

/**
 * Calcule le budget de tokens disponible pour le contenu utilisateur
 *
 * @param {string} systemPrompt - Le prompt systeme
 * @param {number} [maxTokens] - Limite totale de tokens (defaut: DEFAULT_MAX_TOKENS)
 * @returns {Object} Budget detaille
 *
 * @example
 * const budget = calculateTokenBudget(systemPrompt);
 * // => { total: 35000, system: 500, reserved: 2000, available: 32500 }
 */
function calculateTokenBudget(systemPrompt, maxTokens = DEFAULT_MAX_TOKENS) {
  const systemTokens = estimateTokens(systemPrompt);
  const reservedTokens = RESERVED_RESPONSE_TOKENS;
  const availableTokens = maxTokens - systemTokens - reservedTokens;

  return {
    total: maxTokens,
    system: systemTokens,
    reserved: reservedTokens,
    available: Math.max(0, availableTokens),
    systemChars: systemPrompt?.length || 0,
    availableChars: tokensToChars(Math.max(0, availableTokens))
  };
}

/**
 * Tronque un texte a une limite de tokens donnee, en preservant la structure
 *
 * @param {string} text - Texte a tronquer
 * @param {number} maxTokens - Nombre maximum de tokens
 * @param {Object} [options] - Options de troncature
 * @param {boolean} [options.preserveParagraphs=true] - Tronquer sur les limites de paragraphes
 * @param {string} [options.suffix='...'] - Suffixe a ajouter si tronque
 * @returns {Object} Resultat avec texte tronque et metadonnees
 *
 * @example
 * const result = truncateToTokenLimit("Long text...", 100);
 * // => { text: "Long...", truncated: true, originalTokens: 500, finalTokens: 100 }
 */
function truncateToTokenLimit(text, maxTokens, options = {}) {
  const { preserveParagraphs = true, suffix = '\n[... contenu tronque ...]' } = options;

  if (!text || typeof text !== 'string') {
    return { text: '', truncated: false, originalTokens: 0, finalTokens: 0 };
  }

  const originalTokens = estimateTokens(text);

  if (originalTokens <= maxTokens) {
    return { text, truncated: false, originalTokens, finalTokens: originalTokens };
  }

  const suffixTokens = estimateTokens(suffix);
  const targetChars = tokensToChars(maxTokens - suffixTokens);

  let truncatedText = text.substring(0, targetChars);

  // Si on preserve les paragraphes, tronquer a la fin du dernier paragraphe complet
  if (preserveParagraphs) {
    const lastParagraphEnd = truncatedText.lastIndexOf('\n\n');
    const lastSentenceEnd = Math.max(
      truncatedText.lastIndexOf('. '),
      truncatedText.lastIndexOf('.\n')
    );

    // Utiliser la limite de paragraphe si elle existe et n'est pas trop pres du debut
    if (lastParagraphEnd > targetChars * 0.7) {
      truncatedText = truncatedText.substring(0, lastParagraphEnd);
    } else if (lastSentenceEnd > targetChars * 0.7) {
      truncatedText = truncatedText.substring(0, lastSentenceEnd + 1);
    }
  }

  truncatedText = truncatedText.trim() + suffix;

  return {
    text: truncatedText,
    truncated: true,
    originalTokens,
    finalTokens: estimateTokens(truncatedText)
  };
}

/**
 * Segmente un contenu extrait en chunks semantiques
 *
 * @param {string} content - Contenu a segmenter
 * @param {Object} [options] - Options de segmentation
 * @param {number} [options.maxChunkTokens=2000] - Taille max par chunk
 * @param {number} [options.overlapTokens=100] - Chevauchement entre chunks
 * @returns {Array<Object>} Liste des chunks avec metadonnees
 */
function chunkContent(content, options = {}) {
  const { maxChunkTokens = 2000, overlapTokens = 100 } = options;

  if (!content || typeof content !== 'string') {
    return [];
  }

  const chunks = [];
  const paragraphs = content.split(/\n\n+/);

  let currentChunk = '';
  let currentTokens = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // Si le paragraphe seul depasse la limite, le decouper
    if (paragraphTokens > maxChunkTokens) {
      // Sauvegarder le chunk en cours s'il existe
      if (currentChunk.trim()) {
        chunks.push({
          index: chunkIndex++,
          content: currentChunk.trim(),
          tokens: currentTokens
        });
      }

      // Decouper le paragraphe long
      const subChunks = splitLongParagraph(paragraph, maxChunkTokens, overlapTokens);
      for (const subChunk of subChunks) {
        chunks.push({
          index: chunkIndex++,
          content: subChunk.content,
          tokens: subChunk.tokens
        });
      }

      currentChunk = '';
      currentTokens = 0;
      continue;
    }

    // Si ajouter ce paragraphe depasserait la limite
    if (currentTokens + paragraphTokens > maxChunkTokens) {
      // Sauvegarder le chunk actuel
      if (currentChunk.trim()) {
        chunks.push({
          index: chunkIndex++,
          content: currentChunk.trim(),
          tokens: currentTokens
        });
      }

      // Demarrer un nouveau chunk avec overlap
      const overlapText = getOverlapText(currentChunk, overlapTokens);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentTokens = estimateTokens(currentChunk);
    } else {
      // Ajouter au chunk actuel
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  // Ajouter le dernier chunk
  if (currentChunk.trim()) {
    chunks.push({
      index: chunkIndex++,
      content: currentChunk.trim(),
      tokens: currentTokens
    });
  }

  return chunks;
}

/**
 * Decoupe un paragraphe long en sous-chunks
 * @private
 */
function splitLongParagraph(paragraph, maxTokens, overlapTokens) {
  const chunks = [];
  const sentences = paragraph.split(/(?<=[.!?])\s+/);

  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > maxTokens) {
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          tokens: currentTokens
        });
      }

      const overlap = getOverlapText(currentChunk, overlapTokens);
      currentChunk = overlap + ' ' + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      tokens: currentTokens
    });
  }

  return chunks;
}

/**
 * Extrait le texte de chevauchement depuis la fin d'un chunk
 * @private
 */
function getOverlapText(text, overlapTokens) {
  if (!text) return '';

  const overlapChars = tokensToChars(overlapTokens);
  if (text.length <= overlapChars) return text;

  const lastPart = text.substring(text.length - overlapChars);
  const sentenceStart = lastPart.indexOf('. ');

  if (sentenceStart !== -1) {
    return lastPart.substring(sentenceStart + 2);
  }

  return lastPart;
}

/**
 * Optimise les donnees d'entree pour respecter la limite de contexte
 * Priorise les sections selon SECTION_PRIORITIES
 *
 * @param {Object} data - Donnees brutes du formulaire + extractions
 * @param {string} systemPrompt - Le prompt systeme
 * @param {Object} [options] - Options d'optimisation
 * @param {number} [options.maxTokens] - Limite totale de tokens
 * @returns {Object} Donnees optimisees avec rapport
 *
 * @example
 * const result = optimizeContextWindow(formData, systemPrompt);
 * // => { data: {...}, report: { totalTokens: 30000, truncations: [...] } }
 */
function optimizeContextWindow(data, systemPrompt, options = {}) {
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
  const budget = calculateTokenBudget(systemPrompt, maxTokens);

  // Trier les champs par priorite (decroissante)
  const fields = Object.entries(data)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      value: String(value),
      priority: SECTION_PRIORITIES[key] || 20, // Priorite par defaut: basse
      tokens: estimateTokens(String(value))
    }))
    .sort((a, b) => b.priority - a.priority);

  const optimizedData = {};
  const truncations = [];
  let usedTokens = 0;
  let remainingBudget = budget.available;

  for (const field of fields) {
    if (remainingBudget <= 0) {
      // Plus de budget: ignorer ce champ
      truncations.push({
        field: field.key,
        action: 'dropped',
        originalTokens: field.tokens,
        reason: 'budget_exhausted'
      });
      continue;
    }

    if (field.tokens <= remainingBudget) {
      // Le champ tient entierement
      optimizedData[field.key] = field.value;
      usedTokens += field.tokens;
      remainingBudget -= field.tokens;
    } else if (field.priority >= 90) {
      // Champ critique: inclure meme si depasse (on ajustera apres)
      optimizedData[field.key] = field.value;
      usedTokens += field.tokens;
      remainingBudget -= field.tokens;
    } else {
      // Tronquer le champ pour qu'il tienne
      const truncateResult = truncateToTokenLimit(field.value, remainingBudget, {
        preserveParagraphs: true
      });

      if (truncateResult.finalTokens > 0) {
        optimizedData[field.key] = truncateResult.text;
        usedTokens += truncateResult.finalTokens;
        remainingBudget -= truncateResult.finalTokens;

        truncations.push({
          field: field.key,
          action: 'truncated',
          originalTokens: field.tokens,
          finalTokens: truncateResult.finalTokens,
          reduction: `${Math.round((1 - truncateResult.finalTokens / field.tokens) * 100)}%`
        });
      } else {
        truncations.push({
          field: field.key,
          action: 'dropped',
          originalTokens: field.tokens,
          reason: 'insufficient_budget'
        });
      }
    }
  }

  return {
    data: optimizedData,
    report: {
      budget: {
        total: maxTokens,
        system: budget.system,
        reserved: budget.reserved,
        available: budget.available,
        used: usedTokens,
        remaining: Math.max(0, budget.available - usedTokens)
      },
      fields: {
        total: fields.length,
        included: Object.keys(optimizedData).length,
        truncated: truncations.filter(t => t.action === 'truncated').length,
        dropped: truncations.filter(t => t.action === 'dropped').length
      },
      truncations,
      withinBudget: usedTokens <= budget.available
    }
  };
}

/**
 * Concatene et optimise le contenu extrait de plusieurs sources
 *
 * @param {Object} sources - Sources de contenu { pdf: "...", pptx: "...", xlsx: "..." }
 * @param {number} maxTokens - Budget total pour le contenu extrait
 * @returns {Object} Contenu concatene et optimise
 */
function concatenateExtractedContent(sources, maxTokens) {
  const sourceList = Object.entries(sources)
    .filter(([_, content]) => content && typeof content === 'string' && content.trim())
    .map(([source, content]) => ({
      source,
      content: content.trim(),
      tokens: estimateTokens(content)
    }));

  if (sourceList.length === 0) {
    return { content: '', sources: [], totalTokens: 0 };
  }

  // Calculer le budget par source (reparti equitablement avec bonus pour les plus courts)
  const totalTokens = sourceList.reduce((sum, s) => sum + s.tokens, 0);

  if (totalTokens <= maxTokens) {
    // Tout tient: concatener simplement
    const content = sourceList
      .map(s => `=== SOURCE: ${s.source.toUpperCase()} ===\n${s.content}`)
      .join('\n\n');

    return {
      content,
      sources: sourceList.map(s => ({ source: s.source, tokens: s.tokens, truncated: false })),
      totalTokens
    };
  }

  // Repartir le budget proportionnellement
  const result = [];
  let usedTokens = 0;

  for (const source of sourceList) {
    const budgetRatio = source.tokens / totalTokens;
    const sourceBudget = Math.floor(maxTokens * budgetRatio);

    const truncated = truncateToTokenLimit(source.content, sourceBudget, {
      preserveParagraphs: true
    });

    result.push({
      source: source.source,
      content: truncated.text,
      originalTokens: source.tokens,
      finalTokens: truncated.finalTokens,
      truncated: truncated.truncated
    });

    usedTokens += truncated.finalTokens;
  }

  const content = result
    .map(r => `=== SOURCE: ${r.source.toUpperCase()} ===\n${r.content}`)
    .join('\n\n');

  return {
    content,
    sources: result.map(r => ({
      source: r.source,
      tokens: r.finalTokens,
      truncated: r.truncated
    })),
    totalTokens: usedTokens
  };
}

/**
 * Retourne un rapport lisible sur l'utilisation du contexte
 *
 * @param {Object} report - Rapport d'optimisation
 * @returns {string} Rapport formate
 */
function formatContextReport(report) {
  const lines = [
    '=== Context Window Report ===',
    `Budget: ${report.budget.used}/${report.budget.available} tokens (${Math.round(report.budget.used / report.budget.available * 100)}%)`,
    `Systeme: ${report.budget.system} tokens`,
    `Reserve reponse: ${report.budget.reserved} tokens`,
    `Champs: ${report.fields.included}/${report.fields.total} inclus`,
    ''
  ];

  if (report.truncations.length > 0) {
    lines.push('Ajustements:');
    for (const t of report.truncations) {
      if (t.action === 'truncated') {
        lines.push(`  - ${t.field}: tronque (${t.originalTokens} -> ${t.finalTokens} tokens, -${t.reduction})`);
      } else {
        lines.push(`  - ${t.field}: supprime (${t.originalTokens} tokens, ${t.reason})`);
      }
    }
  }

  if (!report.withinBudget) {
    lines.push('');
    lines.push('ATTENTION: Budget depasse! Envisager de reduire le contenu.');
  }

  return lines.join('\n');
}

module.exports = {
  // Constants
  DEFAULT_MAX_TOKENS,
  RESERVED_SYSTEM_TOKENS,
  RESERVED_RESPONSE_TOKENS,
  CHARS_PER_TOKEN,
  SECTION_PRIORITIES,

  // Token estimation
  estimateTokens,
  tokensToChars,
  calculateTokenBudget,

  // Content manipulation
  truncateToTokenLimit,
  chunkContent,
  concatenateExtractedContent,

  // Main optimization
  optimizeContextWindow,

  // Reporting
  formatContextReport
};
