const CLAUSE_RD = '{{entrepriseNom}} conserve le benefice exclusif des travaux et services decrits ci-dessus. Tous les droits de propriete industrielle ou intellectuelle issus des resultats sont transferes au client apres paiement integral des travaux. L\'Icam conserve la propriete de ses savoir-faire, methodes, outils et elements preexistants.';

const CLAUSE_DIAGNOSTIC = 'Les methodes, outils, grilles d\'analyse et savoir-faire de l\'Icam restent sa propriete exclusive. {{entrepriseNom}} dispose d\'un droit d\'usage interne des livrables pour ses besoins propres apres paiement integral. Toute reproduction ou diffusion a des tiers est soumise a l\'accord ecrit de l\'Icam.';

const LEGAL_CLAUSES = {
  default: {
    clause_propriete_intellectuelle: CLAUSE_RD
  },
  RD: {
    clause_propriete_intellectuelle: CLAUSE_RD
  },
  Lean: {
    clause_propriete_intellectuelle: CLAUSE_DIAGNOSTIC
  },
  Audit: {
    clause_propriete_intellectuelle: CLAUSE_DIAGNOSTIC
  },
  'Supply Chain': {
    clause_propriete_intellectuelle: CLAUSE_DIAGNOSTIC
  }
};

function normalizeContractType(typeContrat) {
  if (!typeContrat) return 'RD';

  const raw = String(typeContrat).trim();
  if (!raw) return 'RD';

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const directMatch = Object.keys(LEGAL_CLAUSES).find((key) => (
    key !== 'default' && key.toLowerCase() === normalized
  ));
  if (directMatch) return directMatch;

  if (normalized.includes('lean')) return 'Lean';
  if (normalized.includes('audit') || normalized.includes('diagnostic')) return 'Audit';
  if (normalized.includes('supply') || normalized.includes('logistique') || normalized.includes('chain')) {
    return 'Supply Chain';
  }
  if (
    normalized.includes('r&d')
    || /\brd\b/.test(normalized)
    || normalized.includes('recherche')
    || normalized.includes('developp')
    || normalized.includes('innovation')
  ) {
    return 'RD';
  }

  return 'RD';
}

function interpolateClause(template, entrepriseNom) {
  const label = entrepriseNom && String(entrepriseNom).trim()
    ? String(entrepriseNom).trim()
    : "l'entreprise";

  return template.replace(/{{\s*entrepriseNom\s*}}/g, label);
}

function getLegalClauses({ typeContrat, entrepriseNom } = {}) {
  const key = normalizeContractType(typeContrat);
  const clauses = LEGAL_CLAUSES[key] || LEGAL_CLAUSES.default;

  return {
    clause_propriete_intellectuelle: interpolateClause(
      clauses.clause_propriete_intellectuelle,
      entrepriseNom
    )
  };
}

module.exports = {
  LEGAL_CLAUSES,
  normalizeContractType,
  getLegalClauses
};
