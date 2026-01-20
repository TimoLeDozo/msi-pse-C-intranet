# MSI Propales - Intranet Edition

> Plateforme web de generation de contrats R&D Icam, securisee, multi-utilisateurs et souveraine.

![Status](https://img.shields.io/badge/Status-Beta-orange)
![Stack](https://img.shields.io/badge/Node.js-Express-green)
![AI](https://img.shields.io/badge/AI-Ollama-blue)
![Output](https://img.shields.io/badge/Output-PDF%20%2F%20Playwright-blue)

## Positionnement

Ce projet est la version intranet du generateur de propositions MSI. Il fonctionne hors ligne (air-gapped) ou connecte, avec une generation PDF directe exploitable.

## Fonctionnalites

- Souverainete des donnees (intranet, pas d'appel cloud)
- IA locale via Ollama (Qwen 2.5 14B)
- Generation PDF directe via template HTML (`templates/proposal.html`)
- Authentification par session
- Documentation API via Swagger
- Tests unitaires (Jest) et E2E (Playwright)

## Stack technique

- Backend: Node.js, Express
- Architecture: Clean architecture (usecases + adapters)
- IA: Ollama (local)
- Template: HTML (`templates/proposal.html`)
- PDF: Playwright (Chromium headless)

## Installation

### Prerequis

- Node.js v18+
- Ollama installe et modele `qwen2.5:14b` telecharge
- Playwright browsers: `npx playwright install --with-deps`

### Mise en place

```bash
cp .env.example .env
npm install
npx playwright install --with-deps
```

### Demarrage

```bash
npm run dev
```

## Utilisation

- Generer une propale via l'UI ou l'API.
- Le PDF est sauvegarde sous `storage/outputs/<entreprise>/<date>/proposal.pdf`.

## Tests et benchmark

```bash
npm test
npm run benchmark:generate
```

## Docker

- `Dockerfile` et `docker-compose.yml` sont fournis pour un deploiement reproductible.
- Dans Docker, utilisez `docker compose up --build` et verifiez les variables dans `.env`.
