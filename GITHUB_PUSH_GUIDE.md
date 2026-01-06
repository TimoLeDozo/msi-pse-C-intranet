# 🚀 Guide pour pousser le projet vers GitHub

## ⚠️ Important

Le dépôt Git doit être initialisé **dans le répertoire du projet**, pas dans votre répertoire home.

## 📋 Étapes à suivre

### 1. Ouvrir un terminal dans le répertoire du projet

Ouvrez PowerShell ou CMD et naviguez vers votre projet :
```powershell
cd "d:\Hypothèse C\Tests"
```

### 2. Vérifier que vous êtes dans le bon répertoire

```powershell
# Vous devriez voir les fichiers du projet
dir
# Vous devriez voir : package.json, server.js, adapters/, etc.
```

### 3. Supprimer le dépôt Git incorrect (si nécessaire)

Si Git a été initialisé dans votre répertoire home, supprimez-le :
```powershell
Remove-Item -Path "$env:USERPROFILE\.git" -Recurse -Force -ErrorAction SilentlyContinue
```

### 4. Initialiser Git dans le bon répertoire

```powershell
git init
```

### 5. Vérifier que .gitignore est correct

Le fichier `.gitignore` doit contenir :
```
node_modules/
.env
storage/outputs/
*.log
.DS_Store
.vscode/
.idea/
```

### 6. Ajouter tous les fichiers du projet

```powershell
git add .
```

### 7. Vérifier les fichiers ajoutés

```powershell
git status
```

Vous devriez voir uniquement les fichiers du projet (pas AppData, Chrome, etc.)

### 8. Faire le commit initial

```powershell
git commit -m "Initial commit: MSI Propales Generator - Architecture hexagonale avec DeepSeek Reasoner"
```

### 9. Créer un dépôt sur GitHub

1. Allez sur https://github.com
2. Cliquez sur "New repository"
3. Nommez-le (ex: `msi-propal-generator`)
4. **Ne cochez PAS** "Initialize with README"
5. Cliquez sur "Create repository"

### 10. Ajouter le remote GitHub

Remplacez `VOTRE_USERNAME` et `NOM_DU_REPO` par vos valeurs :
```powershell
git remote add origin https://github.com/VOTRE_USERNAME/NOM_DU_REPO.git
```

### 11. Pousser vers GitHub

```powershell
git branch -M main
git push -u origin main
```

## ✅ Vérification

Après le push, vérifiez sur GitHub que tous les fichiers sont présents :
- ✅ `package.json`
- ✅ `server.js`
- ✅ `adapters/`
- ✅ `usecases/`
- ✅ `controllers/`
- ✅ `routes/`
- ✅ `public/`
- ✅ etc.

## ⚠️ Fichiers qui NE DOIVENT PAS être poussés

Vérifiez que ces fichiers ne sont **PAS** dans le dépôt :
- ❌ `.env` (contient vos clés API)
- ❌ `node_modules/`
- ❌ `storage/outputs/` (fichiers générés)
- ❌ `*.log`

## 🔧 Si vous avez des problèmes

### Problème : "fatal: not a git repository"
**Solution :** Vous n'êtes pas dans le bon répertoire. Utilisez `cd` pour naviguer vers le projet.

### Problème : Trop de fichiers ajoutés (AppData, Chrome, etc.)
**Solution :** 
1. Supprimez le `.git` du mauvais répertoire
2. Réinitialisez Git dans le bon répertoire
3. Vérifiez que `.gitignore` est correct

### Problème : "Permission denied" lors du push
**Solution :** 
- Vérifiez vos identifiants GitHub
- Utilisez un token d'accès personnel si nécessaire

## 📝 Commandes complètes (copier-coller)

```powershell
# 1. Aller dans le projet
cd "d:\Hypothèse C\Tests"

# 2. Supprimer le .git incorrect (si nécessaire)
Remove-Item -Path "$env:USERPROFILE\.git" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Initialiser Git
git init

# 4. Ajouter les fichiers
git add .

# 5. Commit
git commit -m "Initial commit: MSI Propales Generator"

# 6. Ajouter le remote (remplacez par votre URL GitHub)
git remote add origin https://github.com/VOTRE_USERNAME/NOM_DU_REPO.git

# 7. Pousser
git branch -M main
git push -u origin main
```

---

**Note :** Si vous avez déjà un dépôt GitHub existant, utilisez son URL au lieu de créer un nouveau dépôt.

