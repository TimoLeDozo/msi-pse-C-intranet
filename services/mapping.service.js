/**
 * Mapping Service
 * Gestion du mapping entre les donnees JSON (IA + formulaire) et les placeholders Word
 *
 * Responsabilites:
 * - Definition du schema de mapping (cles JSON -> placeholders Word)
 * - Transformation et formatage des donnees
 * - Gestion des valeurs manquantes avec fallbacks
 * - Validation que tous les placeholders sont couverts
 */

const costService = require('./cost.service.js');

// =============================================================================
// SCHEMA DE MAPPING
// =============================================================================

/**
 * Schema de mapping principal
 * Definit la correspondance entre les sources de donnees et les placeholders Word
 *
 * Structure:
 * - placeholder: nom du placeholder dans le template Word (sans {{ }})
 * - source: chemin vers la donnee (notation pointee pour objets imbriques)
 * - type: type de donnee pour le formatage
 * - fallback: valeur par defaut si la donnee est absente
 * - transform: fonction de transformation optionnelle
 * - required: si true, une erreur sera levee si la valeur est manquante
 */
const MAPPING_SCHEMA = {
  // -------------------------------------------------------------------------
  // Sections generees par l'IA
  // -------------------------------------------------------------------------
  titre: {
    source: 'ai.titre',
    type: 'text',
    fallback: 'Proposition Commerciale',
    required: false,
    description: 'Titre de la proposition genere par IA'
  },
  contexte: {
    source: 'ai.contexte',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Section contexte/enjeux generee par IA'
  },
  demarche: {
    source: 'ai.demarche',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Description de la demarche methodologique'
  },
  phases: {
    source: 'ai.phases',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Detail des phases du projet'
  },
  phrase: {
    source: 'ai.phrase',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Phrase de conclusion'
  },
  objectifs: {
    source: 'ai.objectifs',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Objectifs du projet generes par IA'
  },
  livrables: {
    source: 'ai.livrables',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Livrables attendus generes par IA'
  },
  methodologie: {
    source: 'ai.methodologie',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Methodologie et demarche generees par IA'
  },

  // -------------------------------------------------------------------------
  // Donnees formulaire client
  // -------------------------------------------------------------------------
  entrepriseNom: {
    source: 'form.entrepriseNom',
    type: 'text',
    fallback: '[Nom Entreprise]',
    required: true,
    description: 'Nom de l\'entreprise cliente'
  },
  entrepriseAdresse: {
    source: 'form.entrepriseAdresse',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Adresse de l\'entreprise'
  },
  entrepriseLogo: {
    source: 'form.entrepriseLogo',
    type: 'text',
    fallback: '',
    required: false,
    description: 'URL du logo de l\'entreprise'
  },
  clientNom: {
    source: 'form.clientNom',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Nom du contact client'
  },
  clientFonction: {
    source: 'form.clientFonction',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Fonction du contact client'
  },
  clientEmail: {
    source: 'form.clientEmail',
    type: 'email',
    fallback: '',
    required: false,
    description: 'Email du contact client'
  },
  clientTelephone: {
    source: 'form.clientTelephone',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Telephone du contact client'
  },
  contactNom: {
    source: 'form.contactNom',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Nom du contact principal (alias)'
  },
  contactEmail: {
    source: 'form.contactEmail',
    type: 'email',
    fallback: '',
    required: false,
    description: 'Email du contact (alias)'
  },
  thematique: {
    source: 'form.thematique',
    type: 'text',
    fallback: 'R&D',
    required: false,
    description: 'Thematique du projet (Lean, Audit, R&D, etc.)'
  },
  typeContrat: {
    source: 'form.typeContrat',
    type: 'text',
    fallback: 'R&D',
    required: false,
    description: 'Type de contrat'
  },
  codeProjet: {
    source: 'form.codeProjet',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Code reference du projet'
  },
  dateDebut: {
    source: 'form.dateDebut',
    type: 'date',
    fallback: '',
    required: false,
    description: 'Date de debut du projet'
  },

  // -------------------------------------------------------------------------
  // Donnees de duree
  // -------------------------------------------------------------------------
  dureeSemaines: {
    source: 'form.dureeSemaines',
    type: 'number',
    fallback: 24,
    required: false,
    description: 'Duree du projet en semaines'
  },
  dureeTexte: {
    source: 'computed.dureeTexte',
    type: 'text',
    fallback: '24 semaines',
    required: false,
    description: 'Duree formatee en texte'
  },

  // -------------------------------------------------------------------------
  // Donnees financieres (calculees via cost.service.js)
  // -------------------------------------------------------------------------
  budget: {
    source: 'financial.budget',
    type: 'currency',
    fallback: '20 000 EUR',
    required: false,
    description: 'Budget formate (ex: 20 000 EUR)'
  },
  budgetRaw: {
    source: 'financial.budgetRaw',
    type: 'number',
    fallback: 20000,
    required: false,
    description: 'Budget en valeur numerique'
  },
  budgetEnLettres: {
    source: 'financial.budgetEnLettres',
    type: 'text',
    fallback: 'vingt mille euros',
    required: false,
    description: 'Budget en lettres (mention legale)'
  },
  echeancier: {
    source: 'financial.echeancier',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Echeancier de paiement formate'
  },
  echeancier2: {
    source: 'financial.echeancier2',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Echeancier de paiement complementaire'
  },
  budget_texte: {
    source: 'financial.budgetEnLettres',
    type: 'text',
    fallback: '',
    required: false,
    description: 'Budget en lettres (alias budgetEnLettres)'
  },
  eligibiliteCII: {
    source: 'form.eligibiliteCII',
    type: 'text',
    fallback: 'A evaluer',
    required: false,
    description: 'Eligibilite au Credit d\'Impot Innovation'
  },
  eligibiliteCIR: {
    source: 'form.eligibiliteCIR',
    type: 'text',
    fallback: 'A evaluer',
    required: false,
    description: 'Eligibilite au Credit d\'Impot Recherche'
  },

  // -------------------------------------------------------------------------
  // Dates
  // -------------------------------------------------------------------------
  DateDuJour: {
    source: 'financial.DateDuJour',
    type: 'date',
    fallback: null, // Sera calcule dynamiquement
    required: false,
    description: 'Date du jour au format francais (ex: 15 janvier 2026)'
  },
  annee: {
    source: 'computed.annee',
    type: 'text',
    fallback: new Date().getFullYear().toString(),
    required: false,
    description: 'Annee en cours'
  },

  // -------------------------------------------------------------------------
  // Placeholders etendus (compatibilite template existant)
  // -------------------------------------------------------------------------
  clientNom: {
    source: 'form.entrepriseNom',
    type: 'text',
    fallback: '[Nom Client]',
    required: false,
    description: 'Alias pour entrepriseNom'
  },
  nomEntreprise: {
    source: 'form.entrepriseNom',
    type: 'text',
    fallback: '[Nom Entreprise]',
    required: false,
    description: 'Alias pour entrepriseNom'
  },
  projetTitre: {
    source: 'ai.titre',
    type: 'text',
    fallback: 'Proposition Commerciale',
    required: false,
    description: 'Alias pour titre'
  }
};

