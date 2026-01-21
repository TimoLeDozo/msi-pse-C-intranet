# MSI Propales Generator - Documentation Technique

> Generateur de propositions commerciales R&D avec inference IA locale (Ollama).
> **Version**: 1.0.0 | **Derniere mise a jour**: 20 janvier 2026

---

## Architecture

```
Pipeline PDF-only:
Formulaire -> API Preview (Ollama) -> Sections IA -> API Generate -> HTML Template -> Playwright -> PDF
```

```
Structure du projet:
adapters/
  ai/                 # Connecteur Ollama
  storage/            # Gestion fichiers et archivage
usecases/             # Logique metier (preview, generate)
controllers/          # Orchestration HTTP
services/             # Utilitaires (cost, pdf-render, validation)
routes/               # Definitions endpoints Express
middleware/           # Auth, error handling
utils/                # Helpers (template, path, json)
prompts/              # Construction prompts IA dynamiques
templates/            # Template HTML pour PDF
public/               # Frontend (HTML, CSS, JS)
scripts/              # Outils CLI (benchmark, cleanup)
tests/                # Tests unitaires et E2E
```

---

## Prerequis

- **Node.js** 20+
- **Ollama** avec modele `qwen2.5:7b-instruct` (ou autre compatible)
- **Playwright** (installe automatiquement avec `npm install`)

---

## Installation

```bash
# 1. Cloner le projet
git clone https://github.com/TimoLeDozo/msi-pse-C-intranet.git
cd msi-pse-C-intranet

# 2. Installer les dependances
npm install

# 3. Installer Playwright (navigateurs)
npx playwright install --with-deps

# 4. Configurer l'environnement
cp .env.example .env
# Editer .env avec vos valeurs
```

---

## Configuration (.env)

```env
# === AUTHENTICATION ===
SESSION_SECRET=<chaine-64-caracteres-aleatoires>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash-12-rounds>

# === SERVER ===
PORT=3000
FILE_BASE_URL=http://localhost:3000/files

# === AI (Ollama Local) ===
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:7b-instruct
AI_TIMEOUT_MS=300000
```

**Generer un hash bcrypt** :
```bash
node -e "require('bcrypt').hash('VotreMotDePasse', 12).then(console.log)"
```

---

## Demarrage

```bash
# Terminal 1: Demarrer Ollama
ollama serve

# Terminal 2: Demarrer le serveur
npm run dev

# Ouvrir http://localhost:3000
# Login: admin / <votre-mot-de-passe>
```

---

## Scripts NPM

| Script | Description |
|--------|-------------|
| `npm run dev` | Demarrer le serveur Express |
| `npm test` | Lancer les tests unitaires (Jest) |
| `npm run test:coverage` | Tests avec couverture de code |
| `npm run benchmark:generate` | Benchmark generation PDF |
| `npm run cleanup` | Nettoyer archives > 30 jours |
| `npm run cleanup:dry-run` | Apercu du nettoyage |

---

## API Endpoints

### Authentication
| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/login` | Connexion (rate limit: 5/10min) |
| POST | `/auth/logout` | Deconnexion |
| GET | `/auth/me` | Utilisateur courant |

### Proposal
| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/api/proposal/preview` | Generation sections IA (rate limit: 20/h) |
| POST | `/api/proposal/generate` | Generation PDF finale (rate limit: 20/h) |

### Documentation
| Route | Description |
|-------|-------------|
| `/api-docs` | Swagger UI (documentation interactive) |

---

## Structure des Donnees

### Placeholders du Template HTML

Le template `templates/proposal.html` utilise 25 placeholders :

| Placeholder | Source | Description |
|-------------|--------|-------------|
| `{{titre}}` | IA | Titre du projet genere |
| `{{contexte}}` | IA | Section contexte et objectifs |
| `{{demarche}}` | IA | Demarche proposee |
| `{{phases}}` | IA | Description des phases |
| `{{entrepriseNom}}` | Formulaire | Nom de l'entreprise |
| `{{clientNom}}` | Formulaire | Nom du contact client |
| `{{clientFonction}}` | Formulaire | Fonction du contact |
| `{{clientEmail}}` | Formulaire | Email du contact |
| `{{clientTelephone}}` | Formulaire | Telephone du contact |
| `{{entrepriseAdresse}}` | Formulaire | Adresse de l'entreprise |
| `{{typeContrat}}` | Formulaire | Type de contrat |
| `{{thematique}}` | Formulaire | Thematique du projet |
| `{{codeProjet}}` | Formulaire | Code reference projet |
| `{{dateDebut}}` | Formulaire | Date de debut |
| `{{dureeSemaines}}` | Formulaire | Duree en semaines |
| `{{budget}}` | Calcule | Budget formate (ex: 20 000 EUR) |
| `{{budgetEnLettres}}` | Calcule | Budget en lettres |
| `{{budget_texte}}` | Calcule | Budget texte alternatif |
| `{{echeancier}}` | Calcule | Echeancier de paiement (col 1) |
| `{{echeancier2}}` | Calcule | Echeancier de paiement (col 2) |
| `{{DateDuJour}}` | Calcule | Date du jour en francais |
| `{{eligibiliteCII}}` | Formulaire | Note eligibilite CII |
| `{{clause_propriete_intellectuelle}}` | Calcule | Clause juridique adaptee au type de contrat |
| `{{annexe_supplementaire}}` | Calcule | Annexe dynamique (risques ou equipe projet) |
| `{{entrepriseLogo}}` | Formulaire | URL du logo |

---

## Archivage

Les documents generes sont archives dans :
```
storage/outputs/
  {Nom_Entreprise_Sanitise}/
    {YYYY-MM-DD}/
      proposal.pdf      # Document final
      metadata.json     # Metadonnees de generation
```

---

## Tests

```bash
# Tests unitaires
npm test

# Tests avec couverture
npm run test:coverage

# Tests E2E (necessite serveur actif)
npx playwright test
npx playwright test --ui    # Mode interactif
```

**Couverture actuelle** : 76 tests, 7 suites

---

## Securite

- **Authentification** : Sessions bcrypt avec cookies httpOnly
- **Rate limiting** : Protection contre les abus API
- **XSS** : Pas d'innerHTML non securise
- **Path traversal** : Validation des chemins fichiers
- **CORS** : Configure pour environnement local

---

## Deploiement Docker

```bash
# Build et demarrage
docker compose up --build

# Configuration Ollama externe
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
```

Le Dockerfile inclut Chromium pour Playwright.

---

## Maintenance

### Nettoyage des archives
```bash
# Apercu (dry-run)
npm run cleanup:dry-run

# Execution (supprime archives > 30 jours)
npm run cleanup
```

### Rotation des secrets
1. Generer nouveau `SESSION_SECRET`
2. Generer nouveau hash mot de passe
3. Redemarrer le serveur

---

## Historique des Versions

### v1.0.0 (20 janvier 2026)
- Pipeline PDF-only via Playwright
- Inference IA locale (Ollama)
- Interface utilisateur complete
- Authentification session securisee
- 76 tests unitaires
- Nettoyage du code legacy (DOCX)
