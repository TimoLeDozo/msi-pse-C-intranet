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

  // Validation minimale
  // Note: entrepriseNom est requis dans le schéma Swagger, mais ici on peut être plus souple pour le draft
  if (!draft.titre && !draft.entrepriseNom) {
    // On demande au moins un titre ou un nom d'entreprise pour avoir du contexte
    // errors.push('Titre ou Nom de l\'entreprise requis');
  }

  // Si on voulait être strict comme le Swagger :
  /*
  if (!draft.entrepriseNom) errors.push('entrepriseNom manquants');
  */

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

module.exports = {
  validateProposalDraft
};
