
const docxAdapter = require('../../adapters/storage/docx.adapter');

describe('DocxAdapter.defragmentPlaceholders', () => {
  it('should merge placeholders split across multiple nodes', () => {
    // Original XML: <w:t>:  {</w:t><w:t>{titre}} lié à {{</w:t><w:t>entrepriseNom</w:t><w:t>}}.</w:t>

    const paragraph =
      '<w:p>' +
      '<w:r><w:t>:  {</w:t></w:r>' +
      '<w:r><w:t>{titre}} lié à {{</w:t></w:r>' +
      '<w:r><w:t>entrepriseNom</w:t></w:r>' +
      '<w:r><w:t>}}.</w:t></w:r>' +
      '</w:p>';

    const result = docxAdapter.defragmentPlaceholders(paragraph);

    // Node 1: ":  {{titre}}"
    expect(result).toContain('<w:t>:  {{titre}}</w:t>');
    // Node 2: " lié à {{entrepriseNom}}" (Space preserved from " lié à")
    expect(result).toContain('<w:t> lié à {{entrepriseNom}}</w:t>');
    expect(result).toContain('<w:t>.</w:t>');
  });

  it('should not double escape characters', () => {
    // If the original text has &lt;, it should remain &lt; not &amp;lt;
    const paragraph = '<w:p><w:r><w:t>{{</w:t></w:r><w:r><w:t>tag</w:t></w:r><w:r><w:t>}} &lt; foo</w:t></w:r></w:p>';
    // Combined: {{tag}} &lt; foo

    const result = docxAdapter.defragmentPlaceholders(paragraph);

    // Node 0 gets the placeholder
    expect(result).toContain('<w:t>{{tag}}</w:t>');
    // Node 2 gets the suffix (preserved)
    expect(result).toContain('<w:t> &lt; foo</w:t>');
    // Ensure no double escaping
    expect(result).not.toContain('&amp;lt;');
  });
});
