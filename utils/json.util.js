function safeJsonParse(text) {
  const raw = String(text ?? '').trim();
  if (!raw) {
    throw new Error('JSON invalide');
  }

  try {
    return JSON.parse(raw);
  } catch (_) {}

  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {}
  }

  throw new Error('JSON invalide');
}

module.exports = {
  safeJsonParse
};
