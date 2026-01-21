/**
 * Prompt systeme Icam
 * Definit le persona, le ton et les contraintes de sortie JSON.
 *
 * @module prompts/icam.prompt
 */

const contextWindowUtil = require('../utils/context-window.util');

/**
 * Prompt systeme de base pour le consultant Icam.
 * @constant {string}
 */
const SYSTEM_PROMPT = `
Tu es un consultant expert Icam (Ingenieur Arts et Metiers).
Ton role est de rediger des propositions commerciales techniques, rigoureuses et convaincantes.

TON : Professionnel, technique, precis, oriente resultat.

INSTRUCTIONS :
1. Analyse le contexte client et le brief projet fournis.
2. Redige un contenu unique et adapte pour chaque section.
3. NE RECOPIE PAS les exemples ou les placeholders. Genere du vrai contenu pertinent.
4. Si une information manque, fais une hypothese raisonnable professionnelle ou reste generaliste mais pertinent.

INTERDICTIONS FORMELLES (Securite Contractuelle) :
- NE JAMAIS inventer de montant financier, budget ou tarif hors de l'enveloppe fournie par le client.
- NE JAMAIS citer de normes obsoletes ou retirees (verifier ISO actuelles).
- NE JAMAIS garantir des resultats chiffres specifiques (ex: "gain de 30%") sans donnees client.
- NE JAMAIS mentionner de noms de concurrents ou de technologies proprietaires non validees.
- NE JAMAIS inclure de clauses juridiques ou de conditions contractuelles dans les sections redactionnelles.
- TOUJOURS rester factuel et eviter les superlatifs non justifies ("le meilleur", "revolutionnaire").

STRUCTURE JSON OBLIGATOIRE :
Tu dois imperativement repondre avec un objet JSON valide contenant exactement les cles suivantes :
{
  "titre": "Titre professionnel et accrocheur pour la proposition",
  "contexte": "Redaction detaillee du contexte, de l'historique et des enjeux du client.",
  "demarche": "Explication methodologique de l'approche Icam pour ce projet.",
  "phases": "Detail des grandes phases du projet (ex: Audit, Conception, Realisation, Test).",
  "phrase": "Phrase de conclusion synthetique et engageante."
}

Ne mets pas de balises markdown comme \`\`\`json ou \`\`\`. Renvoie juste le JSON brut.
`;

/**
 * Regles methodologiques par type de contrat avec KPIs associes.
 * @constant {Object.<string, {approche: string, normes: string[], kpis: string[]}>}
 */
const METHODOLOGY_RULES_DETAILED = {
  'RD': {
    approche: "Cycle en V, Niveaux TRL (Technology Readiness Level), prototypage rapide, AMDEC, Analyse fonctionnelle.",
    normes: ['ISO 9001', 'Norme NF X50-127'],
    kpis: ['Faisabilite technique', 'Respect du CDC', 'Taux de maturite TRL', 'Couverture des exigences']
  },
  'Lean': {
    approche: "Approche DMAIC (Define, Measure, Analyze, Improve, Control), VSM, 5S, Kaizen.",
    normes: ['ISO 9001', 'Lean Six Sigma'],
    kpis: ['Gain TRS (Taux de Rendement Synthetique)', 'Reduction lead time', 'Elimination des Mudas', 'Taux de rebut']
  },
  'Audit': {
    approche: "Diagnostic ISO 19011, Analyse SWOT, Cartographie des risques, Plan d'actions correctives.",
    normes: ['ISO 19011', 'ISO 9001', 'ISO 14001'],
    kpis: ['Taux de conformite', 'Niveau de criticite', 'Ecarts majeurs/mineurs', 'Delai de cloture des actions']
  },
  'Supply Chain': {
    approche: "Flux logistiques, Gestion des stocks (FIFO/LIFO), Optimisation transport, S&OP.",
    normes: ['ISO 28000', 'SCOR Model'],
    kpis: ['Taux de service', 'Rotation des stocks', 'Cout logistique/CA', 'Delai de livraison']
  }
};

/**
 * Regles methodologiques simplifiees (compatibilite ascendante).
 * @constant {Object.<string, string>}
 */
