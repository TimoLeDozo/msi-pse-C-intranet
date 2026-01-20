const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');

const xlsxAdapter = require('../../adapters/document/xlsx.adapter.js');

const TEMP_DIR = path.join(__dirname, '../../storage/temp');

/**
 * Cree un fichier XLSX temporaire pour les tests
 * @param {Object} options - Options de creation
 * @param {Array<{name: string, rows: string[][]}>} options.sheets - Feuilles avec donnees
 * @returns {Promise<string>} Chemin du fichier cree
 */
async function createTempXlsx({ sheets = [] } = {}) {
  await fs.promises.mkdir(TEMP_DIR, { recursive: true });

  const zip = new PizZip();

  // Collecter toutes les chaines uniques pour sharedStrings
  const allStrings = [];
  const stringIndexMap = new Map();

  sheets.forEach(sheet => {
    sheet.rows.forEach(row => {
      row.forEach(cell => {
        if (typeof cell === 'string' && cell !== '' && !stringIndexMap.has(cell)) {
          stringIndexMap.set(cell, allStrings.length);
          allStrings.push(cell);
        }
      });
    });
  });

  // [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`);

  // _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  // xl/workbook.xml avec les noms des feuilles
  const sheetRefs = sheets.map((sheet, idx) =>
    `<sheet name="${sheet.name}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`
  ).join('');

  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetRefs}</sheets>
</workbook>`);

  // xl/sharedStrings.xml
  const siElements = allStrings.map(str => `<si><t>${str}</t></si>`).join('');
  zip.file('xl/sharedStrings.xml', `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${siElements}
</sst>`);

  // Creer chaque feuille
  sheets.forEach((sheet, sheetIdx) => {
    const rowsXml = sheet.rows.map((row, rowIdx) => {
      const cellsXml = row.map((cell, colIdx) => {
        const colLetter = String.fromCharCode(65 + colIdx); // A, B, C...
        const cellRef = `${colLetter}${rowIdx + 1}`;

        if (cell === '') {
          return `<c r="${cellRef}"><v></v></c>`;
        }

        if (typeof cell === 'number') {
          return `<c r="${cellRef}"><v>${cell}</v></c>`;
        }

        // String: utiliser sharedStrings
        const stringIdx = stringIndexMap.get(cell);
        return `<c r="${cellRef}" t="s"><v>${stringIdx}</v></c>`;
      }).join('');

      return `<row r="${rowIdx + 1}">${cellsXml}</row>`;
    }).join('');

    zip.file(`xl/worksheets/sheet${sheetIdx + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowsXml}</sheetData>
