# 📋 Structure du fichier .env - Guide de vérification

## 🔍 Comment vérifier votre fichier .env

Exécutez le script de vérification :
```bash
node check-env.js
```

---

## ✅ Structure attendue du fichier .env

### Variables REQUISES (obligatoires)

```env
# 1. SÉCURITÉ - Clé secrète pour signer les sessions
SESSION_SECRET=votre-cle-secrete-aleatoire-minimum-16-caracteres

# 2. AUTHENTIFICATION ADMIN
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$votre-hash-bcrypt-complet-ici

# 3. API DEEPSEEK
DEEPSEEK_API_KEY=sk-votre-cle-deepseek-complete-ici
```

### Variables OPTIONNELLES (avec valeurs par défaut)

```env
# Modèle DeepSeek (défaut: deepseek-chat)
# Pour utiliser Reasoner : DEEPSEEK_MODEL=deepseek-reasoner
DEEPSEEK_MODEL=deepseek-reasoner

# Port du serveur (défaut: 3000)
PORT=3000

# URL de base pour les fichiers générés (défaut: http://localhost:3000/files)
FILE_BASE_URL=http://localhost:3000/files

# URL de base DeepSeek (défaut: https://api.deepseek.com)
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Timeout DeepSeek en ms (défaut: 120000 = 2 minutes)
DEEPSEEK_TIMEOUT_MS=120000

# Environnement (development/production)
NODE_ENV=development
```

---

## 📝 Exemple de fichier .env complet

```env
# ============================================
# SÉCURITÉ
# ============================================
SESSION_SECRET=ma-cle-secrete-super-longue-et-aleatoire-123456789abcdef

# ============================================
# AUTHENTIFICATION ADMIN
# ============================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5K5K5K5K5K5K5K

# ============================================
# API DEEPSEEK
# ============================================
DEEPSEEK_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890
DEEPSEEK_MODEL=deepseek-reasoner

# ============================================
# SERVEUR
# ============================================
PORT=3000
FILE_BASE_URL=http://localhost:3000/files

# ============================================
# ENVIRONNEMENT
# ============================================
NODE_ENV=development
```

---

## ✅ Validations effectuées par check-env.js

### Variables requises
- ✅ `SESSION_SECRET` : Présente et non vide
- ✅ `ADMIN_USERNAME` : Présente et non vide
- ✅ `ADMIN_PASSWORD_HASH` : Présente et non vide
- ✅ `DEEPSEEK_API_KEY` : Présente et non vide

### Validations spécifiques

#### SESSION_SECRET
- ✅ Longueur minimum : 16 caractères (recommandé)
- ⚠️  Si < 16 caractères : Avertissement affiché

#### ADMIN_PASSWORD_HASH
- ✅ Format bcrypt : Doit commencer par `$2b$` ou `$2a$`
- ⚠️  Si format incorrect : Avertissement affiché

#### DEEPSEEK_API_KEY
- ✅ Format : Doit commencer par `sk-`
- ⚠️  Si ne commence pas par `sk-` : Avertissement affiché

#### DEEPSEEK_MODEL
- ✅ Modèles valides : `deepseek-chat` ou `deepseek-reasoner`
- ⚠️  Si modèle invalide : Avertissement affiché
- ⚪ Si non défini : Utilise `deepseek-chat` par défaut

#### PORT
- ✅ Valeur valide : Entre 1 et 65535
- ⚠️  Si valeur invalide : Avertissement affiché
- ⚪ Si non défini : Utilise `3000` par défaut

---

## 🚨 Erreurs courantes

### 1. Fichier .env manquant
**Symptôme :** `Error: SESSION_SECRET manquant dans .env`

**Solution :** Créez un fichier `.env` à la racine du projet avec toutes les variables requises.

### 2. Variables manquantes
**Symptôme :** Le script `check-env.js` affiche `❌ VARIABLE : MANQUANTE ou VIDE`

**Solution :** Ajoutez la variable manquante dans votre fichier `.env`.

### 3. Format incorrect
**Symptôme :** Avertissements dans `check-env.js`

**Solutions :**
- `SESSION_SECRET` : Utilisez au moins 16 caractères aléatoires
- `ADMIN_PASSWORD_HASH` : Générez avec bcrypt (voir ci-dessous)
- `DEEPSEEK_API_KEY` : Doit commencer par `sk-`
- `DEEPSEEK_MODEL` : Utilisez `deepseek-chat` ou `deepseek-reasoner`

---

## 🛠️ Commandes utiles

### Générer un hash de mot de passe admin
```bash
node -e "const bcrypt=require('bcrypt');bcrypt.hash('votre-mot-de-passe',12).then(console.log)"
```

### Générer une clé secrète aléatoire
```bash
# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Linux/Mac
openssl rand -base64 32
```

### Vérifier la structure du .env
```bash
node check-env.js
```

---

## 📊 Résultat attendu du script check-env.js

Si tout est correct, vous devriez voir :

```
🔍 Vérification de la structure du fichier .env

============================================================

📋 Variables REQUISES :
  ✅ SESSION_SECRET : ma-cle-secrete-super...
  ✅ ADMIN_USERNAME : admin
  ✅ ADMIN_PASSWORD_HASH : $2b$12$LQv3c1yqBWVH...
  ✅ DEEPSEEK_API_KEY : sk-abc...xyz0

📋 Variables OPTIONNELLES :
  ✅ DEEPSEEK_MODEL : deepseek-reasoner
  ✅ PORT : 3000
  ⚪ DEEPSEEK_BASE_URL : Non définie (valeur par défaut utilisée)
  ⚪ DEEPSEEK_TIMEOUT_MS : Non définie (valeur par défaut utilisée)
  ⚪ FILE_BASE_URL : Non définie (valeur par défaut utilisée)
  ✅ NODE_ENV : development

🔐 Validations spécifiques :
  ✅ SESSION_SECRET : Longueur correcte
  ✅ ADMIN_PASSWORD_HASH : Format bcrypt correct
  ✅ DEEPSEEK_API_KEY : Format correct (commence par sk-)
  ✅ DEEPSEEK_MODEL : deepseek-reasoner (modèle valide)
  ✅ PORT : 3000

============================================================

✅ Toutes les variables REQUISES sont présentes !
✅ Votre fichier .env est correctement configuré.

💡 Vous pouvez maintenant démarrer le serveur avec : npm run dev
============================================================
```

---

## 📚 Documentation complémentaire

- `ENV_SETUP.md` : Guide détaillé de configuration
- `VERIFICATION_SETUP.md` : Vérification complète du système

