# Roadmap finale : MSI Propales Generator (v2.0 - Cible Industrielle)

## Etat actuel
- Pipeline technique (Node/Playwright) stable.
- Moteur financier implemente.
- Priorites restantes : experience utilisateur (preview avant PDF).

## Phase 1 : Cerveau Metier (Prompt Factory)
### 1.1 Segregation des methodologies (prompts/icam.prompt.js)
- Objectif : adapter les consignes IA selon le type de projet.
- Implementation : regles par type de contrat + KPIs obligatoires.
- Statut : Fait.

### 1.2 Negative prompting (prompts/icam.prompt.js)
- Objectif : eviter les hallucinations dangereuses.
- Action : section "INTERDICTIONS FORMELLES".
- Statut : Fait.

## Phase 2 : Juridique & Conformite
### 2.1 Moteur de clauses variables (config/legal.config.js, usecases/generateProposal.usecase.js, templates/proposal.html)
- Action : dictionnaire LEGAL_CLAUSES + injection {{clause_propriete_intellectuelle}}.
- Statut : Fait.

### 2.2 Generation d'annexes (nouveau service)
- Action : generer une annexe "Matrice des Risques" ou "Equipe Projet" au-dela d'un seuil (> 15k EUR).
- Statut : Fait.

## Phase 3 : Rendu "Pixel Perfect" (Playwright)
### 3.1 Gestion avancee des sauts de page (CSS Print)
- Action : regles print (page-break-inside/after).
- Statut : Fait.

### 3.2 En-tetes contextuels
- Action : afficher "Confidentiel - [Nom Client]" en header Playwright.
- Statut : Fait.

## Phase 4 : Experience Utilisateur (Human in the Loop)
### 4.1 Mode "Edition avant PDF"
- Action : formulaire -> ecran de validation -> PDF.
- Statut : A planifier.

## Backlog priorise (etat)
| Priorite | Tache | Fichiers impactes | Complexite | Statut |
| --- | --- | --- | --- | --- |
| P1 | Prompt factory par metier | prompts/icam.prompt.js | Moyenne | Fait |
| P1 | Injection clauses legales | templates/proposal.html, usecases/generateProposal.usecase.js, config/legal.config.js | Faible | Fait |
| P2 | CSS print (sauts de page) | public/assets/css/main.css, templates/proposal.html | Faible | Fait |
| P3 | Workflow "Preview & Edit" | public/assets/js/app.js, public/index.html, routes API | Elevee | A planifier |
| P4 | Annexes dynamiques | services/annex.service.js, templates/proposal.html | Moyenne | Fait |

## Notes
- La phase restante (preview & edit) est la seule evolution encore indispensable pour atteindre le niveau "optimal" cible.
