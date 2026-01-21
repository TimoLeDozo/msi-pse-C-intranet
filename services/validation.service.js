/**
 * Validation Service
 * Valide les données d'entrée avant traitement
 */

/**
 * Types de contrat autorisés
 */
const VALID_CONTRACT_TYPES = ['RD', 'Lean', 'Audit', 'Supply Chain'];

/**
 * Valide le format email
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return true; // Optionnel
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valide le format téléphone français
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return true; // Optionnel
  // Accepte formats: 0612345678, 06 12 34 56 78, +33 6 12 34 56 78
  const phoneRegex = /^(\+33|0)[1-9](\s?[0-9]{2}){4}$/;
  return phoneRegex.test(phone.trim().replace(/\./g, ' '));
}

/**
 * Valide la cohérence entre durée totale et somme des phases
 * @param {number} dureeTotale - Durée totale en semaines
 * @param {Array} phases - Liste des phases avec leurs durées
 * @returns {{valid: boolean, message?: string}}
 */
function validateDurationCoherence(dureeTotale, phases) {
  if (!dureeTotale || !phases || !Array.isArray(phases) || phases.length === 0) {
    return { valid: true }; // Pas assez de données pour valider
  }

  const sommePhasesWeeks = phases.reduce((sum, phase) => {
    const duration = parseInt(phase.duree || phase.dureeSemaines || 0, 10);
    return sum + duration;
  }, 0);

  const totalWeeks = parseInt(dureeTotale, 10);

  if (sommePhasesWeeks > 0 && sommePhasesWeeks !== totalWeeks) {
    return {
      valid: false,
      message: `Incohérence de durée: la somme des phases (${sommePhasesWeeks} semaines) ne correspond pas à la durée totale (${totalWeeks} semaines)`
    };
  }

  return { valid: true };
}

/**
 * Valide la cohérence du budget par rapport à la durée
 * @param {number} budget - Budget en euros
 * @param {number} dureeSemaines - Durée en semaines
 * @returns {{valid: boolean, warning?: string}}
 */
function validateBudgetCoherence(budget, dureeSemaines) {
  if (!budget || !dureeSemaines) return { valid: true };

  const budgetNum = parseFloat(budget);
  const dureeNum = parseInt(dureeSemaines, 10);

  // Coût hebdomadaire moyen attendu ~833€/semaine (20000€/24 semaines)
  const expectedWeeklyCost = 20000 / 24;
  const actualWeeklyCost = budgetNum / dureeNum;

  // Alerte si écart > 50%
  if (actualWeeklyCost < expectedWeeklyCost * 0.5 || actualWeeklyCost > expectedWeeklyCost * 1.5) {
    return {
      valid: true, // On n'empêche pas, juste un avertissement
      warning: `Budget inhabituel: ${Math.round(actualWeeklyCost)}€/semaine (attendu ~${Math.round(expectedWeeklyCost)}€/semaine)`
    };
  }

  return { valid: true };
}

/**
 * Valide le brouillon de proposition
 * @param {Object} draft
 * @param {Object} options - Options de validation
 * @param {boolean} options.strict - Mode strict (rejette les warnings)
 * @throws {Error} si invalide
 * @returns {{valid: boolean, warnings: string[]}}
 */
function validateProposalDraft(draft, options = {}) {
  if (!draft) {
    throw new Error('Le brouillon est requis');
  }

  const errors = [];
  const warnings = [];

  // === Champs obligatoires ===
  const entrepriseNom = typeof draft.entrepriseNom === 'string' ? draft.entrepriseNom.trim() : '';
  if (!entrepriseNom) errors.push('entrepriseNom manquant');

  // === Type de contrat ===
  if (draft.typeContrat && !VALID_CONTRACT_TYPES.includes(draft.typeContrat)) {
    warnings.push(`Type de contrat non standard: "${draft.typeContrat}" (attendu: ${VALID_CONTRACT_TYPES.join(', ')})`);
  }

  // === Validation email ===
  if (draft.clientEmail && !isValidEmail(draft.clientEmail)) {
    errors.push(`Format email invalide: ${draft.clientEmail}`);
  }

  // === Validation téléphone ===
  if (draft.clientTelephone && !isValidPhone(draft.clientTelephone)) {
    warnings.push(`Format téléphone inhabituel: ${draft.clientTelephone}`);
  }

  // === Cohérence durée/phases ===
  const durationCheck = validateDurationCoherence(draft.dureeSemaines, draft.phases);
  if (!durationCheck.valid) {
    errors.push(durationCheck.message);
  }

  // === Cohérence budget ===
  const budgetCheck = validateBudgetCoherence(draft.budget, draft.dureeSemaines);
  if (budgetCheck.warning) {
    warnings.push(budgetCheck.warning);
  }

  // === Date de début ===
  if (draft.dateDebut) {
    const dateDebut = new Date(draft.dateDebut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(dateDebut.getTime())) {
      errors.push('Format de date de début invalide');
    } else if (dateDebut < today) {
      warnings.push('La date de début est dans le passé');
    }
  }

  // === Traitement des erreurs ===
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join('; ')}`);
  }

  // Mode strict : les warnings deviennent des erreurs
  if (options.strict && warnings.length > 0) {
    throw new Error(`Validation warnings (mode strict): ${warnings.join('; ')}`);
  }

  return { valid: true, warnings };
}

module.exports = {
  validateProposalDraft,
  validateDurationCoherence,
  validateBudgetCoherence,
  isValidEmail,
  isValidPhone,
  VALID_CONTRACT_TYPES
};
