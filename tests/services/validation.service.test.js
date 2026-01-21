const {
  validateProposalDraft,
  validateDurationCoherence,
  validateBudgetCoherence,
  isValidEmail,
  isValidPhone,
  VALID_CONTRACT_TYPES
} = require('../../services/validation.service');

describe('validation.service', () => {
  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.fr')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });

    it('should accept empty/null (optional field)', () => {
      expect(isValidEmail('')).toBe(true);
      expect(isValidEmail(null)).toBe(true);
      expect(isValidEmail(undefined)).toBe(true);
    });
  });

  describe('isValidPhone', () => {
    it('should accept French phone formats', () => {
      expect(isValidPhone('0612345678')).toBe(true);
      expect(isValidPhone('06 12 34 56 78')).toBe(true);
      expect(isValidPhone('+336 12 34 56 78')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('0012345678')).toBe(false);
    });

    it('should accept empty/null (optional field)', () => {
      expect(isValidPhone('')).toBe(true);
      expect(isValidPhone(null)).toBe(true);
    });
  });

  describe('validateDurationCoherence', () => {
    it('should validate matching duration', () => {
      const result = validateDurationCoherence(12, [
        { duree: 4 },
        { duree: 4 },
        { duree: 4 }
      ]);
      expect(result.valid).toBe(true);
    });

    it('should detect duration mismatch', () => {
      const result = validateDurationCoherence(12, [
        { duree: 2 },
        { duree: 2 }
      ]);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Incohérence');
    });

    it('should handle missing data gracefully', () => {
      expect(validateDurationCoherence(null, null).valid).toBe(true);
      expect(validateDurationCoherence(12, []).valid).toBe(true);
    });

    it('should handle dureeSemaines field', () => {
      const result = validateDurationCoherence(8, [
        { dureeSemaines: 4 },
        { dureeSemaines: 4 }
      ]);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateBudgetCoherence', () => {
    it('should accept normal budget range', () => {
      const result = validateBudgetCoherence(20000, 24);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should warn on unusually low budget', () => {
      const result = validateBudgetCoherence(5000, 24);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('Budget inhabituel');
    });

    it('should warn on unusually high budget', () => {
      const result = validateBudgetCoherence(100000, 24);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('Budget inhabituel');
    });

    it('should handle missing data', () => {
      expect(validateBudgetCoherence(null, 24).valid).toBe(true);
      expect(validateBudgetCoherence(20000, null).valid).toBe(true);
    });
  });

  describe('validateProposalDraft', () => {
    const validDraft = {
      entrepriseNom: 'Acme Corp',
      typeContrat: 'RD',
      clientEmail: 'contact@acme.com',
      dureeSemaines: 12
    };

    it('should accept valid draft', () => {
      const result = validateProposalDraft(validDraft);
      expect(result.valid).toBe(true);
    });

    it('should reject missing draft', () => {
      expect(() => validateProposalDraft(null)).toThrow('brouillon est requis');
    });

    it('should reject missing entrepriseNom', () => {
      expect(() => validateProposalDraft({})).toThrow('entrepriseNom manquant');
    });

    it('should reject invalid email', () => {
      expect(() => validateProposalDraft({
        ...validDraft,
        clientEmail: 'invalid'
      })).toThrow('Format email invalide');
    });

    it('should warn on non-standard contract type', () => {
      const result = validateProposalDraft({
        ...validDraft,
        typeContrat: 'Custom'
      });
      expect(result.warnings.some(w => w.includes('Type de contrat non standard'))).toBe(true);
    });

    it('should reject duration mismatch', () => {
      expect(() => validateProposalDraft({
        ...validDraft,
        dureeSemaines: 12,
        phases: [
          { duree: 2 },
          { duree: 2 }
        ]
      })).toThrow('Incohérence de durée');
    });

    it('should include budget warning', () => {
      const result = validateProposalDraft({
        ...validDraft,
        budget: 5000,
        dureeSemaines: 24
      });
      expect(result.warnings.some(w => w.includes('Budget inhabituel'))).toBe(true);
    });

    it('should warn on past start date', () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const result = validateProposalDraft({
        ...validDraft,
        dateDebut: pastDate.toISOString()
      });
      expect(result.warnings.some(w => w.includes('date de début est dans le passé'))).toBe(true);
    });

    it('should reject in strict mode with warnings', () => {
      expect(() => validateProposalDraft({
        ...validDraft,
        typeContrat: 'Custom'
      }, { strict: true })).toThrow('mode strict');
    });
  });

  describe('VALID_CONTRACT_TYPES', () => {
    it('should contain expected types', () => {
      expect(VALID_CONTRACT_TYPES).toContain('RD');
      expect(VALID_CONTRACT_TYPES).toContain('Lean');
      expect(VALID_CONTRACT_TYPES).toContain('Audit');
      expect(VALID_CONTRACT_TYPES).toContain('Supply Chain');
    });
  });
});
