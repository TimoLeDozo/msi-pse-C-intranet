const form = document.getElementById('proposal-form');

const previewBtn = document.getElementById('preview-btn');
const generateBtn = document.getElementById('generate-btn');

const previewZone = document.getElementById('preview-output');
const resultZone = document.getElementById('result-output');

function collectFormData() {
  const data = new FormData(form);
  const obj = {};

  for (const [key, value] of data.entries()) {
    obj[key] = value;
  }

  return obj;
}

async function callApi(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
}

// 🔍 PREVIEW
previewBtn.addEventListener('click', async () => {
  previewZone.textContent = 'Prévisualisation en cours…';

  try {
    const payload = collectFormData();
    const result = await callApi('/api/proposal/preview', payload);

    previewZone.textContent = JSON.stringify(result.aiSections, null, 2);
  } catch (err) {
    previewZone.textContent = 'Erreur preview : ' + err.message;
  }
});

// 📄 GENERATE
generateBtn.addEventListener('click', async () => {
  resultZone.textContent = 'Génération en cours…';

  try {
    const payload = collectFormData();
    const result = await callApi('/api/proposal/generate', payload);

    let html = `
      <p>
        <a href="${result.documents.docx.url}" target="_blank">
          📄 Télécharger DOCX
        </a>
      </p>
    `;

    if (result.documents.pdf) {
      html += `
        <p>
          <a href="${result.documents.pdf.url}" target="_blank">
            📕 Télécharger PDF
          </a>
        </p>
      `;
    }

    resultZone.innerHTML = html;
  } catch (err) {
    resultZone.textContent = 'Erreur génération : ' + err.message;
  }
});
