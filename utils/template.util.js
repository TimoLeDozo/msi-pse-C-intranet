const { marked } = require('marked');

// Configuration de marked pour un rendu propre
marked.setOptions({
  gfm: true,           // GitHub Flavored Markdown
  breaks: true,        // Convertir les retours à la ligne en <br>
  headerIds: false,    // Pas d'IDs sur les headers (évite les conflits)
  mangle: false        // Ne pas encoder les emails
});

// Champs qui doivent être rendus en Markdown (sections IA)
const MARKDOWN_FIELDS = [
  'contexte',
  'demarche',
  'phases',
  'titre',
  'phrase',
  'annexe_supplementaire'
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatValue(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

/**
 * Convertit le Markdown en HTML sémantique
 * @param {string} value - Texte Markdown
 * @returns {string} HTML formaté
 */
function renderMarkdown(value) {
  if (!value || typeof value !== 'string') return '';

  // Nettoyer le texte avant conversion
  const cleanText = value.trim();

  // Convertir via marked
  const html = marked.parse(cleanText);

  return html;
}

function renderTemplate(template, data) {
  if (!template) return '';
  const safeData = data || {};

  return template.replace(/{{\s*([^}]+?)\s*}}/g, (_, key) => {
    const trimmed = key.trim();
    if (!Object.prototype.hasOwnProperty.call(safeData, trimmed)) {
      return '';
    }
    const value = safeData[trimmed];
    if (value === null || value === undefined) return '';

    // Utiliser le rendu Markdown pour les sections IA
    if (MARKDOWN_FIELDS.includes(trimmed)) {
      return renderMarkdown(value);
    }

    return formatValue(value);
  });
}

module.exports = {
  escapeHtml,
  formatValue,
  renderMarkdown,
  renderTemplate,
  MARKDOWN_FIELDS
};
