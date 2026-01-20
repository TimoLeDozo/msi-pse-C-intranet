# Documentation Technique - MSI Propales Generator

## 1. Presentation du Projet

**MSI Propales Generator** est une application Node.js de generation de propositions commerciales utilisant l'IA pour transformer des notes de reunion en documents professionnels (PDF).

### Contexte
- Projet MSI (Mission de Semestre Industriel) - 4 mois
- Migration depuis Google Apps Script vers une architecture Node.js portable
- Deploiement prevu sur Intranet avec IA locale pour conformite RGPD

---

## 2. Stack Technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Runtime | Node.js | 20+ |
| Framework | Express | 5.x |
| IA | Ollama | qwen2.5:14b |
| Documents | HTML template + Playwright | latest |
| PDF | Playwright (Chromium) | latest |
| Auth | bcrypt + express-session | latest |
| Frontend | Vanilla JS | ES6+ |
| Tests | Jest + Playwright | latest |

---

## 3. Architecture

### Structure des dossiers

```
msi-propales/
├── adapters/                    # Couche I/O (connecteurs externes)
│   ├── ai/
│   │   ├── index.js             # Factory - selection automatique
│   │   └── ollama.adapter.js    # Connecteur Ollama (Local)
│   ├── document/
│   │   └── pdf.adapter.js       # HTML → PDF (Playwright)
│   └── storage/
│       ├── docx.adapter.js      # Generation DOCX (legacy)
│       └── file.adapter.js      # Gestion fichiers outputs
│
├── usecases/                    # Logique metier pure
│   ├── previewProposal.usecase.js   # Preview IA
│   └── generateProposal.usecase.js  # Generation documents
│
├── controllers/                 # Orchestration HTTP
│   └── proposal.controllers.js
│
├── routes/                      # Definition endpoints
│   ├── auth.routes.js
│   └── proposal.routes.js
│
├── middleware/                  # Middleware Express
│   ├── requireAuth.js           # Protection routes
│   └── error.middleware.js      # Gestion erreurs globale
│
├── prompts/                     # Prompts systeme IA
│   └── icam.prompt.js
│
├── templates/                   # Templates HTML
│   └── proposal.html (nom via HTML_TEMPLATE_PATH)
│
├── storage/outputs/             # Fichiers generes
├── public/                      # Frontend (HTML/CSS/JS)
├── config/                      # Configuration (Swagger)
├── tests/                       # Tests Jest
└── server.js                    # Point d'entree
```

### Flux de donnees

```
HTTP Request → Routes → Controllers → Use Cases → Adapters
                                          ↓
                                      Services
```

**Principe cle** : Les Use Cases contiennent TOUTE la logique metier. Les Adapters sont des connecteurs techniques purs.

---

## 4. Endpoints API

### Authentification

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/auth/login` | Non | Connexion utilisateur |
| GET | `/auth/me` | Oui | Utilisateur courant |
| POST | `/auth/logout` | Oui | Deconnexion |

### Propositions

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/proposal/preview` | Oui | Generation IA des sections |
| POST | `/api/proposal/generate` | Oui | Generation PDF |

### Fichiers

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/files/:filename` | Non* | Telechargement documents |

*Les fichiers sont servis statiquement depuis `storage/outputs/`

### Documentation

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api-docs` | Non | Interface Swagger UI |
| GET | `/api-docs.json` | Non | Spec OpenAPI JSON |

---

## 5. Contrats de Donnees

### ProposalInput (entree)

```json
{
  "entrepriseNom": "string (requis)",
  "titre": "string",
  "thematique": "string",
  "codeProjet": "string",
  "dateDebut": "string (YYYY-MM-DD)",
  "nbEquipes": "number",
  "dureeSemaines": "number",
  "clientNom": "string",
  "clientFonction": "string",
  "clientEmail": "string",
  "ia_histoire": "string",
  "ia_probleme": "string",
  "ia_solution": "string",
  "ia_objectifs": "string"
}
```

### PreviewResponse (sortie preview)

