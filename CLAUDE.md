# Synthese de Consolidation - Etat Actuel

## Avancement - Fait (code)
- Pipeline PDF-only: HTML -> renderTemplate -> Playwright -> PDF (generateProposal.usecase)
- Template HTML: `templates/proposal.html`
- Rendu HTML: `utils/template.util.js` (echappement + \n -> <br>)
- Mapping PDF: objectifs, livrables, methodologie, echeancier2, eligibiliteCIR + budget_texte (en lettres)
- UI PDF-only: `public/assets/js/app.js`, `public/app.js`, `public/index.html`
- PDF adapter modernise (Playwright + fallback LibreOffice)
- Benchmarks PDF-only: `scripts/benchmark.js`, `scripts/benchmark-generate.js`
- Docker: dependances Playwright/Chromium integrees (LibreOffice optionnel)
- Tests PDF-only mis a jour (generate usecase + pdf adapter)

## Blocages actuels
- Playwright/Chromium doit etre installe sur l'environnement cible (sinon rendu PDF KO)
- Validation reelle du rendu PDF (benchmark/generation) pas encore executee
- Nettoyage final des docs (dernieres mentions DOCX a verifier)

## Reste a faire (prioritaire)
- Lancer `npm test` + `npm run benchmark:generate` pour valider la chaine PDF
- Verifier le rendu PDF final (mise en page + champs)
- Finaliser docs: `DOCUMENTATION_TECHNIQUE.md`, `README.md`, `.env.example` (si reste DOCX)
- Decider du traitement legacy DOCX (conserver ou retirer docxtemplater/libreoffice-convert)
- Rotation secrets + purge historique si necessaire

## Tests
- `npm test` (non relance apres pivot PDF-only)
- `npm run benchmark:generate` (non relance apres pivot PDF-only)

## Checklist V1
- [x] Inference 100% locale via Ollama (Qwen 2.5 14B)
- [ ] Zero fuite de secrets dans le controle de version
- [x] Couverture tests unitaires > 80% sur adapters critiques
- [ ] Temps generation PDF < 60 secondes (benchmark a valider)
- [ ] Zero residu de balises {{...}} dans les documents finaux (validation PDF a faire)