// =============================================================================
// FONCTIONS DE TRANSFORMATION PAR TYPE
// =============================================================================

/**
 * Transformateurs par type de donnee
 * Chaque fonction prend une valeur brute et retourne la valeur formatee
 */
const TYPE_TRANSFORMERS = {
  /**
   * Texte simple - nettoyage et normalisation
   */
  text: (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  },

  /**
   * Nombre - conversion et validation
   */
  number: (value) => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Devise - formatage via cost.service
   */
  currency: (value) => {
    if (value === null || value === undefined) return '';
    // Si deja formate (contient EUR ou euro), retourner tel quel
    if (typeof value === 'string' && (value.includes('EUR') || value.includes('euro'))) {
      return value;
    }
    // Sinon formater le nombre
    const num = Number(value);
    return isNaN(num) ? '' : costService.formatCurrency(num);
  },

  /**
   * Email - validation basique et nettoyage
   */
  email: (value) => {
    if (value === null || value === undefined) return '';
    const email = String(value).trim().toLowerCase();
    // Validation basique
    if (email && !email.includes('@')) {
      return ''; // Email invalide
    }
    return email;
  },

  /**
   * Date - formatage francais
   */
  date: (value) => {
    if (value === null || value === undefined) {
      return costService.formatFrenchDate(new Date());
    }
    if (value instanceof Date) {
      return costService.formatFrenchDate(value);
    }
    // Si c'est deja une chaine formatee, la retourner
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    return costService.formatFrenchDate(new Date());
  },

  /**
   * Liste a puces - formatage pour Word
   */
  bulletList: (value) => {
    if (!Array.isArray(value)) return '';
    return value.map(item => `- ${item}`).join('\n');
  }
};

// =============================================================================
// FONCTIONS PRINCIPALES
// =============================================================================