```json
{
  "success": true,
  "aiSections": {
    "titre": "string",
    "contexte": "string",
    "demarche": "string",
    "phases": "string",
    "phrase": "string"
  },
  "cost": {
    "totalUsd": 0.0003,
    "inputUsd": 0.0001,
    "outputUsd": 0.0002
  },
  "meta": {
    "model": "qwen2.5:14b",
    "durationMs": 1500
  }
}
```

### GenerateResponse (sortie generate)

```json
{
  "success": true,
  "documents": {
    "pdf": {
      "path": "/storage/out/AcmeCorp/2026-01-20/proposal.pdf",
      "url": "/files/out/AcmeCorp/2026-01-20/proposal.pdf"
    }
  },
  "metadata": {
    "generatedAt": "2026-01-20T10:30:00.000Z",
    "entreprise": "Acme Corp",
    "budget": 20000,
    "budgetFormatted": "20 000 EUR",
    "templateUsed": "proposal.html",
    "archiveDir": "/storage/out/AcmeCorp/2026-01-20"
  }
}
```

---

## 6. Configuration IA

### Mode Local (Intranet - RGPD)

L'application repose exclusivement sur une IA locale via Ollama pour garantir la confidentialite des donnees.

```env
USE_LOCAL_AI=true
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:14b
AI_TIMEOUT_MS=600000
```

### Selection automatique

Le fichier `adapters/ai/index.js` agit comme une Factory qui renvoie systematiquement `ollama.adapter.js`. La variable `USE_LOCAL_AI` doit rester `true` pour conserver ce comportement.

### Choix du modele Ollama selon le materiel

| Puissance Serveur | Materiel | Modele | Commande |
|-------------------|----------|--------|----------|
| Bureautique | CPU, 8-16 Go RAM | Qwen 2.5 7B | `ollama pull qwen2.5:7b` |
| Petit Serveur | 16-32 Go RAM | Qwen 2.5 14B | `ollama pull qwen2.5:14b` |
| Workstation IA | GPU >12Go VRAM | Qwen 2.5 32B | `ollama pull qwen2.5:32b` |

---

## 7. Variables d'Environnement

### Requises

```env
SESSION_SECRET=cle-secrete-aleatoire-minimum-16-caracteres
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$hash-bcrypt-complet
```

### IA (Ollama)

```env
USE_LOCAL_AI=true
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:14b
AI_TIMEOUT_MS=600000
```

### Optionnelles

```env
PORT=3000
NODE_ENV=development
FILE_BASE_URL=http://localhost:3000/files
HTML_TEMPLATE_PATH=templates/proposal.html
PDF_RENDER_TIMEOUT=60000
PDF_RENDER_FORMAT=A4
PDF_RENDER_MARGIN_MM=20
```

### Generer un hash de mot de passe

```bash
node -e "const bcrypt=require('bcrypt');bcrypt.hash('votre-mot-de-passe',12).then(console.log)"
```

---

## 8. Authentification

### Flux

1. Utilisateur non authentifie → `/` → Redirection vers `/login`
2. Soumission formulaire → `POST /auth/login` → Verification bcrypt
3. Succes → Creation session → Redirection vers `/`
4. Echec → Message d'erreur + Rate limiting (5 tentatives/10min en prod)

### Session

- Cookie : `msi.sid`
- Duree : 8 heures
- Options : httpOnly, sameSite: lax, secure (en production)

### Utilisateurs

Definis dans `.env` :
- `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` (role: admin)
- `MSI_USERNAME` / `MSI_PASSWORD_HASH` (role: msi)

---

## 9. Commandes

```bash
# Installation
npm install

# Demarrage developpement
npm run dev

# Tests unitaires
npm test

# Tests avec coverage
npm test:coverage

# Tests E2E (Playwright)
npx playwright test
```

---

## 10. Deploiement Serveur IA Local

### Installation Ollama

