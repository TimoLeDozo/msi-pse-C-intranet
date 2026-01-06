# Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

## Variables requises

### SÉCURITÉ
```env
SESSION_SECRET=votre-cle-secrete-aleatoire-ici
```
**Important** : Générez une chaîne aléatoire sécurisée (ex: `openssl rand -base64 32`)

### AUTHENTIFICATION ADMIN
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$votre-hash-bcrypt-ici
```

**Pour générer un hash de mot de passe :**
```bash
node -e "const bcrypt=require('bcrypt');bcrypt.hash('votre-mot-de-passe',12).then(console.log)"
```

### API DEEPSEEK
```env
# Clé API DeepSeek (obtenez-la sur https://platform.deepseek.com/)
DEEPSEEK_API_KEY=sk-votre-cle-deepseek-ici

# Modèle à utiliser : 'deepseek-chat' ou 'deepseek-reasoner'
DEEPSEEK_MODEL=deepseek-reasoner
```

## Variables optionnelles

```env
# Port du serveur (défaut: 3000)
PORT=3000

# URL de base pour les fichiers générés
FILE_BASE_URL=http://localhost:3000/files

# URL de base DeepSeek (défaut: https://api.deepseek.com)
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Timeout DeepSeek en ms (défaut: 120000 = 2 minutes)
DEEPSEEK_TIMEOUT_MS=120000

# Environnement (development/production)
NODE_ENV=development
```

## Exemple de fichier .env complet

```env
SESSION_SECRET=ma-cle-secrete-super-longue-et-aleatoire-123456789
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5K5K5K5K5K5K5K
DEEPSEEK_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890
DEEPSEEK_MODEL=deepseek-reasoner
PORT=3000
NODE_ENV=development
```