/**
 * Extrait une valeur d'un objet en utilisant une notation pointee
 * @param {Object} obj - Objet source
 * @param {string} path - Chemin (ex: 'ai.titre', 'form.entrepriseNom')
 * @returns {*} Valeur trouvee ou undefined
 */
function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Prepare les donnees structurees pour le mapping
 * Organise les donnees brutes en categories (ai, form, financial, computed)
 *
 * @param {Object} params - Parametres d'entree
 * @param {Object} [params.aiSections] - Sections generees par l'IA
 * @param {Object} [params.formData] - Donnees du formulaire
 * @param {Object} [params.financialData] - Donnees financieres (optionnel, sera calcule si absent)
 * @returns {Object} Donnees structurees pour le mapping
 */
function prepareDataSources(params) {
  const { aiSections = {}, formData = {}, financialData } = params;

  // Calculer les donnees financieres si non fournies
  const finance = financialData || costService.getFinancialData({
    dureeSemaines: formData.dureeSemaines || 24,
    nbEquipes: formData.nbEquipes || 1,
    budgetOverride: formData.budgetOverride,
    nbPhases: formData.phaseCount || formData.nbPhases || 3
  });

  // Construire l'objet structure
  return {
    ai: {
      titre: aiSections.titre,
      contexte: aiSections.contexte,
      demarche: aiSections.demarche,
      phases: aiSections.phases,
      phrase: aiSections.phrase,
      objectifs: aiSections.objectifs,
      livrables: aiSections.livrables,
      methodologie: aiSections.methodologie
    },
    form: {
      entrepriseNom: formData.entrepriseNom,
      entrepriseAdresse: formData.entrepriseAdresse,
      entrepriseLogo: formData.entrepriseLogo,
      clientNom: formData.clientNom,
      clientFonction: formData.clientFonction,
      clientEmail: formData.clientEmail,
      clientTelephone: formData.clientTelephone,
      contactNom: formData.contactNom,
      contactEmail: formData.contactEmail,
      thematique: formData.thematique,
      typeContrat: formData.typeContrat,
      codeProjet: formData.codeProjet,
      dateDebut: formData.dateDebut,
      dureeSemaines: formData.dureeSemaines || 24,
      eligibiliteCII: formData.eligibiliteCII,
      eligibiliteCIR: formData.eligibiliteCIR
    },
    financial: {
      budget: finance.budget,
      budgetRaw: finance.budgetRaw,
      budgetEnLettres: finance.budgetEnLettres,
      echeancier: finance.echeancier,
      echeancier2: finance.echeancier2 || '',
      DateDuJour: finance.DateDuJour
    },
    computed: {
      dureeTexte: `${formData.dureeSemaines || 24} semaines`,
      annee: new Date().getFullYear().toString()
    }
  };
}

/**
 * Applique le mapping pour generer les donnees destinees au template Word
 *
 * @param {Object} dataSources - Donnees structurees (retour de prepareDataSources)
 * @param {Object} [options] - Options de mapping
 * @param {boolean} [options.strict=false] - Si true, leve une erreur pour les champs requis manquants
 * @param {string[]} [options.include] - Liste des placeholders a inclure (tous si absent)
 * @param {string[]} [options.exclude] - Liste des placeholders a exclure
 * @returns {Object} Donnees mappees prete pour docxtemplater
 */
function applyMapping(dataSources, options = {}) {
  const { strict = false, include, exclude = [] } = options;

  const result = {};
  const errors = [];
  const warnings = [];

  // Determiner les placeholders a traiter
  let placeholders = Object.keys(MAPPING_SCHEMA);
  if (include && Array.isArray(include)) {
    placeholders = placeholders.filter(p => include.includes(p));
  }
  placeholders = placeholders.filter(p => !exclude.includes(p));

  // Traiter chaque placeholder
  for (const placeholder of placeholders) {
    const config = MAPPING_SCHEMA[placeholder];
    if (!config) continue;

    // Extraire la valeur brute
    let rawValue = getValueByPath(dataSources, config.source);

    // Verifier si la valeur est manquante
    const isMissing = rawValue === null || rawValue === undefined || rawValue === '';

    if (isMissing) {
      if (config.required && strict) {
        errors.push(`Valeur requise manquante: ${placeholder} (source: ${config.source})`);
      } else if (config.required) {
        warnings.push(`Valeur requise manquante, fallback utilise: ${placeholder}`);
      }
      // Utiliser le fallback
      rawValue = config.fallback;
    }

    // Appliquer la transformation selon le type
    const transformer = TYPE_TRANSFORMERS[config.type] || TYPE_TRANSFORMERS.text;
    let transformedValue;

    try {
      transformedValue = transformer(rawValue);
    } catch (err) {
      warnings.push(`Erreur de transformation pour ${placeholder}: ${err.message}`);
      transformedValue = config.fallback || '';
    }

    // Appliquer une transformation custom si definie
    if (config.transform && typeof config.transform === 'function') {
      try {
        transformedValue = config.transform(transformedValue, dataSources);
      } catch (err) {
        warnings.push(`Erreur de transformation custom pour ${placeholder}: ${err.message}`);
      }
    }

    result[placeholder] = transformedValue;
  }

  // En mode strict, lever une erreur si des champs requis sont manquants
  if (strict && errors.length > 0) {
    const error = new Error(`Mapping validation failed: ${errors.join('; ')}`);
    error.validationErrors = errors;
    throw error;
  }

  return {
    data: result,
    warnings,
    errors
  };
}

