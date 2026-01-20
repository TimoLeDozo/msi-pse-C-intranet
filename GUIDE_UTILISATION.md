# Guide d'Utilisation - MSI Propales Generator

> Guide complet pour utiliser le generateur de propositions commerciales R&D.

---

## Table des Matieres

1. [Demarrage Rapide](#demarrage-rapide)
2. [Interface Utilisateur](#interface-utilisateur)
3. [Creer une Proposition](#creer-une-proposition)
4. [Comprendre le PDF Genere](#comprendre-le-pdf-genere)
5. [Gestion des Archives](#gestion-des-archives)
6. [FAQ et Depannage](#faq-et-depannage)

---

## Demarrage Rapide

### 1. Lancer les Services

**Terminal 1 - Ollama (IA locale)**
```bash
ollama serve
```

**Terminal 2 - Serveur Web**
```bash
npm run dev
```

### 2. Acceder a l'Application

Ouvrir dans votre navigateur : **http://localhost:3000**

### 3. Se Connecter

| Champ | Valeur |
|-------|--------|
| Identifiant | `admin` |
| Mot de passe | `MSI_Propales` |

---

## Interface Utilisateur

### Page de Connexion

![Login](public/assets/img/login-preview.png)

L'interface de connexion utilise un design moderne avec:
- Champ identifiant
- Champ mot de passe
- Bouton "Se Connecter"

### Console Principale

Apres connexion, vous accedez a la console de generation avec:

1. **Section Hero** - Presentation du service
2. **Formulaire** - Saisie des informations client et projet
3. **Zone Preview** - Apercu des sections generees par l'IA
4. **Actions** - Boutons Preview et Generer

---

## Creer une Proposition

### Etape 1 : Remplir le Formulaire

#### Informations Client

| Champ | Description | Exemple |
|-------|-------------|---------|
| Nom entreprise | Raison sociale du client | TechDemo SARL |
| Adresse | Adresse complete | 123 Avenue de la Tech, 75001 Paris |
| Contact | Nom du contact principal | Jean Dupont |
| Fonction | Poste du contact | Directeur Technique |
| Email | Email professionnel | j.dupont@techdemo.fr |
| Telephone | Numero de telephone | 01 23 45 67 89 |

#### Informations Projet

| Champ | Description | Exemple |
|-------|-------------|---------|
| Code projet | Reference interne | DEMO-2026 |
| Type de contrat | Nature du contrat | Contrat R&D |
| Thematique | Domaine d'expertise | Intelligence Artificielle |
| Date de debut | Date prevue de demarrage | 01/03/2026 |
| Duree (semaines) | Duree estimee du projet | 16 |

#### Description du Projet

| Champ | Description |
|-------|-------------|
| Problematique | Contexte et enjeux du client |
| Solution proposee | Approche technique envisagee |
| Objectifs | Resultats attendus et KPIs |

### Etape 2 : Generer l'Apercu (Preview)

1. Cliquer sur le bouton **"Preview"**
2. Attendre la generation IA (30 secondes a 2 minutes selon le modele)
3. L'IA genere automatiquement :
   - **Titre** du projet
   - **Contexte** et objectifs detailles
   - **Demarche** methodologique
   - **Phases** du projet
   - **Phrase** de conclusion

4. Verifier et ajuster si necessaire les sections generees

### Etape 3 : Generer le PDF

1. Une fois l'apercu valide, cliquer sur **"Generer le PDF"**
2. La generation prend quelques secondes
3. Le lien de telechargement apparait automatiquement
4. Cliquer pour telecharger le document final

---

## Comprendre le PDF Genere

### Structure du Document

Le PDF genere suit le modele officiel Icam avec :

1. **Page de garde**
   - Logo et coordonnees Icam
   - Reference projet
   - Informations client

2. **Sommaire**

3. **Contexte et objectifs**
   - Texte genere par l'IA
   - Thematique du projet

4. **Demarche proposee**
   - Methodologie adaptee au type de contrat
   - Description des phases

5. **Equipe projet et Coordination**
   - Composition equipe Icam
   - Interlocuteurs cote client

6. **Clauses juridiques**
   - Confidentialite
   - Limites et responsabilites
   - Propriete des travaux
   - Juridiction

7. **Aspects financiers**
   - Budget calcule automatiquement
   - Echeancier de paiement
   - Conditions de reglement

8. **Annexes**
   - Engagements de confidentialite

### Calcul Automatique du Budget

Le budget est calcule selon la formule :
```
Budget = (20 000 / 24) * duree_semaines * nb_equipes
```

Exemple pour 16 semaines, 1 equipe :
```
Budget = (20 000 / 24) * 16 * 1 = 13 333 EUR HT
```

### Echeancier de Paiement

| Phase | Pourcentage |
|-------|-------------|
| A la commande | 30% |
| Livraison Phase 1 | 25% |
| Livraison Phase 2 | 25% |
| Solde final | 20% |

---

## Gestion des Archives

### Emplacement des Fichiers

Les documents generes sont archives dans :
```
storage/outputs/
  {Nom_Entreprise}/
    {Date}/
      proposal.pdf      # Document PDF
      metadata.json     # Metadonnees
```

### Consulter les Metadonnees

Le fichier `metadata.json` contient :
- Date de generation
- Informations client
- Budget calcule
- Sections IA utilisees

### Nettoyage Automatique

Les archives de plus de 30 jours peuvent etre supprimees :

```bash
# Apercu (sans suppression)
npm run cleanup:dry-run

# Execution reelle
npm run cleanup
```

---

## FAQ et Depannage

### L'IA ne repond pas

**Symptome** : Le bouton Preview tourne indefiniment

**Solutions** :
1. Verifier qu'Ollama est lance (`ollama serve`)
2. Verifier le modele : `ollama list`
3. Tester Ollama : `curl http://localhost:11434/api/tags`

### Erreur de connexion

**Symptome** : "Identifiants invalides"

**Solutions** :
1. Verifier le mot de passe : `MSI_Propales`
2. Verifier que le serveur est lance sur le port 3000

### Le PDF ne se genere pas

**Symptome** : Erreur lors de la generation

**Solutions** :
1. Verifier que Playwright est installe : `npx playwright install --with-deps`
2. Verifier l'espace disque disponible
3. Consulter les logs du serveur

### Generation tres lente

**Causes possibles** :
- Modele IA trop lourd pour la RAM disponible
- GPU non utilise par Ollama

**Solutions** :
1. Utiliser un modele plus leger : `qwen2.5:7b-instruct`
2. Verifier l'utilisation GPU dans Ollama

### Budget incorrect

Le budget depend de :
- Duree en semaines (champ obligatoire)
- Nombre d'equipes (1 par defaut)

Verifier que la duree est bien renseignee dans le formulaire.

---

## Raccourcis et Astuces

### Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Tab` | Naviguer entre les champs |
| `Enter` | Soumettre le formulaire |
| `Ctrl+P` | Imprimer (sur la page PDF) |

### Bonnes Pratiques

1. **Problematique detaillee** : Plus le contexte est riche, meilleure sera la generation IA
2. **Objectifs quantifies** : Inclure des KPIs (ex: "reduction de 40%")
3. **Verifier le Preview** : Toujours relire les sections avant de generer le PDF final
4. **Sauvegarder localement** : Telecharger le PDF des sa generation

---

## Support

### Logs du Serveur

Les erreurs sont affichees dans le terminal du serveur.

### Documentation API

Swagger UI disponible sur : **http://localhost:3000/api-docs**

### Contact

Pour les problemes techniques, consulter le fichier `CLAUDE.md` ou creer une issue sur le repository GitHub.

---

*Guide v1.0.0 - 20 janvier 2026*
