# ARCHITECTURE.md - MSI Propales

## Vue d'ensemble

MSI Propales est une application de génération de propositions commerciales utilisant l'IA DeepSeek pour transformer des notes de réunion en documents professionnels (DOCX/PDF).

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Runtime | Node.js | 20+ |
| Framework | Express | 5.x |
| IA | DeepSeek API | deepseek-chat |
| Documents | docxtemplater + pizzip | latest |
| PDF | libreoffice-convert | latest |
| Auth | bcrypt + express-session | latest |
| Frontend | Vanilla JS | ES6+ |

## Architecture hexagonale
```
msi-propales/
├── adapters/                    # Couche I/O
│   ├── ai/
│   │   └── deepseek.adapter.js  # Connecteur API DeepSeek
│   ├── document/
│   │   └── pdf.adapter.js       # Conversion DOCX → PDF
│   └── storage/
│       ├── docx.adapter.js      # Génération DOCX
│       └── file.adapter.js      # Gestion fichiers outputs
│
├── usecases/                    # Logique métier pure
│   ├── previewProposal.usecase.js   # Preview IA uniquement
│   └── generateProposal.usecase.js  # Génération complète
│
├── controllers/                 # Orchestration HTTP
│   └── proposal.controller.js
│
├── routes/                      # Définition endpoints
│   ├── auth.routes.js
│   └── proposal.routes.js
│
├── middleware/                  # Middleware Express
│   ├── requireAuth.js           # Protection routes
│   └── error.middleware.js      # Gestion erreurs globale
│
├── services/                    # Utilitaires partagés
│   ├── validation.service.js
│   └── cost.service.js
│
├── prompts/                     # Prompts système IA
│   └── icam.prompt.js
│
├── templates/                   # Templates DOCX
│   └── propale-template.docx
│
├── storage/
│   └── outputs/                 # Fichiers générés
│
├── public/                      # Frontend
│   ├── index.html
│   ├── login.html
│   └── assets/
│
├── config/
│   └── swagger.config.js        # Configuration Swagger
│
├── tests/                       # Tests Jest
│   └── usecases/
│
└── server.js                    # Point d'entrée
```

## Flux de données

### Flux Preview (génération IA seule)
```
POST /api/proposal/preview
    │
    ▼
┌─────────────────────────┐
│ proposal.controller.js  │
│   → preview()           │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ previewProposal.usecase │
│   → execute()           │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ deepseek.adapter.js     │
│   → generateContent()   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ DeepSeek API            │
│   → Response JSON       │
└─────────────────────────┘
            │
            ▼
Response: { success, aiSections, cost }
```

### Flux Generate (génération documents)
```
POST /api/proposal/generate
    │
    ▼
┌─────────────────────────┐
│ proposal.controller.js  │
│   → generate()          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ generateProposal.usecase│
│   → execute()           │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────┐   ┌──────────┐
│IA (opt) │   │docx.adapt│
└────┬────┘   └────┬─────┘
     │             │
     │             ▼
     │        ┌──────────┐
     │        │pdf.adapt │
     │        └────┬─────┘
     │             │
     └──────┬──────┘
            │
            ▼
┌─────────────────────────┐
│ file.adapter.js         │
│   → expose()            │
└───────────┬─────────────┘
            │
            ▼
Response: { success, url, pdfUrl, cost }
```

## Endpoints API

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | /auth/login | ❌ | Connexion |
| GET | /auth/me | ✅ | User courant |
| POST | /auth/logout | ✅ | Déconnexion |
| POST | /api/proposal/preview | ✅ | Preview IA |
| POST | /api/proposal/generate | ✅ | Génération docs |
| GET | /files/:filename | ✅ | Téléchargement |

## Contrats de données

### ProposalInput (entrée)
```typescript
interface ProposalInput {
  // Requis
  entrepriseNom: string;
  
  // Optionnels
  titre?: string;
  thematique?: string;
  codeProjet?: string;
  dateDebut?: string;
  nbEquipes?: number;
  dureeSemaines?: number;
  clientNom?: string;
  clientFonction?: string;
  clientEmail?: string;
  
  // Champs IA
  ia_histoire?: string;
  ia_probleme?: string;
  ia_solution?: string;
  ia_objectifs?: string;
  
  // Post-preview (optionnels)
  contexte?: string;
  demarche?: string;
  phases?: string;
  phrase?: string;
}
```

### PreviewResponse (sortie preview)
```typescript
interface PreviewResponse {
  success: boolean;
  aiSections?: {
    titre: string;
    contexte: string;
    demarche: string;
    phases: string;
    phrase: string;
  };
  cost?: {
    totalUsd: number;
    inputUsd: number;
    outputUsd: number;
  };
  error?: string;
}
```

### GenerateResponse (sortie generate)
```typescript
interface GenerateResponse {
  success: boolean;
  url?: string;       // /files/propale_xxx.docx
  pdfUrl?: string;    // /files/propale_xxx.pdf
  documents?: {
    docx: { path: string; url: string };
    pdf: { path: string; url: string } | null;
  };
  cost?: { totalUsd: number };
  error?: string;
}
```

## Variables d'environnement
```env
PORT=3000
DEEPSEEK_API_KEY=sk-xxx
FILE_BASE_URL=http://localhost:3000/files
SESSION_SECRET=change_me_long_random
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$xxx
```

## Dépendances critiques

| Package | Usage | Critique |
|---------|-------|----------|
| express | Framework HTTP | ✅ |
| express-session | Gestion sessions | ✅ |
| bcrypt | Hash passwords | ✅ |
| axios | Appels API DeepSeek | ✅ |
| docxtemplater | Génération DOCX | ✅ |
| pizzip | Manipulation ZIP/DOCX | ✅ |
| libreoffice-convert | DOCX → PDF | ⚠️ Requiert LibreOffice |

## Points de vigilance

1. **LibreOffice** doit être installé sur le serveur pour la conversion PDF
2. **Session secret** doit être long et aléatoire en production
3. **Clé DeepSeek** expire régulièrement, surveiller les 401
4. **Template DOCX** doit exister dans `templates/`

## Critères de validation

- [x] Stack justifiée
- [x] Arborescence définie
- [x] Flux de données documentés
- [x] Interfaces spécifiées
- [x] Risques techniques identifiés