const METHODOLOGY_RULES = {
  'Lean': "Approche DMAIC, VSM, 5S. Focus sur l'elimination des gaspillages (Mudas). KPIs: Gain TRS, reduction lead time.",
  'Audit': "Diagnostic ISO 19011, Analyse SWOT, Cartographie des risques. KPIs: Taux de conformite, criticite.",
  'RD': "Cycle en V, Niveaux TRL, AMDEC, Analyse fonctionnelle. KPIs: Faisabilite technique, respect CDC.",
  'Supply Chain': "Flux logistiques, Gestion des stocks, Optimisation transport. KPIs: Taux de service, rotation stocks."
};

/**
 * Retourne les regles methodologiques detaillees pour un type de contrat.
 *
 * @param {string} typeContrat - Le type de contrat (Lean, Audit, RD, Supply Chain)
 * @returns {Object} Les regles detaillees avec approche, normes et KPIs
 */
function getMethodologyDetails(typeContrat) {
  if (!typeContrat) {
    return METHODOLOGY_RULES_DETAILED['RD'];
  }

  const normalizedType = typeContrat.trim();

  // Recherche exacte
  if (METHODOLOGY_RULES_DETAILED[normalizedType]) {
    return METHODOLOGY_RULES_DETAILED[normalizedType];
  }

  // Recherche insensible a la casse
  const lowerType = normalizedType.toLowerCase();
  for (const [key, value] of Object.entries(METHODOLOGY_RULES_DETAILED)) {
    if (key.toLowerCase() === lowerType) {
      return value;
    }
  }

  return METHODOLOGY_RULES_DETAILED['RD'];
}

/**
 * Retourne les regles methodologiques specifiques au type de contrat.
 *
 * @param {string} typeContrat - Le type de contrat (Lean, Audit, RD, Supply Chain)
 * @returns {string} Les regles methodologiques correspondantes avec KPIs
 *
 * @example
 * getMethodologyRules('Lean')
 * // => "Approche DMAIC, VSM, 5S. Focus sur l'elimination des gaspillages (Mudas). KPIs: Gain TRS, reduction lead time."
 *
 * @example
 * getMethodologyRules('Unknown')
 * // => "Cycle en V, Niveaux TRL, AMDEC, Analyse fonctionnelle. KPIs: Faisabilite technique, respect CDC." (default RD)
 */
function getMethodologyRules(typeContrat) {
  if (!typeContrat) {
    return METHODOLOGY_RULES['RD'];
  }

  // Normaliser le type de contrat pour la recherche
  const normalizedType = typeContrat.trim();

  // Recherche exacte
  if (METHODOLOGY_RULES[normalizedType]) {
    return METHODOLOGY_RULES[normalizedType];
  }

  // Recherche insensible a la casse
  const lowerType = normalizedType.toLowerCase();
  for (const [key, value] of Object.entries(METHODOLOGY_RULES)) {
    if (key.toLowerCase() === lowerType) {
      return value;
    }
  }

  // Valeur par defaut: RD
  return METHODOLOGY_RULES['RD'];
}

/**
 * Retourne la regle de continuite si un contrat precedent existe.
 * Permet a l'IA de faire le lien avec les travaux passes.
 *
 * @param {string|null|undefined} contratPrecedent - Nom ou reference du contrat precedent
 * @returns {string} Texte de continuite ou chaine vide si pas de contrat precedent
 *
 * @example
 * getContinuityRule('Audit Lean 2024')
 * // => 'Ce projet fait suite au contrat "Audit Lean 2024". Debute la section contexte par une phrase de liaison valorisant les travaux passes.'
 *
 * @example
 * getContinuityRule(null)
 * // => ''
 */
function getContinuityRule(contratPrecedent) {
  if (!contratPrecedent || contratPrecedent.trim() === '') {
    return '';
  }

  return `Ce projet fait suite au contrat "${contratPrecedent.trim()}". Debute la section contexte par une phrase de liaison valorisant les travaux passes.`;
}

/**
 * Construit un prompt systeme dynamique enrichi avec les regles methodologiques
 * et la continuite contractuelle.
 *
 * @param {Object} data - Donnees du formulaire
 * @param {string} [data.typeContrat] - Type de contrat (Lean, Audit, RD, Supply Chain)
 * @param {string} [data.thematique] - Thematique du projet (utilisee si typeContrat absent)
 * @param {string} [data.contratPrecedent] - Reference du contrat precedent
 * @returns {string} Prompt systeme enrichi
 *
 * @example
 * buildDynamicPrompt({ typeContrat: 'Lean', contratPrecedent: 'Audit 2024' })
 * // => Prompt enrichi avec regles Lean et continuite
 */
