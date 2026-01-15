# MSI Propales - Intranet Edition

> **Plateforme web de génération de contrats R&D Icam, sécurisée, multi-utilisateurs et souveraine.**

![Status](https://img.shields.io/badge/Status-Beta-orange)
![Stack](https://img.shields.io/badge/Node.js-Express-green)
![AI](https://img.shields.io/badge/AI-Ollama%20%2F%20DeepSeek-blue)

Ce projet est la **version (Production/Intranet)** du générateur de propositions commerciales MSI. Il offre une alternative aux solutions précédentes en offrant une architecture serveur robuste, capable de fonctionner totalement hors-ligne (Air-gapped) ou connectée, avec une gestion fine des utilisateurs.

## 🔄 Évolution & Comparatif

Pourquoi cette version Node.js plutôt que les précédentes ?

| Version | Technologie | Architecture | Avantages | Limites |
| :--- | :--- | :--- | :--- | :--- |
| **V1 (Google)** | AppScript | Cloud (Google) | Rapide à faire | Données non souveraines, IA faible, maintenance complexe. |
| **V2 (Local)** | Python/Streamlit | Monoposte | Puissant & Local | Difficile à déployer pour plusieurs utilisateurs (il faut installer Python partout). |
| **V3 (Actuelle)** | **Node.js/Express** | **Client-Serveur** | **Multi-utilisateurs, API REST, Architecture "Adapter" (IA interchangeable), Intranet.** | Nécessite un serveur d'hébergement. |

## ✨ Fonctionnalités Clés

- **🛡️ Souveraineté des Données** : Conçu pour tourner sur un intranet. Aucune donnée client ne transite sur le cloud public si le mode Local est activé.
- **🧠 IA Hybride (Adapter Pattern)** :
    - **Mode Local (Ollama)** : Gratuit, confidentiel, utilise le CPU/GPU du serveur.
    - **Mode Cloud (DeepSeek)** : Pour des besoins de puissance ponctuels (via API).
- **📝 Génération Word Native** : Utilisation de `docxtemplater` pour remplir fidèlement le template institutionnel (`contrat_rnd_icam.docx`).
- **🔐 Authentification** : Système de login avec session sécurisée (`express-session`).
- **📚 Documentation API** : Swagger UI intégré pour faciliter l'interconnexion avec d'autres outils SI.
- **🧪 Qualité Industrielle** : Tests unitaires (Jest) et E2E (Playwright) intégrés.

## 🛠️ Stack Technique

- **Backend** : Node.js, Express.js.
- **Architecture** : MVC + Clean Architecture (Use Cases & Adapters).
- **IA** : Ollama (Local) ou DeepSeek (Cloud) via le pattern Adapter.
- **Frontend** : HTML5/CSS3/JS Vanilla (Léger et rapide).
- **Moteur Doc** : `docxtemplater` (Génération .docx), `libreoffice-convert` (PDF).

## 🚀 Installation & Démarrage

### 1. Prérequis
- Node.js v18+
- [Ollama](https://ollama.com/) installé (pour le mode local).
- LibreOffice (optionnel, pour la conversion PDF).

### 2. Installation
```bash
# Cloner le dépôt
git clone [https://github.com/votre-repo/msi-pse-c-intranet.git](https://github.com/votre-repo/msi-pse-c-intranet.git)
cd msi-pse-c-intranet

# Installer les dépendances
npm install
