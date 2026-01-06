/**
 * Script de vérification de la structure du fichier .env
 * Usage: node check-env.js
 */

require('dotenv').config();

const requiredVars = [
  'SESSION_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH',
  'DEEPSEEK_API_KEY'
];

const optionalVars = [
  'DEEPSEEK_MODEL',
  'DEEPSEEK_BASE_URL',
  'DEEPSEEK_TIMEOUT_MS',
  'PORT',
  'FILE_BASE_URL',
  'NODE_ENV'
];

console.log('🔍 Vérification de la structure du fichier .env\n');
console.log('='.repeat(60));

// Vérification des variables requises
console.log('\n📋 Variables REQUISES :');
let allRequiredPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`  ❌ ${varName} : MANQUANTE ou VIDE`);
    allRequiredPresent = false;
  } else {
    // Masquer les valeurs sensibles
    let displayValue = value;
    if (varName === 'DEEPSEEK_API_KEY') {
      displayValue = value.substring(0, 7) + '...' + value.substring(value.length - 4);
    } else if (varName === 'ADMIN_PASSWORD_HASH') {
      displayValue = value.substring(0, 20) + '...';
    } else if (varName === 'SESSION_SECRET') {
      displayValue = value.length > 20 ? value.substring(0, 20) + '...' : '***';
    } else {
      displayValue = value;
    }
    console.log(`  ✅ ${varName} : ${displayValue}`);
  }
});

// Vérification des variables optionnelles
console.log('\n📋 Variables OPTIONNELLES :');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName} : ${value}`);
  } else {
    console.log(`  ⚪ ${varName} : Non définie (valeur par défaut utilisée)`);
  }
});

// Validations spécifiques
console.log('\n🔐 Validations spécifiques :');

// Vérifier SESSION_SECRET
if (process.env.SESSION_SECRET) {
  if (process.env.SESSION_SECRET.length < 16) {
    console.log('  ⚠️  SESSION_SECRET : Trop court (minimum 16 caractères recommandé)');
  } else {
    console.log('  ✅ SESSION_SECRET : Longueur correcte');
  }
}

// Vérifier ADMIN_PASSWORD_HASH
if (process.env.ADMIN_PASSWORD_HASH) {
  if (!process.env.ADMIN_PASSWORD_HASH.startsWith('$2b$') && 
      !process.env.ADMIN_PASSWORD_HASH.startsWith('$2a$')) {
    console.log('  ⚠️  ADMIN_PASSWORD_HASH : Format suspect (devrait commencer par $2b$ ou $2a$)');
  } else {
    console.log('  ✅ ADMIN_PASSWORD_HASH : Format bcrypt correct');
  }
}

// Vérifier DEEPSEEK_API_KEY
if (process.env.DEEPSEEK_API_KEY) {
  if (!process.env.DEEPSEEK_API_KEY.startsWith('sk-')) {
    console.log('  ⚠️  DEEPSEEK_API_KEY : Ne commence pas par "sk-" (format suspect)');
  } else {
    console.log('  ✅ DEEPSEEK_API_KEY : Format correct (commence par sk-)');
  }
}

// Vérifier DEEPSEEK_MODEL
if (process.env.DEEPSEEK_MODEL) {
  const validModels = ['deepseek-chat', 'deepseek-reasoner'];
  if (!validModels.includes(process.env.DEEPSEEK_MODEL)) {
    console.log(`  ⚠️  DEEPSEEK_MODEL : "${process.env.DEEPSEEK_MODEL}" n'est pas un modèle valide`);
    console.log(`     Modèles valides : ${validModels.join(', ')}`);
  } else {
    console.log(`  ✅ DEEPSEEK_MODEL : ${process.env.DEEPSEEK_MODEL} (modèle valide)`);
  }
} else {
  console.log('  ⚪ DEEPSEEK_MODEL : Non définie (défaut: deepseek-chat)');
  console.log('     💡 Pour utiliser DeepSeek Reasoner, ajoutez: DEEPSEEK_MODEL=deepseek-reasoner');
}

// Vérifier PORT
if (process.env.PORT) {
  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.log(`  ⚠️  PORT : "${process.env.PORT}" n'est pas un port valide (1-65535)`);
  } else {
    console.log(`  ✅ PORT : ${port}`);
  }
} else {
  console.log('  ⚪ PORT : Non définie (défaut: 3000)');
}

// Résumé final
console.log('\n' + '='.repeat(60));
if (allRequiredPresent) {
  console.log('\n✅ Toutes les variables REQUISES sont présentes !');
  console.log('✅ Votre fichier .env est correctement configuré.');
  console.log('\n💡 Vous pouvez maintenant démarrer le serveur avec : npm run dev');
} else {
  console.log('\n❌ Certaines variables REQUISES sont manquantes.');
  console.log('💡 Consultez ENV_SETUP.md pour voir comment les configurer.');
}
console.log('='.repeat(60) + '\n');