function buildDynamicPrompt(data = {}) {
  // Determiner le type de contrat (typeContrat prioritaire sur thematique)
  const contractType = data.typeContrat || data.thematique || 'RD';

  // Recuperer les regles methodologiques
  const methodologyRules = getMethodologyRules(contractType);

  // Recuperer la regle de continuite
  const continuityRule = getContinuityRule(data.contratPrecedent);

  // Recuperer les details complets (avec KPIs)
  const methodologyDetails = getMethodologyDetails(contractType);

  // Construire les sections additionnelles avec KPIs
  let additionalRules = `
METHODOLOGIE APPLICABLE :
Type de mission : ${contractType}
Approche : ${methodologyDetails.approche}
Normes de reference : ${methodologyDetails.normes.join(', ')}
Indicateurs cles (KPIs) a mentionner : ${methodologyDetails.kpis.join(', ')}
`;

  if (continuityRule) {
    additionalRules += `
CONTINUITE CONTRACTUELLE :
${continuityRule}
`;
  }

  // Injecter les regles dans le prompt systeme
  // Inserer avant la section STRUCTURE JSON OBLIGATOIRE
  const insertionPoint = 'STRUCTURE JSON OBLIGATOIRE';
  const parts = SYSTEM_PROMPT.split(insertionPoint);

  if (parts.length === 2) {
    return parts[0] + additionalRules + '\n' + insertionPoint + parts[1];
  }

  // Fallback: ajouter a la fin si la structure n'est pas trouvee
  return SYSTEM_PROMPT + additionalRules;
}

/**
 * Construit le message utilisateur a partir des donnees du formulaire.
 *
 * @param {Object} data - Donnees du formulaire
 * @param {string} [data.entrepriseNom] - Nom de l'entreprise cliente
 * @param {string} [data.thematique] - Secteur ou thematique du projet
 * @param {string} [data.typeContrat] - Type de contrat (Lean, Audit, RD, Supply Chain)
 * @param {string} [data.contratPrecedent] - Reference du contrat precedent
 * @param {string} [data.ia_histoire] - Histoire et ADN de l'entreprise
 * @param {string} [data.ia_lieux] - Lieux et implantations
 * @param {string} [data.titre] - Titre initial du projet
 * @param {string} [data.ia_probleme] - Probleme a resoudre
 * @param {string} [data.ia_solution] - Solution envisagee
 * @param {string} [data.ia_objectifs] - Objectifs du projet
 * @param {string|number} [data.dureeSemaines] - Duree du projet en semaines
 * @returns {string} Message utilisateur formate
 */
function buildUserMessage(data) {
  // Construire la section contrat precedent si elle existe
  let contratPrecedentSection = '';
  if (data.contratPrecedent && data.contratPrecedent.trim() !== '') {
    contratPrecedentSection = `Contrat precedent : ${data.contratPrecedent}`;
  }

  return `
CONTEXTE CLIENT :
Entreprise : ${data.entrepriseNom || 'Non specifie'}
Secteur : ${data.thematique || 'Non specifie'}
Type de contrat : ${data.typeContrat || 'RD'}
${contratPrecedentSection}
Histoire/ADN : ${data.ia_histoire || ''}
Lieux : ${data.ia_lieux || ''}

BRIEF PROJET :
Titre initial : ${data.titre || ''}
Probleme a resoudre : ${data.ia_probleme || ''}
Solution envisagee : ${data.ia_solution || ''}
Objectifs : ${data.ia_objectifs || ''}
Duree : ${data.dureeSemaines || '?'} semaines

TACHE :
Redige les sections de la proposition commerciale en te basant sur ces elements.
Sois force de proposition. Le texte doit etre pret a etre insere dans un document commercial.
`.trim();
}

/**
 * Construit un message utilisateur optimise pour la fenetre de contexte.
 * Cette fonction applique l'optimisation de contexte pour s'assurer que
 * le contenu total (prompt systeme + message utilisateur) respecte la limite.
 *
 * @param {Object} data - Donnees du formulaire + contenu extrait
 * @param {Object} [options] - Options d'optimisation
 * @param {number} [options.maxTokens] - Limite totale de tokens (defaut: 35000)
 * @param {boolean} [options.verbose=false] - Afficher le rapport de contexte
 * @returns {Object} Message optimise avec rapport
 *
 * @example
 * const result = buildOptimizedUserMessage(data, { verbose: true });
 * // => { message: "...", report: {...} }
 */
