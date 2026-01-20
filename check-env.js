/**
 * Script de verification de la structure du fichier .env
 * Usage: node check-env.js
 */

require('dotenv').config();

const requiredVars = [
  'SESSION_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH'
];

const optionalVars = [
  'OLLAMA_BASE_URL',
  'OLLAMA_MODEL',
  'AI_TIMEOUT_MS',
  'PORT',
  'FILE_BASE_URL',
  'NODE_ENV'
];

console.log('Verification de la structure du fichier .env\n');
console.log('='.repeat(60));

// Verification des variables requises
console.log('\n Variables REQUISES :');
let allRequiredPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.log(`  [ERREUR] ${varName} : MANQUANTE ou VIDE`);
    allRequiredPresent = false;
  } else {
    // Masquer les valeurs sensibles
    let displayValue = value;
    if (varName === 'ADMIN_PASSWORD_HASH') {
      displayValue = value.substring(0, 20) + '...';
    } else if (varName === 'SESSION_SECRET') {
      displayValue = value.length > 20 ? value.substring(0, 20) + '...' : '***';
    } else {
      displayValue = value;
    }
    console.log(`  [OK] ${varName} : ${displayValue}`);
  }
});

// Verification des variables optionnelles
console.log('\n Variables OPTIONNELLES :');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  [OK] ${varName} : ${value}`);
  } else {
    console.log(`  [--] ${varName} : Non definie (valeur par defaut utilisee)`);
  }
});

// Validations specifiques
console.log('\n Validations specifiques :');

// Verifier SESSION_SECRET
if (process.env.SESSION_SECRET) {
  if (process.env.SESSION_SECRET.length < 16) {
    console.log('  [WARN] SESSION_SECRET : Trop court (minimum 16 caracteres recommande)');
  } else {
    console.log('  [OK] SESSION_SECRET : Longueur correcte');
  }
}

// Verifier ADMIN_PASSWORD_HASH
if (process.env.ADMIN_PASSWORD_HASH) {
  if (!process.env.ADMIN_PASSWORD_HASH.startsWith('$2b$') &&
      !process.env.ADMIN_PASSWORD_HASH.startsWith('$2a$')) {
    console.log('  [WARN] ADMIN_PASSWORD_HASH : Format suspect (devrait commencer par $2b$ ou $2a$)');
  } else {
    console.log('  [OK] ADMIN_PASSWORD_HASH : Format bcrypt correct');
  }
}

// Verifier OLLAMA_BASE_URL
if (process.env.OLLAMA_BASE_URL) {
  console.log(`  [OK] OLLAMA_BASE_URL : ${process.env.OLLAMA_BASE_URL}`);
} else {
  console.log('  [--] OLLAMA_BASE_URL : Non definie (defaut: http://localhost:11434/v1)');
}

// Verifier OLLAMA_MODEL
if (process.env.OLLAMA_MODEL) {
  console.log(`  [OK] OLLAMA_MODEL : ${process.env.OLLAMA_MODEL}`);
} else {
  console.log('  [--] OLLAMA_MODEL : Non definie (defaut: qwen2.5:14b)');
}

// Verifier PORT
if (process.env.PORT) {
  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.log(`  [WARN] PORT : "${process.env.PORT}" n'est pas un port valide (1-65535)`);
  } else {
    console.log(`  [OK] PORT : ${port}`);
  }
} else {
  console.log('  [--] PORT : Non definie (defaut: 3000)');
}

// Resume final
console.log('\n' + '='.repeat(60));
if (allRequiredPresent) {
  console.log('\n[OK] Toutes les variables REQUISES sont presentes !');
  console.log('[OK] Votre fichier .env est correctement configure.');
  console.log('\nVous pouvez maintenant demarrer le serveur avec : npm run dev');
} else {
  console.log('\n[ERREUR] Certaines variables REQUISES sont manquantes.');
  console.log('Consultez .env.example pour voir comment les configurer.');
}
console.log('='.repeat(60) + '\n');