- **Linux** : `curl -fsSL https://ollama.com/install.sh | sh`
- **Windows** : Telecharger depuis [ollama.com](https://ollama.com)
- **Docker** : `docker run -d -v ollama:/root/.ollama -p 11434:11434 ollama/ollama`

### Configuration

1. Telecharger le modele : `ollama pull qwen2.5:14b`
2. Configurer `.env` avec `USE_LOCAL_AI=true`
3. Demarrer l'application : `npm run dev`

### Verification

```bash
# Verifier qu'Ollama repond
curl http://localhost:11434/v1/models
```

---

## 11. Deploiement Docker (Node + Playwright)

Objectif : packager l'app Node.js avec Chromium (Playwright) pour un rendu PDF stable.
LibreOffice reste optionnel si tu conserves un fallback DOCX.

### Dockerfile (Node + Playwright)

```Dockerfile
FROM node:20-bullseye

RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
RUN npm install playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    environment:
      OLLAMA_BASE_URL: "http://host.docker.internal:11434/v1"
      NODE_ENV: "production"
    volumes:
      - ./storage/outputs:/app/storage/outputs
```

### Notes
- Sur Linux, remplace `host.docker.internal` par l'IP host (ex: 172.17.0.1) ou utilise `network_mode: host`.
- Pour un serveur Windows, `host.docker.internal` fonctionne par defaut.
- Si tu utilises TLS inverse-proxy, pense a configurer `trust proxy` et la gestion des cookies secure.

---

## 12. Conversion PDF - alternatives (legacy DOCX)

Le pipeline principal utilise Playwright (HTML → PDF). Les options ci-dessous
ne sont utiles que si tu conserves une generation DOCX en parallele.

### Option A (Windows + Word + Python docx2pdf)
Prerequis : Microsoft Word installe + Python + `pip install docx2pdf`

Micro-script `scripts/convert_pdf.py` :
```python
import sys
from docx2pdf import convert

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert_pdf.py input.docx output.pdf")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        convert(input_path, output_path)
        print("Success")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

Adapter Node.js (exemple) :
```javascript
const { exec } = require('child_process');
const path = require('path');

class PdfAdapter {
  async convert(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '../../scripts/convert_pdf.py');
      const cmd = `python "${scriptPath}" "${inputPath}" "${outputPath}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) return reject(error);
        if (stdout.includes("Success")) return resolve(outputPath);
        return reject(new Error(stderr || stdout));
      });
    });
  }
}

module.exports = new PdfAdapter();
```

### Option B (LibreOffice headless - legacy)
LibreOffice est gratuit et fonctionne en mode headless via `libreoffice-convert` (si DOCX conserve).

```javascript
const libre = require('libreoffice-convert');
const fs = require('fs').promises;

class PdfAdapter {
  async convert(inputPath, outputPath) {
    try {
      const docxBuf = await fs.readFile(inputPath);
      return new Promise((resolve, reject) => {
        libre.convert(docxBuf, '.pdf', undefined, (err, pdfBuf) => {
          if (err) return reject(err);
          fs.writeFile(outputPath, pdfBuf).then(() => resolve(outputPath)).catch(reject);
        });
      });
    } catch (error) {
      throw new Error(`Echec conversion PDF: ${error.message}`);
    }
  }
}
```

---

## 13. Points de Vigilance

1. **Playwright/Chromium** doit etre installe pour le rendu PDF
2. **SESSION_SECRET** doit etre long et aleatoire en production
3. **Ollama** doit etre demarre avant l'application en mode local
4. **Template HTML** doit exister dans `templates/` (proposal.html par defaut)
5. **Rate limiting** est desactive en developpement (actif en production)

---

## 14. Tests

### Tests unitaires (Jest)

```bash
npm test
```

Couvre les use cases avec des adapters mockes.

### Tests E2E (Playwright)

```bash
npx playwright test
```

15 scenarios couvrant le parcours utilisateur complet.

---

## 15. Dependances Critiques

| Package | Usage | Note |
|---------|-------|------|
| express | Framework HTTP | v5.x |
| express-session | Sessions | In-memory (Redis en prod) |
| bcrypt | Hash passwords | |
| axios | Appels API | |
| playwright | HTML → PDF | Chromium requis |
| docxtemplater | Generation DOCX (legacy) | |
| pizzip | Manipulation ZIP/DOCX (legacy) | |
| libreoffice-convert | DOCX → PDF (legacy) | Requiert LibreOffice |

---

*Documentation generee le 2026-01-14*
