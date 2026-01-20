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

    resultZone.textContent = '';

    // Nouvelle structure API: { documents: { pdf: { url, path } } }
    if (result.documents?.pdf?.url) {
      const pdfParagraph = document.createElement('p');
      const pdfLink = document.createElement('a');
      pdfLink.href = result.documents.pdf.url;
      pdfLink.target = '_blank';
      pdfLink.textContent = 'Telecharger PDF';
      pdfParagraph.appendChild(pdfLink);
      resultZone.appendChild(pdfParagraph);
    } else {
      resultZone.textContent = 'Erreur: URL du PDF non disponible.';
    }
  } catch (err) {
    resultZone.textContent = 'Erreur génération : ' + err.message;
  }
});
