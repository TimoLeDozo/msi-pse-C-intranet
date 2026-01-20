/**
 * Validation Service
 * Valide les données d'entrée avant traitement
 */

// const Joi = require('joi'); // Pas de Joi dans package.json, validation manuelle

/**
 * Valide le brouillon de proposition
 * @param {Object} draft 
 * @throws {Error} si invalide
 */
function validateProposalDraft(draft) {
  if (!draft) {
    throw new Error('Le brouillon est requis');
  }

  const errors = [];

  const entrepriseNom = typeof draft.entrepriseNom === 'string' ? draft.entrepriseNom.trim() : '';
  if (!entrepriseNom) errors.push('entrepriseNom manquant');

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

module.exports = {
  validateProposalDraft
};
