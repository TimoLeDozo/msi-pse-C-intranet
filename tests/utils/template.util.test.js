const {
  escapeHtml,
  formatValue,
  renderMarkdown,
  renderTemplate,
  MARKDOWN_FIELDS
} = require('../../utils/template.util');

describe('template.util', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('formatValue', () => {
    it('should convert newlines to br tags', () => {
      expect(formatValue('line1\nline2')).toBe('line1<br>line2');
    });

    it('should handle Windows line endings', () => {
      expect(formatValue('line1\r\nline2')).toBe('line1<br>line2');
    });

    it('should escape HTML and convert newlines', () => {
      expect(formatValue('<b>bold</b>\nnext')).toBe('&lt;b&gt;bold&lt;/b&gt;<br>next');
    });
  });

  describe('renderMarkdown', () => {
    it('should convert headers to HTML', () => {
      const result = renderMarkdown('## Titre');
      expect(result).toContain('<h2>');
      expect(result).toContain('Titre');
    });

    it('should convert bold text', () => {
      const result = renderMarkdown('**texte en gras**');
      expect(result).toContain('<strong>texte en gras</strong>');
    });

    it('should convert lists', () => {
      const result = renderMarkdown('- item 1\n- item 2');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('should handle empty input', () => {
      expect(renderMarkdown('')).toBe('');
      expect(renderMarkdown(null)).toBe('');
      expect(renderMarkdown(undefined)).toBe('');
    });

    it('should convert line breaks', () => {
      const result = renderMarkdown('ligne 1\nligne 2');
      expect(result).toContain('<br');
    });
  });

  describe('renderTemplate', () => {
    it('should replace simple placeholders', () => {
      const template = 'Bonjour {{nom}}!';
      const data = { nom: 'Jean' };
      expect(renderTemplate(template, data)).toBe('Bonjour Jean!');
    });

    it('should handle missing placeholders gracefully', () => {
      const template = 'Bonjour {{nom}}!';
      const data = {};
      expect(renderTemplate(template, data)).toBe('Bonjour !');
    });

    it('should escape HTML in non-markdown fields', () => {
      const template = '{{entrepriseNom}}';
      const data = { entrepriseNom: '<script>xss</script>' };
      expect(renderTemplate(template, data)).toBe('&lt;script&gt;xss&lt;/script&gt;');
    });

    it('should render markdown for contexte field', () => {
      const template = '{{contexte}}';
      const data = { contexte: '**Important**: description' };
      const result = renderTemplate(template, data);
      expect(result).toContain('<strong>Important</strong>');
    });

    it('should render markdown for demarche field', () => {
      const template = '{{demarche}}';
      const data = { demarche: '- Etape 1\n- Etape 2' };
      const result = renderTemplate(template, data);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('should render markdown for phases field', () => {
      const template = '{{phases}}';
      const data = { phases: '## Phase 1\nDescription' };
      const result = renderTemplate(template, data);
      expect(result).toContain('<h2>');
    });

    it('should handle null template', () => {
      expect(renderTemplate(null, {})).toBe('');
    });

    it('should handle null data', () => {
      expect(renderTemplate('{{test}}', null)).toBe('');
    });

    it('should handle spaces in placeholder names', () => {
      const template = '{{ nom }}';
      const data = { nom: 'Test' };
      expect(renderTemplate(template, data)).toBe('Test');
    });
  });

  describe('MARKDOWN_FIELDS', () => {
    it('should contain expected fields', () => {
      expect(MARKDOWN_FIELDS).toContain('contexte');
      expect(MARKDOWN_FIELDS).toContain('demarche');
      expect(MARKDOWN_FIELDS).toContain('phases');
      expect(MARKDOWN_FIELDS).toContain('titre');
      expect(MARKDOWN_FIELDS).toContain('phrase');
    });
  });
});
