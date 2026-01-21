const {
  ANNEX_THRESHOLD_EUR,
  normalizeAnnexType,
  shouldIncludeAnnex,
  buildSupplementaryAnnex
} = require('../../services/annex.service');

describe('annex.service', () => {
  it('should normalize annex types', () => {
    expect(normalizeAnnexType('equipe')).toBe('equipe');
    expect(normalizeAnnexType('TEAM')).toBe('equipe');
    expect(normalizeAnnexType('risques')).toBe('risques');
    expect(normalizeAnnexType('risk')).toBe('risques');
    expect(normalizeAnnexType('')).toBe('');
  });

  it('should include annex only above threshold', () => {
    expect(shouldIncludeAnnex(ANNEX_THRESHOLD_EUR)).toBe(false);
    expect(shouldIncludeAnnex(ANNEX_THRESHOLD_EUR + 1)).toBe(true);
  });

  it('should return empty annex below threshold', () => {
    const result = buildSupplementaryAnnex({ budgetRaw: 15000 });
    expect(result).toBe('');
  });

  it('should return risk annex above threshold by default', () => {
    const result = buildSupplementaryAnnex({ budgetRaw: 20000 });
    expect(result).toContain('Matrice des risques');
    expect(result).toContain('<table');
  });

  it('should return team annex when annexeType is equipe', () => {
    const result = buildSupplementaryAnnex({ budgetRaw: 20000, annexeType: 'equipe' });
    expect(result).toContain('Equipe projet');
  });
});
