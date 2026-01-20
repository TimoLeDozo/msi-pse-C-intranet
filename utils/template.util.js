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
    return formatValue(value);
  });
}

module.exports = {
  escapeHtml,
  formatValue,
  renderTemplate
};
