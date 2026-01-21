const ANNEX_THRESHOLD_EUR = 15000;

const ANNEX_TYPES = {
  RISKS: 'risques',
  TEAM: 'equipe'
};

const RISK_MATRIX_ROWS = [
  {
    risk: 'Acces aux donnees incomplet',
    impact: 'Retard sur le planning',
    mitigation: 'Plan de collecte et validation rapide des donnees',
    owner: 'Client/Icam'
  },
  {
    risk: 'Disponibilite des experts',
    impact: 'Qualite des analyses',
    mitigation: 'Planification des ateliers et points d entree clairs',
    owner: 'Client'
  },
  {
    risk: 'Changement de perimetre',
    impact: 'Derive budget et delais',
    mitigation: 'Comite de pilotage et validation des changements',
    owner: 'Icam/Client'
  },
  {
    risk: 'Contraintes techniques non identifiees',
    impact: 'Reprise des livrables',
    mitigation: 'Phase de cadrage et visites terrain detaillees',
    owner: 'Icam'
  }
];

const TEAM_ROWS = [
  {
    role: 'Charge d affaires',
    responsibility: 'Pilotage commercial et administratif',
    owner: 'Icam'
  },
  {
    role: 'Chef de projet',
    responsibility: 'Coordination technique et planning',
    owner: 'Icam'
  },
  {
    role: 'Referent technique',
    responsibility: 'Expertise et validation methodologique',
    owner: 'Icam'
  },
  {
    role: 'Contact client',
    responsibility: 'Acces aux donnees et validations',
    owner: 'Client'
  }
];

function normalizeAnnexType(value) {
  if (!value) return '';
  const raw = String(value).trim().toLowerCase();
  if (!raw) return '';

  if (raw.includes('equipe') || raw.includes('team')) return ANNEX_TYPES.TEAM;
  if (raw.includes('risque') || raw.includes('risk')) return ANNEX_TYPES.RISKS;

  return '';
}

function shouldIncludeAnnex(budgetRaw) {
  const budget = Number(budgetRaw);
  if (!Number.isFinite(budget)) return false;
  return budget > ANNEX_THRESHOLD_EUR;
}

function buildRiskMatrixAnnex() {
  const rows = RISK_MATRIX_ROWS.map((row) => `
    <tr>
      <td>${row.risk}</td>
      <td>${row.impact}</td>
      <td>${row.mitigation}</td>
      <td>${row.owner}</td>
    </tr>
  `).join('');

  return `
<div class="section-title">Annexe - Matrice des risques</div>
<table class="table payment-schedule">
  <thead>
    <tr>
      <th>Risque</th>
      <th>Impact</th>
      <th>Mesure de mitigation</th>
      <th>Pilote</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
<div class="block">Ce tableau est a ajuster selon le contexte et le perimetre du projet.</div>
<div class="page-break"></div>
  `.trim();
}

function buildTeamAnnex() {
  const rows = TEAM_ROWS.map((row) => `
    <tr>
      <td>${row.role}</td>
      <td>${row.responsibility}</td>
      <td>${row.owner}</td>
    </tr>
  `).join('');

  return `
<div class="section-title">Annexe - Equipe projet</div>
<table class="table payment-schedule">
  <thead>
    <tr>
      <th>Role</th>
      <th>Responsabilite</th>
      <th>Organisation</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
<div class="block">Les noms sont confirmes lors du lancement du projet.</div>
<div class="page-break"></div>
  `.trim();
}

function buildSupplementaryAnnex({ budgetRaw, annexeType } = {}) {
  if (!shouldIncludeAnnex(budgetRaw)) {
    return '';
  }

  const normalizedType = normalizeAnnexType(annexeType);
  if (normalizedType === ANNEX_TYPES.TEAM) {
    return buildTeamAnnex();
  }

  return buildRiskMatrixAnnex();
}

module.exports = {
  ANNEX_THRESHOLD_EUR,
  ANNEX_TYPES,
  normalizeAnnexType,
  shouldIncludeAnnex,
  buildRiskMatrixAnnex,
  buildTeamAnnex,
  buildSupplementaryAnnex
};
