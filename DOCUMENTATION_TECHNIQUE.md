# Documentation Technique - MSI Propales Generator

## 1. Presentation du Projet

**MSI Propales Generator** est une application Node.js de generation de propositions commerciales utilisant l'IA pour transformer des notes de reunion en documents professionnels (DOCX/PDF).

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
| IA Cloud | DeepSeek API | deepseek-chat |
| IA Locale | Ollama | qwen2.5:14b |
| Documents | docxtemplater + pizzip | latest |
| PDF | libreoffice-convert | latest |
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
│   │   ├── deepseek.adapter.js  # Connecteur API DeepSeek (Cloud)
│   │   └── ollama.adapter.js    # Connecteur Ollama (Local)
│   ├── document/
│   │   └── pdf.adapter.js       # Conversion DOCX → PDF
│   └── storage/
│       ├── docx.adapter.js      # Generation DOCX
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
├── templates/                   # Templates DOCX
│   └── contrat_rnd_icam.docx
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
| POST | `/api/proposal/generate` | Oui | Generation DOCX/PDF |

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
  "url": "/files/propale_1704067200000.docx",
  "pdfUrl": "/files/propale_1704067200000.pdf",
  "documents": {
    "docx": { "path": "...", "url": "..." },
    "pdf": { "path": "...", "url": "..." }
  }
}
```

---

## 6. Configuration IA

### Mode Local (Intranet - RGPD)

L'application supporte une IA locale via Ollama pour garantir la confidentialite des donnees.

```env
USE_LOCAL_AI=true
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:14b
AI_TIMEOUT_MS=600000
```

### Mode Cloud (Developpement)

```env
USE_LOCAL_AI=false
DEEPSEEK_API_KEY=sk-.....
DEEPSEEK_MODEL=deepseek-chat
```

### Selection automatique

Le fichier `adapters/ai/index.js` agit comme une Factory :
- Si `USE_LOCAL_AI=true` → charge `ollama.adapter.js`
- Si `USE_LOCAL_AI=false` → charge `deepseek.adapter.js`

Le code metier importe simplement `require('../adapters/ai')` sans se soucier du backend IA.

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

### IA (selon le mode)

```env
# Mode Local
USE_LOCAL_AI=true
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:14b
AI_TIMEOUT_MS=600000

# Mode Cloud
DEEPSEEK_API_KEY=sk-.....
```

### Optionnelles

```env
PORT=3000
NODE_ENV=development
FILE_BASE_URL=http://localhost:3000/files
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

## 11. Points de Vigilance

1. **LibreOffice** doit etre installe sur le serveur pour la conversion PDF
2. **SESSION_SECRET** doit etre long et aleatoire en production
3. **Ollama** doit etre demarre avant l'application en mode local
4. **Template DOCX** doit exister dans `templates/`
5. **Rate limiting** est desactive en developpement (actif en production)

---

## 12. Tests

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

## 13. Dependances Critiques

| Package | Usage | Note |
|---------|-------|------|
| express | Framework HTTP | v5.x |
| express-session | Sessions | In-memory (Redis en prod) |
| bcrypt | Hash passwords | |
| axios | Appels API | |
| docxtemplater | Generation DOCX | |
| pizzip | Manipulation ZIP/DOCX | |
| libreoffice-convert | DOCX → PDF | Requiert LibreOffice |

---

*Documentation generee le 2026-01-14*