/**
 * Fonction principale: mappe les donnees JSON vers les placeholders Word
 * Combine prepareDataSources et applyMapping en une seule operation
 *
 * @param {Object} params - Parametres d'entree
 * @param {Object} [params.aiSections] - Sections generees par l'IA
 * @param {Object} [params.formData] - Donnees du formulaire
 * @param {Object} [params.financialData] - Donnees financieres pre-calculees
 * @param {Object} [params.options] - Options de mapping
 * @returns {Object} Resultat du mapping avec data, warnings, errors
 *
 * @example
 * const result = mapToTemplate({
 *   aiSections: { titre: 'Proposition R&D', contexte: '...' },
 *   formData: { entrepriseNom: 'Acme Corp', dureeSemaines: 20 }
 * });
 * // result.data contient les donnees prete pour docxtemplater
 */
function mapToTemplate(params) {
  const dataSources = prepareDataSources(params);
  return applyMapping(dataSources, params.options);
}

/**
 * Valide que toutes les cles du mapping correspondent a des placeholders du template
 *
 * @param {string[]} templatePlaceholders - Liste des placeholders extraits du template
 * @returns {Object} Rapport de validation
 */
function validateMappingCoverage(templatePlaceholders) {
  const schemaKeys = new Set(Object.keys(MAPPING_SCHEMA));
  const templateKeys = new Set(templatePlaceholders);

  const covered = [];
  const missing = [];
  const extra = [];

  // Placeholders du template couverts par le schema
  for (const placeholder of templateKeys) {
    if (schemaKeys.has(placeholder)) {
      covered.push(placeholder);
    } else {
      missing.push(placeholder);
    }
  }

  // Cles du schema non presentes dans le template (extra, pas un probleme)
  for (const key of schemaKeys) {
    if (!templateKeys.has(key)) {
      extra.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    covered,
    missing, // Placeholders du template sans mapping defini
    extra,   // Cles du schema non utilisees dans le template
    coveragePercent: templateKeys.size > 0
      ? Math.round((covered.length / templateKeys.size) * 100)
      : 100
  };
}

/**
 * Retourne le schema de mapping actuel
 * Utile pour la documentation et le debug
 *
 * @returns {Object} Schema de mapping
 */
function getMappingSchema() {
  return { ...MAPPING_SCHEMA };
}

/**
 * Ajoute ou modifie une entree dans le schema de mapping
 * Permet d'etendre le mapping pour de nouveaux placeholders
 *
 * @param {string} placeholder - Nom du placeholder
 * @param {Object} config - Configuration du mapping
 */
function extendMapping(placeholder, config) {
  if (!placeholder || typeof placeholder !== 'string') {
    throw new Error('Le nom du placeholder est requis');
  }
  if (!config || typeof config !== 'object') {
    throw new Error('La configuration est requise');
  }
  if (!config.source) {
    throw new Error('La source est requise dans la configuration');
  }

  MAPPING_SCHEMA[placeholder] = {
    source: config.source,
    type: config.type || 'text',
    fallback: config.fallback !== undefined ? config.fallback : '',
    required: config.required || false,
    description: config.description || '',
    transform: config.transform
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Fonctions principales
  mapToTemplate,
  prepareDataSources,
  applyMapping,

  // Utilitaires
  getValueByPath,
  validateMappingCoverage,
  getMappingSchema,
  extendMapping,

  // Schema (pour tests et documentation)
  MAPPING_SCHEMA,
  TYPE_TRANSFORMERS
};
