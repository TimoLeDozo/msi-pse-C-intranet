const form = document.getElementById('proposal-form');
const previewBtn = document.getElementById('preview-btn');
const generateBtn = document.getElementById('generate-btn');

const previewOutput = document.getElementById('preview-output');
const resultOutput = document.getElementById('result-output');

function collectFormData() {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

previewBtn.addEventListener('click', async () => {
  previewOutput.textContent = 'Prévisualisation en cours...';

  const payload = collectFormData();

  const res = await fetch('/api/proposal/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  previewOutput.textContent = JSON.stringify(json.aiSections, null, 2);
});

generateBtn.addEventListener('click', async () => {
  resultOutput.textContent = 'Génération en cours...';

  const payload = collectFormData();

  const res = await fetch('/api/proposal/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();

  resultOutput.innerHTML = `
    <p>
      <a href="${json.documents.docx.url}" target="_blank">📄 Télécharger DOCX</a>
    </p>
    ${json.documents.pdf ? `
      <p>
        <a href="${json.documents.pdf.url}" target="_blank">📕 Télécharger PDF</a>
      </p>
    ` : ''}
  `;
});