</worksheet>`);
  });

  const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const filename = `test_xlsx_${Date.now()}.xlsx`;
  const filePath = path.join(TEMP_DIR, filename);
  await fs.promises.writeFile(filePath, buffer);

  return filePath;
}

describe('xlsx.adapter', () => {
  afterEach(async () => {
    // Nettoyer les fichiers temporaires
    try {
      const files = await fs.promises.readdir(TEMP_DIR);
      for (const file of files) {
        if (file.startsWith('test_xlsx_')) {
          await fs.promises.unlink(path.join(TEMP_DIR, file));
        }
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  it('returns null for non-existent file', async () => {
    const result = await xlsxAdapter.extract('/non/existent/file.xlsx');
    expect(result).toBeNull();
  });

  it('returns null for null path', async () => {
    const result = await xlsxAdapter.extract(null);
    expect(result).toBeNull();
  });

  it('extracts text from a single sheet', async () => {
    const filePath = await createTempXlsx({
      sheets: [{
        name: 'Sheet1',
        rows: [
          ['Header1', 'Header2'],
          ['Value1', 'Value2']
        ]
      }]
    });

    const result = await xlsxAdapter.extract(filePath);

    expect(result).not.toBeNull();
    expect(result).toContain('[Sheet1]');
    expect(result).toContain('Header1');
    expect(result).toContain('Value1');
  });

  it('extracts text from multiple sheets', async () => {
    const filePath = await createTempXlsx({
      sheets: [
        { name: 'Donnees', rows: [['A1', 'B1']] },
        { name: 'Calculs', rows: [['X1', 'Y1']] }
      ]
    });

    const result = await xlsxAdapter.extract(filePath);

    expect(result).not.toBeNull();
    expect(result).toContain('[Donnees]');
    expect(result).toContain('A1');
    expect(result).toContain('[Calculs]');
    expect(result).toContain('X1');
  });

  it('handles numeric values', async () => {
    const filePath = await createTempXlsx({
      sheets: [{
        name: 'Numbers',
        rows: [
          ['Item', 'Price'],
          ['Product', 1500]
        ]
      }]
    });

    const result = await xlsxAdapter.extract(filePath);

    expect(result).not.toBeNull();
    expect(result).toContain('1500');
    expect(result).toContain('Product');
  });

  it('uses tab as column separator', async () => {
    const filePath = await createTempXlsx({
      sheets: [{
        name: 'TabTest',
        rows: [['Col1', 'Col2', 'Col3']]
      }]
    });

    const result = await xlsxAdapter.extract(filePath);

    expect(result).not.toBeNull();
    expect(result).toContain('Col1\tCol2\tCol3');
  });

  it('extractWithMetadata returns metadata', async () => {
    const filePath = await createTempXlsx({
      sheets: [
        { name: 'Feuille1', rows: [['Data']] },
        { name: 'Feuille2', rows: [['More Data']] }
      ]
    });

    const result = await xlsxAdapter.extractWithMetadata(filePath);

    expect(result).not.toBeNull();
    expect(result.text).toContain('Data');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.sheetCount).toBe(2);
    expect(result.metadata.sheetNames).toEqual(['Feuille1', 'Feuille2']);
    expect(result.metadata.filename).toMatch(/test_xlsx_\d+\.xlsx/);
  });

  it('extractSheet extracts a specific sheet by name', async () => {
    const filePath = await createTempXlsx({
      sheets: [
        { name: 'First', rows: [['First Sheet Data']] },
        { name: 'Second', rows: [['Second Sheet Data']] }
      ]
    });

    const result = await xlsxAdapter.extractSheet(filePath, 'Second');

    expect(result).not.toBeNull();
    expect(result).toContain('Second Sheet Data');
    expect(result).not.toContain('First Sheet Data');
  });

  it('extractSheet extracts a specific sheet by index', async () => {
    const filePath = await createTempXlsx({
      sheets: [
        { name: 'First', rows: [['First Sheet Data']] },
        { name: 'Second', rows: [['Second Sheet Data']] }
      ]
    });

    const result = await xlsxAdapter.extractSheet(filePath, 0);

    expect(result).not.toBeNull();
    expect(result).toContain('First Sheet Data');
  });

  it('extractSheet returns null for non-existent sheet', async () => {
    const filePath = await createTempXlsx({
      sheets: [{ name: 'Only', rows: [['Data']] }]
    });

    const result = await xlsxAdapter.extractSheet(filePath, 'NonExistent');

    expect(result).toBeNull();
  });

  it('loadSharedStrings returns empty array for missing file', () => {
    const zip = new PizZip();
    zip.file('xl/workbook.xml', '<workbook></workbook>');

    const result = xlsxAdapter.loadSharedStrings(zip);

    expect(result).toEqual([]);
  });

  it('loadSheetNames returns empty array for missing workbook', () => {
    const zip = new PizZip();

    const result = xlsxAdapter.loadSheetNames(zip);

    expect(result).toEqual([]);
  });

  it('handles empty cells correctly', async () => {
    const filePath = await createTempXlsx({
      sheets: [{
        name: 'Sparse',
        rows: [
          ['A1', '', 'C1'],
          ['A2', 'B2', '']
        ]
      }]
    });

    const result = await xlsxAdapter.extract(filePath);

    expect(result).not.toBeNull();
    expect(result).toContain('A1');
    expect(result).toContain('C1');
    expect(result).toContain('B2');
  });
});