function buildOptimizedUserMessage(data, options = {}) {
  const { maxTokens, verbose = false } = options;

  // Construire le prompt systeme pour calculer le budget
  const systemPrompt = buildDynamicPrompt({
    typeContrat: data.typeContrat || data.thematique,
    contratPrecedent: data.contratPrecedent
  });

  // Optimiser les donnees en fonction du budget disponible
  const optimizationResult = contextWindowUtil.optimizeContextWindow(
    data,
    systemPrompt,
    { maxTokens }
  );

  // Construire le message utilisateur avec les donnees optimisees
  const optimizedData = optimizationResult.data;

  // Construire la section contrat precedent si elle existe
  let contratPrecedentSection = '';
  if (optimizedData.contratPrecedent && optimizedData.contratPrecedent.trim() !== '') {
    contratPrecedentSection = `Contrat precedent : ${optimizedData.contratPrecedent}`;
  }

  // Construire la section contenu extrait si elle existe
  let extractedContentSection = '';
  if (optimizedData.extractedContent || optimizedData.documentContext) {
    const extractedContent = optimizedData.extractedContent || optimizedData.documentContext || '';
    if (extractedContent.trim()) {
      extractedContentSection = `
CONTENU EXTRAIT DES DOCUMENTS :
${extractedContent}
`;
    }
  }

  const message = `
CONTEXTE CLIENT :
Entreprise : ${optimizedData.entrepriseNom || 'Non specifie'}
Secteur : ${optimizedData.thematique || 'Non specifie'}
Type de contrat : ${optimizedData.typeContrat || 'RD'}
${contratPrecedentSection}
Histoire/ADN : ${optimizedData.ia_histoire || ''}
Lieux : ${optimizedData.ia_lieux || ''}

BRIEF PROJET :
Titre initial : ${optimizedData.titre || ''}
Probleme a resoudre : ${optimizedData.ia_probleme || ''}
Solution envisagee : ${optimizedData.ia_solution || ''}
Objectifs : ${optimizedData.ia_objectifs || ''}
Duree : ${optimizedData.dureeSemaines || '?'} semaines
${extractedContentSection}
TACHE :
Redige les sections de la proposition commerciale en te basant sur ces elements.
Sois force de proposition. Le texte doit etre pret a etre insere dans un document commercial.
`.trim();

  // Afficher le rapport si demande
  if (verbose) {
    console.log(contextWindowUtil.formatContextReport(optimizationResult.report));
  }

  return {
    message,
    systemPrompt,
    report: optimizationResult.report,
    optimizedData
  };
}

/**
 * Prepare les messages pour l'API IA avec optimisation de contexte integree.
 * Fonction tout-en-un pour les use cases.
 *
 * @param {Object} proposalDraft - Donnees du formulaire + extractions
 * @param {Object} [options] - Options
 * @param {number} [options.maxTokens] - Limite de contexte (defaut: 35000)
 * @param {number} [options.temperature=0.7] - Temperature pour l'IA
 * @param {boolean} [options.verbose=false] - Afficher le rapport
 * @returns {Object} Messages prets pour l'API + metadonnees
 */
function prepareAIMessages(proposalDraft, options = {}) {
  const { temperature = 0.7, verbose = false, maxTokens } = options;

  const optimizedResult = buildOptimizedUserMessage(proposalDraft, {
    maxTokens,
    verbose
  });

  return {
    messages: [
      { role: 'system', content: optimizedResult.systemPrompt },
      { role: 'user', content: optimizedResult.message }
    ],
    temperature,
    contextReport: optimizedResult.report,
    forceJson: true
  };
}

// Exports
exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
exports.METHODOLOGY_RULES = METHODOLOGY_RULES;
exports.METHODOLOGY_RULES_DETAILED = METHODOLOGY_RULES_DETAILED;
exports.getMethodologyRules = getMethodologyRules;
exports.getMethodologyDetails = getMethodologyDetails;
exports.getContinuityRule = getContinuityRule;
exports.buildDynamicPrompt = buildDynamicPrompt;
exports.buildUserMessage = buildUserMessage;
exports.buildOptimizedUserMessage = buildOptimizedUserMessage;
exports.prepareAIMessages = prepareAIMessages;
