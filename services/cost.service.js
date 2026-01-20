/**
 * Cost Service (Finance Service)
 * Gestion des calculs financiers pour les propositions commerciales
 *
 * Implémente la logique métier de la Phase 1 de la roadmap:
 * - Automatisation Financière (Base 20k/24 sem)
 * - Échéancier Dynamique (30% commande, phases, 20% solde)
 * - Conversion en Lettres (mention légale française)
 * - Formatage Dates Littérales Françaises
 */

// Constantes métier
const BASE_BUDGET = 20000; // Euros
const BASE_DURATION_WEEKS = 24;

// Mois français pour le formatage des dates (avec accents)
const FRENCH_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/**
 * Convertit un nombre entier en lettres françaises
 * Supporte les nombres de 0 à 999 999 999
 * @param {number} n - Nombre entier positif
 * @returns {string} Nombre en lettres françaises
 * @private
 */
function numberToFrenchWords(n) {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + numberToFrenchWords(-n);

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  function convertHundreds(num) {
    if (num === 0) return '';
    if (num < 20) return units[num];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;

      // Special cases for French: 70-79 and 90-99
      if (ten === 7 || ten === 9) {
        const base = ten === 7 ? 'soixante' : 'quatre-vingt';
        const remainder = 10 + unit;
        if (remainder === 10) return base + '-dix';
        if (remainder === 11) return base + (ten === 7 ? ' et onze' : '-onze');
        return base + '-' + units[remainder];
      }

      if (unit === 0) {
        return tens[ten] + (ten === 8 ? 's' : '');
      }
      if (unit === 1 && ten !== 8) {
        return tens[ten] + ' et un';
      }
      return tens[ten] + '-' + units[unit];
    }

    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    let result = '';

    if (hundred === 1) {
      result = 'cent';
    } else {
      result = units[hundred] + ' cent';
      if (remainder === 0) result += 's';
    }

    if (remainder > 0) {
      result += ' ' + convertHundreds(remainder);
    }

    return result;
  }

  function convertThousands(num) {
    if (num < 1000) return convertHundreds(num);

    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    let result = '';

    if (thousands === 1) {
      result = 'mille';
    } else {
      result = convertHundreds(thousands) + ' mille';
    }

    if (remainder > 0) {
      result += ' ' + convertHundreds(remainder);
    }

    return result;
  }

  function convertMillions(num) {
    if (num < 1000000) return convertThousands(num);

    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    let result = '';

    if (millions === 1) {
      result = 'un million';
    } else {
      result = convertThousands(millions) + ' millions';
    }

    if (remainder > 0) {
      result += ' ' + convertThousands(remainder);
    }

    return result;
  }

  return convertMillions(Math.floor(n));
}

/**
 * Calcule le budget total en fonction de la durée et du nombre d'équipes
 * Formule: Math.round((20000 / 24) * dureeSemaines * nbEquipes)
 *
 * @param {number} dureeSemaines - Durée du projet en semaines
 * @param {number} [nbEquipes=1] - Nombre d'équipes mobilisées
 * @returns {number} Budget total arrondi à l'euro
 * @throws {Error} Si les paramètres sont invalides
 *
 * @example
 * calculateBudget(24, 1)  // => 20000
 * calculateBudget(12, 2)  // => 20000
 * calculateBudget(20, 1)  // => 16667
 */
function calculateBudget(dureeSemaines, nbEquipes = 1) {
  if (typeof dureeSemaines !== 'number' || dureeSemaines <= 0) {
    throw new Error('La durée en semaines doit être un nombre positif');
  }
  if (typeof nbEquipes !== 'number' || nbEquipes <= 0) {
    throw new Error('Le nombre d\'équipes doit être un nombre positif');
  }

  const total = Math.round((BASE_BUDGET / BASE_DURATION_WEEKS) * dureeSemaines * nbEquipes);
  return total;
}

/**
 * Génère l'échéancier de paiement selon les règles métier Icam
 * - 30% à la commande
 * - 50% répartis sur les phases
 * - 20% au solde final
 *
 * @param {number} totalBudget - Budget total en euros
 * @param {number} [nbPhases=1] - Nombre de phases de livraison
 * @returns {Array<{label: string, pct: number, amount: number}>} Tableau des échéances
 * @throws {Error} Si les paramètres sont invalides
 *
 * @example
 * getPaymentSchedule(20000, 2)
 * // => [
 * //   { label: 'À la commande', pct: 30, amount: 6000 },
 * //   { label: 'Livraison Phase 1', pct: 25, amount: 5000 },
 * //   { label: 'Livraison Phase 2', pct: 25, amount: 5000 },
 * //   { label: 'Solde à la réception finale', pct: 20, amount: 4000 }
 * // ]
 */
