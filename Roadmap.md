# Roadmap Technique - MSI Propales Generator

> **Objectif** : Aligner le generateur de propositions commerciales Intranet sur le standard professionnel AppScript.
>
> **Version** : 1.1.0 | **Date** : 21 janvier 2026

---

## Vue d'ensemble

Ce document trace les evolutions implementees et prevues pour atteindre la rigueur methodologique et la qualite de rendu du moteur AppScript.

### Comparaison des Architectures

| Fonctionnalite | Etat Initial (Intranet) | Standard Professionnel | Statut |
|----------------|------------------------|------------------------|--------|
| Logique Financiere | Valeurs statiques HTML | Echeancier 30/40/30 dynamique | **Implemente** |
| Rendu Textuel | `white-space: pre-wrap` | Markdown -> HTML semantique | **Implemente** |
| Moteur de Prompt | Prompt statique | Adaptatif par methodologie + KPIs | **Implemente** |
| Validation | Presence des champs | Coherence temporelle et budgetaire | **Implemente** |
| En-tetes PDF | Aucun | Header/Footer institutionnel | **Implemente** |

---

## Modifications Implementees

### 1. Rendu Semantique (Markdown -> HTML)

**Probleme** : Les marqueurs Markdown (`**`, `-`, `#`) generes par l'IA apparaissaient bruts dans le PDF.

**Solution** : Integration de la librairie `marked` dans `template.util.js`.

```javascript
// utils/template.util.js
const { marked } = require('marked');
const MARKDOWN_FIELDS = ['contexte', 'demarche', 'phases', 'titre', 'phrase'];

function renderMarkdown(value) {
  return marked.parse(value.trim());
}
```

**Impact** : Rendu professionnel avec balises `<ul>`, `<li>`, `<strong>`, `<h2>`.

---

### 2. Professionnalisation du PDF (Playwright)

**Probleme** : Absence de numerotation de pages et d'en-tetes institutionnels.

**Solution** : Configuration `displayHeaderFooter` avec templates dynamiques.

```javascript
// services/pdf-render.service.js
function buildHeaderTemplate(entrepriseNom = '') {
  const title = entrepriseNom
    ? `Icam GPS - Propale ${entrepriseNom}`
    : 'Proposition Commerciale - Confidentiel';
  return `<div style="...">${title}</div>`;
}

const FOOTER_TEMPLATE = `
  <div>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></div>
`;
```

**Impact** : Documents contractuels professionnels avec pagination.

---

### 3. Echeancier Financier Automatise (30/40/30)

**Probleme** : Montants fixes dans le template ne s'adaptant pas au budget reel.

**Solution** : Calcul dynamique dans `cost.service.js`.

```javascript
// services/cost.service.js
function getPaymentSchedule(totalBudget, nbPhases = 1) {
  // 30% a la commande
  // 40% repartis sur les phases intermediaires
  // 30% solde final
}
```

**Formule** :
```
Echeancier = {
  Acompte: 30%
  Intermediaire: 40% / n_phases
  Solde: 30%
}
```

---

### 4. Specialisation des Prompts par Domaine

**Probleme** : Prompt generique sans distinction methodologique.

**Solution** : Regles detaillees avec KPIs par type de contrat dans `icam.prompt.js`.

| Domaine | Approche | Normes | KPIs |
|---------|----------|--------|------|
| **R&D** | Cycle en V, TRL, AMDEC | ISO 9001, NF X50-127 | Faisabilite technique, Respect CDC, Maturite TRL |
| **Lean** | DMAIC, VSM, 5S, Kaizen | ISO 9001, Lean Six Sigma | Gain TRS, Reduction lead time, Elimination Mudas |
| **Audit** | ISO 19011, SWOT, Cartographie risques | ISO 19011, ISO 14001 | Taux conformite, Criticite, Delai cloture |
| **Supply Chain** | S&OP, FIFO/LIFO, Optimisation transport | ISO 28000, SCOR | Taux service, Rotation stocks, Cout logistique |

---

### 5. Validation de Coherence des Donnees

**Probleme** : Validation limitee a la presence des champs.

**Solution** : Service de validation metier complet dans `validation.service.js`.

**Validations implementees** :
- Format email (RFC 5322)
- Format telephone francais (+33, 06...)
- Coherence duree totale / somme des phases
- Coherence budget / duree (alerte si ecart > 50%)
- Date de debut non passee

---

## Architecture Technique

```
Pipeline PDF-only:
Formulaire -> Validation -> API Preview (Ollama) -> Sections IA (Markdown)
                                                          |
                                                          v
                                            API Generate -> Merge Data
                                                          |
                                                          v
                                            Template HTML <- marked.parse()
                                                          |
                                                          v
                                            Playwright -> PDF (Header/Footer)
                                                          |
                                                          v
                                            Archive + Metadata -> URL publique
```

---

## Tests

**Couverture actuelle** : 127 tests, 10 suites

| Module | Tests | Couverture |
|--------|-------|------------|
| template.util | 22 | Markdown, escaping, placeholders |
| validation.service | 24 | Email, phone, coherence, strict mode |
| pdf-render.service | 5 | Config, headers |
| cost.service | Existants | Echeancier 30/40/30 |
| generateProposal | Existants | Pipeline complet |

---

## Evolutions Futures (Backlog)

### Phase 2 - Ameliorations UX

- [ ] Preview PDF temps reel dans l'interface
- [ ] Historique des generations par client
- [ ] Export multi-formats (DOCX optionnel)

### Phase 3 - Intelligence Avancee

- [ ] Suggestions automatiques basees sur l'historique client
- [ ] Analyse de sentiment sur les retours clients
- [ ] Templates dynamiques par secteur d'activite

### Phase 4 - Scalabilite

- [ ] Cache Redis pour les generations frequentes
- [ ] Queue de generation asynchrone (Bull)
- [ ] Metriques et monitoring (Prometheus)

---

## Changelog

### v1.1.0 (21 janvier 2026)
- Ajout rendu Markdown -> HTML (marked)
- Headers/Footers PDF dynamiques avec nom entreprise
- Echeancier financier 30/40/30
- Prompts enrichis avec KPIs par domaine
- Validation coherence complete
- 127 tests (+ 51 nouveaux)

### v1.0.0 (20 janvier 2026)
- Pipeline PDF-only via Playwright
- Inference IA locale (Ollama)
- Interface utilisateur complete
- Authentification session securisee
- 76 tests unitaires

---

*Document genere automatiquement - MSI Propales Generator*
