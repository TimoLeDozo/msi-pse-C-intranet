const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');

const pptxAdapter = require('../../adapters/document/pptx.adapter.js');

const TEMP_DIR = path.join(__dirname, '../../storage/temp');

/**
 * Cree un fichier PPTX temporaire pour les tests
 * @param {Object} options - Options de creation
 * @param {Array<string>} options.slides - Contenu texte de chaque slide
 * @param {Array<string>} options.notes - Notes du presentateur (optionnel)
 * @returns {Promise<string>} Chemin du fichier cree
 */
async function createTempPptx({ slides = [], notes = [] } = {}) {
  await fs.promises.mkdir(TEMP_DIR, { recursive: true });

  const zip = new PizZip();

  // Structure minimale PPTX
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
</p:presentation>`);

  // Creer les slides
  slides.forEach((content, index) => {
    const slideNum = index + 1;
    zip.file(`ppt/slides/slide${slideNum}.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:t>${content}</a:t></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`);
  });

  // Creer les notes si presentes
  notes.forEach((content, index) => {
    const noteNum = index + 1;
    zip.file(`ppt/notesSlides/notesSlide${noteNum}.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:t>${content}</a:t></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`);
  });

  const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const filename = `test_pptx_${Date.now()}.pptx`;
  const filePath = path.join(TEMP_DIR, filename);
  await fs.promises.writeFile(filePath, buffer);

  return filePath;
}

describe('pptx.adapter', () => {
  afterEach(async () => {
    // Nettoyer les fichiers temporaires
    try {
      const files = await fs.promises.readdir(TEMP_DIR);
      for (const file of files) {
        if (file.startsWith('test_pptx_')) {
          await fs.promises.unlink(path.join(TEMP_DIR, file));
        }
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  it('returns null for non-existent file', async () => {
    const result = await pptxAdapter.extract('/non/existent/file.pptx');
    expect(result).toBeNull();
  });

  it('returns null for null path', async () => {
    const result = await pptxAdapter.extract(null);
    expect(result).toBeNull();
  });

  it('extracts text from a single slide', async () => {
    const filePath = await createTempPptx({
      slides: ['Hello World']
    });

    const result = await pptxAdapter.extract(filePath);

    expect(result).not.toBeNull();
    expect(result).toContain('Hello World');
    expect(result).toContain('[Slide 1]');
  });

  it('extracts text from multiple slides in order', async () => {
    const filePath = await createTempPptx({
      slides: ['First Slide', 'Second Slide', 'Third Slide']
    });

    const result = await pptxAdapter.extract(filePath);

    expect(result).not.toBeNull();
    expect(result).toContain('[Slide 1]');
    expect(result).toContain('First Slide');
    expect(result).toContain('[Slide 2]');
    expect(result).toContain('Second Slide');
    expect(result).toContain('[Slide 3]');
    expect(result).toContain('Third Slide');

    // Verifier l'ordre
    const slide1Pos = result.indexOf('[Slide 1]');
    const slide2Pos = result.indexOf('[Slide 2]');
    const slide3Pos = result.indexOf('[Slide 3]');
    expect(slide1Pos).toBeLessThan(slide2Pos);
    expect(slide2Pos).toBeLessThan(slide3Pos);
  });

  it('extracts presenter notes', async () => {
    const filePath = await createTempPptx({
      slides: ['Main Content'],
      notes: ['Speaker Notes Here']
    });

    const result = await pptxAdapter.extract(filePath);

    expect(result).not.toBeNull();
    expect(result).toContain('Main Content');
    expect(result).toContain('[Notes du presentateur]');
    expect(result).toContain('Speaker Notes Here');
  });

  it('extractWithMetadata returns metadata', async () => {
    const filePath = await createTempPptx({
      slides: ['Slide 1', 'Slide 2']
    });

    const result = await pptxAdapter.extractWithMetadata(filePath);

    expect(result).not.toBeNull();
    expect(result.text).toContain('Slide 1');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.slideCount).toBe(2);
    expect(result.metadata.filename).toMatch(/test_pptx_\d+\.pptx/);
    expect(result.metadata.extractedAt).toBeDefined();
  });

  it('extractTextFromXml handles empty content', () => {
    const result = pptxAdapter.extractTextFromXml('');
    expect(result).toBe('');
  });

  it('extractTextFromXml handles null content', () => {
    const result = pptxAdapter.extractTextFromXml(null);
    expect(result).toBe('');
  });

  it('returns null for pptx with no slides', async () => {
    await fs.promises.mkdir(TEMP_DIR, { recursive: true });

    const zip = new PizZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types></Types>');
    zip.file('ppt/presentation.xml', '<?xml version="1.0"?><presentation></presentation>');

    const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const filePath = path.join(TEMP_DIR, `test_pptx_empty_${Date.now()}.pptx`);
    await fs.promises.writeFile(filePath, buffer);

    const result = await pptxAdapter.extract(filePath);

    expect(result).toBeNull();

    await fs.promises.unlink(filePath);
  });
});