function getPaymentSchedule(totalBudget, nbPhases = 1) {
  if (typeof totalBudget !== 'number' || totalBudget <= 0) {
    throw new Error('Le budget total doit être un nombre positif');
  }
  if (typeof nbPhases !== 'number' || nbPhases < 1 || !Number.isInteger(nbPhases)) {
    throw new Error('Le nombre de phases doit être un entier positif');
  }

  const schedule = [];

  // 30% à la commande
  const commandePct = 30;
  const commandeAmount = Math.round(totalBudget * commandePct / 100);
  schedule.push({
    label: 'À la commande',
    pct: commandePct,
    amount: commandeAmount
  });

  // 50% répartis sur les phases
  const phasesPctTotal = 50;
  const phasePct = phasesPctTotal / nbPhases;
  let phasesAmountDistributed = 0;

  for (let i = 1; i <= nbPhases; i++) {
    let phaseAmount;
    if (i === nbPhases) {
      // Last phase gets the remainder to avoid rounding issues
      phaseAmount = Math.round(totalBudget * phasesPctTotal / 100) - phasesAmountDistributed;
    } else {
      phaseAmount = Math.round(totalBudget * phasePct / 100);
      phasesAmountDistributed += phaseAmount;
    }

    schedule.push({
      label: `Livraison Phase ${i}`,
      pct: Math.round(phasePct * 100) / 100, // Arrondi à 2 décimales
      amount: phaseAmount
    });
  }

  // 20% solde final
  const soldePct = 20;
  const soldeAmount = Math.round(totalBudget * soldePct / 100);
  schedule.push({
    label: 'Solde à la réception finale',
    pct: soldePct,
    amount: soldeAmount
  });

  return schedule;
}

/**
 * Convertit un montant en euros en lettres françaises pour mention légale
 * Format: "montant en lettres euros"
 *
 * @param {number} amount - Montant en euros (entier)
 * @returns {string} Montant en lettres avec "euros"
 * @throws {Error} Si le montant est invalide
 *
 * @example
 * formatBudgetInLetters(16667)
 * // => "seize mille six cent soixante-sept euros"
 *
 * formatBudgetInLetters(20000)
 * // => "vingt mille euros"
 */
function formatBudgetInLetters(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error('Le montant doit être un nombre valide');
  }

  // Arrondir à l'entier si nécessaire
  const roundedAmount = Math.round(amount);

  if (roundedAmount < 0) {
    throw new Error('Le montant ne peut pas être négatif');
  }

  const words = numberToFrenchWords(roundedAmount);

  // "euro" au singulier si 1, "euros" sinon
  const euroLabel = roundedAmount === 1 ? 'euro' : 'euros';

  return `${words} ${euroLabel}`;
}

/**
 * Formate une date en format littéral français
 * Format: "jour mois année" (ex: "15 septembre 2025")
 *
 * @param {Date} [date=new Date()] - Date à formater
 * @returns {string} Date au format littéral français
 * @throws {Error} Si la date est invalide
 *
 * @example
 * formatFrenchDate(new Date('2025-09-15'))
 * // => "15 septembre 2025"
 *
 * formatFrenchDate(new Date('2026-01-01'))
 * // => "1er janvier 2026"
 */
function formatFrenchDate(date = new Date()) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Date invalide');
  }

  const day = date.getDate();
  const month = FRENCH_MONTHS[date.getMonth()];
  const year = date.getFullYear();

  // Cas spécial: premier du mois en français = "1er"
  const dayStr = day === 1 ? '1er' : day.toString();

  return `${dayStr} ${month} ${year}`;
}

// ============================================================================
// Fonctions utilitaires supplémentaires (compatibilité avec ancien code)
// ============================================================================

/**
 * Format a number as currency in French format
 * @param {number} amount - Amount in euros
 * @returns {string} Formatted currency string (e.g., "20 000 EUR")
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format payment schedule as readable string for document
 * @param {Array<{label: string, pct: number, amount: number}>} schedule - Payment schedule
 * @returns {string} Formatted schedule text
 */
function formatPaymentScheduleText(schedule) {
  return schedule.map(item =>
    `- ${item.label} : ${formatCurrency(item.amount)} (${item.pct}%)`
  ).join('\n');
}

/**
 * Get complete financial data for a proposal
 * @param {Object} params - Parameters
 * @param {number} params.dureeSemaines - Duration in weeks
 * @param {number} [params.nbEquipes=1] - Number of teams
 * @param {number} [params.budgetOverride] - Optional budget override
 * @param {number} [params.nbPhases=1] - Number of phases
 * @returns {Object} Complete financial data for document
 */
function getFinancialData({ dureeSemaines, nbEquipes = 1, budgetOverride, nbPhases = 1 }) {
  const budget = budgetOverride || calculateBudget(dureeSemaines, nbEquipes);
  const schedule = getPaymentSchedule(budget, nbPhases);

  return {
    budget: formatCurrency(budget),
    budgetRaw: budget,
    budgetEnLettres: formatBudgetInLetters(budget),
    echeancier: formatPaymentScheduleText(schedule),
    echeancierDetails: schedule,
    DateDuJour: formatFrenchDate(new Date())
  };
}

// Alias for backward compatibility
const formatDateFrench = formatFrenchDate;
const calculatePaymentSchedule = (totalBudget, phaseCount = 3) => {
  const schedule = getPaymentSchedule(totalBudget, phaseCount);
  return {
    order: schedule[0].amount,
    phases: schedule.slice(1, -1).map(p => p.amount),
    final: schedule[schedule.length - 1].amount,
    total: totalBudget
  };
};

module.exports = {
  // Main functions (as specified in requirements)
  calculateBudget,
  getPaymentSchedule,
  formatBudgetInLetters,
  formatFrenchDate,

  // Utility functions
  formatCurrency,
  formatPaymentScheduleText,
  getFinancialData,
  numberToFrenchWords,

  // Backward compatibility aliases
  formatDateFrench,
  calculatePaymentSchedule,

  // Constants exported for tests/configuration
  BASE_BUDGET,
  BASE_DURATION_WEEKS,
  FRENCH_MONTHS
};
