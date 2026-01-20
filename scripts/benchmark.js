/**
 * Benchmark Performance Script
 * Mesure detaillee de chaque etape du pipeline de generation
 *
 * Etapes mesurees:
 * 1. Inference IA (Ollama) - preview usecase
 * 2. Render HTML (template + data)
 * 3. Render PDF (Playwright)
 * 4. Pipeline complet - generate usecase
 *
 * Usage: node scripts/benchmark.js [--iterations N] [--skip-ai] [--report-path PATH]
 */

require('dotenv').config();

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

// Adapters et services
const aiAdapter = require('../adapters/ai');
const { renderTemplate } = require('../utils/template.util');
const { renderHtmlToPdf } = require('../services/pdf-render.service');
const promptService = require('../prompts/icam.prompt');
const generateProposalUsecase = require('../usecases/generateProposal.usecase');
const previewProposalUsecase = require('../usecases/previewProposal.usecase');

// Configuration
const REPORT_DIR = path.join(__dirname, '../reports');
const OUTPUT_DIR = path.join(__dirname, '../storage/outputs');
const HTML_TEMPLATE_PATH = path.join(__dirname, '../templates/proposal.html');

// Donnees de test realistes
const SAMPLE_PROPOSAL_DRAFT = {
  entrepriseNom: 'TechInnovate SAS',
  thematique: 'RD',
  typeContrat: 'RD',
  dureeSemaines: 24,
  nbEquipes: 1,
  phaseCount: 3,
  titre: 'Optimisation des processus industriels par IA embarquee',
  contactNom: 'Jean Dupont',
  contactEmail: 'jean.dupont@techinnovate.fr',
  ia_histoire: 'TechInnovate SAS est une PME industrielle creee en 2015, specialisee dans la fabrication de composants electroniques. L\'entreprise compte 85 salaries et realise un CA de 12M EUR.',
  ia_lieux: 'Siege social a Lyon, site de production a Villeurbanne',
  ia_probleme: 'Les temps de cycle de production sont trop longs (45 min/piece) avec un taux de rebut de 8%. La maintenance preventive est inexistante.',
  ia_solution: 'Deploiement de capteurs IoT et algorithmes de machine learning pour la maintenance predictive et l\'optimisation des parametres machines.',
  ia_objectifs: 'Reduire le temps de cycle de 20%, diminuer le taux de rebut a 3%, anticiper 80% des pannes.'
};

// Sections IA pre-generees pour tests sans Ollama
const MOCK_AI_SECTIONS = {
  titre: 'Accompagnement TechInnovate SAS - Optimisation industrielle par Intelligence Artificielle',
  contexte: 'TechInnovate SAS, PME industrielle lyonnaise de 85 collaborateurs, fait face a des enjeux majeurs de competitivite. Avec un temps de cycle de 45 minutes par piece et un taux de rebut de 8%, l\'entreprise souhaite moderniser son outil de production. L\'absence de maintenance preventive genere des arrets non planifies couteux. Ce projet s\'inscrit dans une demarche de transformation digitale visant a perenniser l\'activite.',
  demarche: 'Notre approche s\'appuie sur la methodologie TRL (Technology Readiness Level) adaptee au contexte industriel. Phase 1 : Audit technique et cartographie des flux. Phase 2 : POC sur ligne pilote avec capteurs IoT. Phase 3 : Developpement des algorithmes ML. Phase 4 : Deploiement et formation des equipes.',
  phases: 'Phase 1 - Diagnostic (4 semaines) : Analyse de l\'existant, identification des points critiques. Phase 2 - Conception (8 semaines) : Architecture solution, selection capteurs, design algorithmes. Phase 3 - Realisation (8 semaines) : Implementation, tests, ajustements. Phase 4 - Deploiement (4 semaines) : Mise en production, formation, documentation.',
  phrase: 'Ce projet permettra a TechInnovate SAS de franchir un cap decisif dans sa transformation industrielle, avec un ROI estime a 18 mois.'
};

/**
 * Classe de mesure de performance
 */
class PerformanceTimer {
  constructor(name) {
    this.name = name;
    this.startTime = null;
    this.endTime = null;
    this.duration = null;
  }

  start() {
    this.startTime = process.hrtime.bigint();
    return this;
  }

  stop() {
    this.endTime = process.hrtime.bigint();
    this.duration = Number(this.endTime - this.startTime) / 1_000_000; // Convert to ms
    return this;
  }

  getDurationMs() {
    return this.duration ? Math.round(this.duration) : null;
  }

  getDurationSeconds() {
    return this.duration ? (this.duration / 1000).toFixed(2) : null;
  }
}

/**
 * Resultat de benchmark
 */
class BenchmarkResult {
  constructor() {
    this.steps = {};
    this.totalDuration = 0;
    this.errors = [];
    this.metadata = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:14b'
    };
  }

  addStep(name, durationMs, details = {}) {
    this.steps[name] = {
      durationMs,
      durationSeconds: (durationMs / 1000).toFixed(2),
      percentage: 0, // Calculated later
      ...details
    };
    this.totalDuration += durationMs;
  }

  addError(step, error) {
    this.errors.push({ step, message: error.message, stack: error.stack });
  }

  calculatePercentages() {
    for (const step of Object.keys(this.steps)) {
      this.steps[step].percentage = ((this.steps[step].durationMs / this.totalDuration) * 100).toFixed(1);
    }
  }

  isWithinTarget(targetMs = 60000) {
    return this.totalDuration <= targetMs;
  }

  getBottleneck() {
    let maxStep = null;
    let maxDuration = 0;
    for (const [step, data] of Object.entries(this.steps)) {
      if (data.durationMs > maxDuration) {
        maxDuration = data.durationMs;
        maxStep = step;
      }
    }
    return { step: maxStep, durationMs: maxDuration };
  }
}

/**
 * Benchmark de l'inference IA (Ollama)
 */
async function benchmarkAIInference(result, skipAI = false) {
  const timer = new PerformanceTimer('AI Inference');

  if (skipAI) {
    result.addStep('AI Inference', 0, { skipped: true, reason: '--skip-ai flag' });
    return MOCK_AI_SECTIONS;
  }

  try {
    const systemPrompt = promptService.buildDynamicPrompt({
      typeContrat: SAMPLE_PROPOSAL_DRAFT.typeContrat,
      contratPrecedent: null
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: promptService.buildUserMessage(SAMPLE_PROPOSAL_DRAFT) }
    ];

    timer.start();
    const aiResponse = await aiAdapter.generateStructuredContent({
      messages,
      temperature: 0.7,
      maxTokens: 2000
    });
    timer.stop();

    result.addStep('AI Inference', timer.getDurationMs(), {
      model: aiResponse.model,
      tokensUsed: aiResponse.usage?.total_tokens || 'N/A',
      reportedDurationMs: aiResponse.durationMs
    });

    return aiResponse.sections;

  } catch (error) {
    timer.stop();
    result.addError('AI Inference', error);
    result.addStep('AI Inference', timer.getDurationMs() || 0, { error: error.message });
    return MOCK_AI_SECTIONS; // Fallback to mock data
  }
}

/**
 * Benchmark du rendu HTML (template + data)
 */
async function benchmarkHtmlRender(result, documentData) {
  const timer = new PerformanceTimer('HTML Render');

  try {
    const templatePath = process.env.HTML_TEMPLATE_PATH || HTML_TEMPLATE_PATH;

    timer.start();
    const template = await fsp.readFile(templatePath, 'utf8');
    const html = renderTemplate(template, documentData);
    timer.stop();

    result.addStep('HTML Render', timer.getDurationMs(), {
      templateUsed: path.basename(templatePath)
    });

    return html;
  } catch (error) {
    timer.stop();
    result.addError('HTML Render', error);
    result.addStep('HTML Render', timer.getDurationMs() || 0, { error: error.message });
    return null;
  }
}

/**
 * Benchmark du rendu PDF via Playwright
 */
async function benchmarkPdfRender(result, html) {
  const timer = new PerformanceTimer('PDF Render');

  if (!html) {
    result.addStep('PDF Render', 0, { skipped: true, reason: 'No HTML input' });
    return null;
  }

  try {
    await fsp.mkdir(OUTPUT_DIR, { recursive: true });
    const outputPath = path.join(OUTPUT_DIR, `benchmark_${Date.now()}.pdf`);

    timer.start();
    await renderHtmlToPdf({ html, outputPath });
    timer.stop();

    const stats = await fsp.stat(outputPath);

    result.addStep('PDF Render', timer.getDurationMs(), {
      outputPath,
      fileSizeKB: Math.round(stats.size / 1024)
    });

    return outputPath;
  } catch (error) {
    timer.stop();
    result.addError('PDF Render', error);
    result.addStep('PDF Render', timer.getDurationMs() || 0, { error: error.message });
    return null;
  }
}

/**
 * Benchmark du pipeline complet (preview + generate)
 */
async function benchmarkFullPipeline(result, skipAI = false) {
  const timer = new PerformanceTimer('Full Pipeline');

  try {
    timer.start();

    // Etape 1: Preview (IA)
    let aiSections;
    if (skipAI) {
      aiSections = MOCK_AI_SECTIONS;
    } else {
      const previewResult = await previewProposalUsecase.execute(SAMPLE_PROPOSAL_DRAFT);
      if (!previewResult.success) {
        throw new Error('Preview failed: ' + (previewResult.error || 'Unknown error'));
      }
      aiSections = previewResult.aiSections;
    }

    // Etape 2: Generate (PDF)
    const proposalWithAI = {
      ...SAMPLE_PROPOSAL_DRAFT,
      ...aiSections
    };

    const generateResult = await generateProposalUsecase.execute(proposalWithAI);
    timer.stop();

    if (!generateResult.success) {
      throw new Error('Generate failed: ' + generateResult.error);
    }

    result.addStep('Full Pipeline', timer.getDurationMs(), {
      pdfGenerated: !!generateResult.documents.pdf
    });

    return generateResult;

  } catch (error) {
    timer.stop();
    result.addError('Full Pipeline', error);
    result.addStep('Full Pipeline', timer.getDurationMs() || 0, { error: error.message });
    return null;
  }
}

/**
 * Nettoyage des fichiers generes
 */
async function cleanup(files) {
  for (const filePath of files.filter(Boolean)) {
    try {
      await fsp.unlink(filePath);
    } catch (_) {
      // Ignorer les erreurs de suppression
    }
  }
}

/**
 * Generation du rapport
 */
function generateReport(results, iterations) {
  const avgResult = new BenchmarkResult();

  // Calculer les moyennes
  const stepNames = Object.keys(results[0].steps);
  for (const stepName of stepNames) {
    const durations = results.map(r => r.steps[stepName]?.durationMs || 0);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const stdDev = Math.sqrt(durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length);

    avgResult.addStep(stepName, Math.round(avg), {
      min: Math.round(min),
      max: Math.round(max),
      stdDev: Math.round(stdDev),
      samples: durations.length
    });
  }

  avgResult.calculatePercentages();

  const bottleneck = avgResult.getBottleneck();
  const targetMet = avgResult.isWithinTarget(60000);

  // Format du rapport
  const report = `
================================================================================
                     BENCHMARK PERFORMANCE REPORT
================================================================================

Date: ${new Date().toISOString()}
Iterations: ${iterations}
Platform: ${process.platform}
Node.js: ${process.version}
Ollama Model: ${process.env.OLLAMA_MODEL || 'qwen2.5:14b'}

--------------------------------------------------------------------------------
                           RESULTATS PAR ETAPE
--------------------------------------------------------------------------------

${Object.entries(avgResult.steps).map(([step, data]) => `
${step}
  Moyenne:    ${data.durationMs} ms (${data.durationSeconds} s)
  Min/Max:    ${data.min || 'N/A'} ms / ${data.max || 'N/A'} ms
  Ecart-type: ${data.stdDev || 'N/A'} ms
  Part:       ${data.percentage}%
  ${data.skipped ? '(SKIPPED: ' + data.reason + ')' : ''}
  ${data.error ? '(ERROR: ' + data.error + ')' : ''}
`).join('')}

--------------------------------------------------------------------------------
                              SYNTHESE
--------------------------------------------------------------------------------

Temps total moyen:     ${avgResult.totalDuration} ms (${(avgResult.totalDuration / 1000).toFixed(2)} s)
Objectif (60s):        ${targetMet ? 'ATTEINT' : 'NON ATTEINT'} ${targetMet ? '[OK]' : '[KO]'}
Goulot d'etranglement: ${bottleneck.step} (${bottleneck.durationMs} ms, ${avgResult.steps[bottleneck.step]?.percentage || 0}%)

--------------------------------------------------------------------------------
                         REPARTITION DU TEMPS
--------------------------------------------------------------------------------

${generateBarChart(avgResult.steps)}

--------------------------------------------------------------------------------
                        RECOMMANDATIONS
--------------------------------------------------------------------------------

${generateRecommendations(avgResult, bottleneck, targetMet)}

================================================================================
`;

  return report;
}

/**
 * Genere un graphique ASCII des temps
 */
function generateBarChart(steps) {
  const maxWidth = 50;
  const maxDuration = Math.max(...Object.values(steps).map(s => s.durationMs));

  return Object.entries(steps)
    .sort((a, b) => b[1].durationMs - a[1].durationMs)
    .map(([name, data]) => {
      const barLength = Math.round((data.durationMs / maxDuration) * maxWidth);
      const bar = '#'.repeat(barLength) + '.'.repeat(maxWidth - barLength);
      const nameFixed = name.padEnd(16);
      return `${nameFixed} |${bar}| ${data.durationMs}ms (${data.percentage}%)`;
    })
    .join('\n');
}

/**
 * Genere des recommandations basees sur l'analyse
 */
function generateRecommendations(result, bottleneck, targetMet) {
  const recommendations = [];

  // Analyse du goulot d'etranglement
  if (bottleneck.step === 'AI Inference') {
    recommendations.push(`
1. INFERENCE IA (${bottleneck.durationMs}ms - Principal goulot)
   - Reduire maxTokens de 2000 a 1500 si possible
   - Utiliser un modele plus leger (qwen2.5:7b vs 14b)
   - Verifier la configuration GPU (CUDA/ROCm)
   - Augmenter le num_ctx si memoire disponible
   - Pre-warmer le modele au demarrage serveur`);
  }

  if (bottleneck.step === 'PDF Render') {
    recommendations.push(`
1. RENDU PDF (${bottleneck.durationMs}ms - Principal goulot)
   - Verifier que Playwright/Chromium est installe
   - Fixer PLAYWRIGHT_BROWSERS_PATH pour un cache persistant
   - Pre-charger le navigateur au demarrage serveur
   - Simplifier le template (images lourdes, gradients, fonts)`);
  }

  if (bottleneck.step === 'HTML Render') {
    recommendations.push(`
1. RENDU HTML (${bottleneck.durationMs}ms - Principal goulot)
   - Mettre en cache le template HTML en memoire
   - Reduire les operations de post-traitement
   - Eviter les sections inutiles/duplicats`);
  }

  // Recommandations generales
  if (!targetMet) {
    recommendations.push(`
2. OBJECTIF 60s NON ATTEINT (${result.totalDuration}ms)
   - Paralleliser les operations independantes
   - Implementer un cache pour l'inference IA (memes inputs)
   - Rendre le rendu PDF asynchrone si besoin
   - Profiler les allocations memoire
   - Verifier les I/O disque (SSD recommande)`);
  } else {
    recommendations.push(`
2. OBJECTIF 60s ATTEINT (${result.totalDuration}ms)
   - Marge de securite: ${60000 - result.totalDuration}ms
   - Considerer un cache pour ameliorer encore
   - Monitorer les temps en production`);
  }

  // Recommandations specifiques par seuil
  if (result.steps['AI Inference']?.durationMs > 30000) {
    recommendations.push(`
3. INFERENCE IA > 30s
   - Le modele 14B est potentiellement surdimensionne
   - Tester qwen2.5:7b pour un compromis qualite/vitesse
   - Verifier la memoire GPU disponible (nvidia-smi)`);
  }

  if (result.steps['PDF Render']?.durationMs > 20000) {
    recommendations.push(`
3. RENDU PDF > 20s
   - Cold start Chromium probable
   - Installer les polices manquantes
   - Verifier la taille des images et le CSS`);
  }

  return recommendations.join('\n') || 'Aucune recommandation particuliere - performances nominales.';
}

/**
 * Sauvegarde du rapport JSON detaille
 */
async function saveJsonReport(results, reportPath) {
  const jsonReport = {
    timestamp: new Date().toISOString(),
    iterations: results.length,
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:14b',
      ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
    },
    results: results.map((r, i) => ({
      iteration: i + 1,
      steps: r.steps,
      totalDuration: r.totalDuration,
      errors: r.errors
    })),
    summary: {
      avgTotalDuration: Math.round(results.reduce((sum, r) => sum + r.totalDuration, 0) / results.length),
      targetMet: results.every(r => r.isWithinTarget(60000)),
      successRate: `${results.filter(r => r.errors.length === 0).length}/${results.length}`
    }
  };

  await fsp.mkdir(path.dirname(reportPath), { recursive: true });
  await fsp.writeFile(reportPath, JSON.stringify(jsonReport, null, 2));
}

/**
 * Point d'entree principal
 */
async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const iterations = parseInt(args.find(a => a.startsWith('--iterations='))?.split('=')[1] || '1', 10);
  const skipAI = args.includes('--skip-ai');
  const reportPath = args.find(a => a.startsWith('--report-path='))?.split('=')[1]
    || path.join(REPORT_DIR, 'benchmark-report.txt');

  console.log('================================================================================');
  console.log('                    BENCHMARK PIPELINE DE GENERATION');
  console.log('================================================================================');
  console.log(`Iterations: ${iterations}`);
  console.log(`Skip AI: ${skipAI}`);
  console.log(`Report: ${reportPath}`);
  console.log('================================================================================\n');

  const results = [];
  const filesToCleanup = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`\n--- Iteration ${i + 1}/${iterations} ---`);
    const result = new BenchmarkResult();

    // Benchmark par etape
    console.log('  [1/4] Inference IA...');
    const aiSections = await benchmarkAIInference(result, skipAI);
    console.log(`        -> ${result.steps['AI Inference']?.durationMs || 0}ms`);

    // Preparer les donnees pour HTML
    const documentData = {
      ...SAMPLE_PROPOSAL_DRAFT,
      ...aiSections,
      budget: '20 000 EUR',
      budgetRaw: 20000,
      budgetEnLettres: 'vingt mille euros',
      echeancier: '- A la commande: 6 000 EUR (30%)\n- Phase 1: 5 000 EUR (25%)\n- Phase 2: 5 000 EUR (25%)\n- Solde: 4 000 EUR (20%)',
      echeancier2: '- Phase 3: 2 000 EUR (10%)\n- Phase 4: 2 000 EUR (10%)',
      objectifs: SAMPLE_PROPOSAL_DRAFT.ia_objectifs,
      livrables: SAMPLE_PROPOSAL_DRAFT.ia_solution,
      methodologie: [aiSections?.demarche, aiSections?.phases].filter(Boolean).join('\n\n'),
      eligibiliteCII: 'Oui',
      eligibiliteCIR: 'Non',
      DateDuJour: '20 janvier 2026'
    };

    console.log('  [2/4] Render HTML...');
    const html = await benchmarkHtmlRender(result, documentData);
    console.log(`        -> ${result.steps['HTML Render']?.durationMs || 0}ms`);

    console.log('  [3/4] Render PDF...');
    const pdfPath = await benchmarkPdfRender(result, html);
    console.log(`        -> ${result.steps['PDF Render']?.durationMs || 0}ms`);
    if (pdfPath) filesToCleanup.push(pdfPath);

    console.log('  [4/4] Pipeline complet...');
    const fullResult = await benchmarkFullPipeline(result, skipAI);
    console.log(`        -> ${result.steps['Full Pipeline']?.durationMs || 0}ms`);
    if (fullResult?.documents?.pdf?.path) filesToCleanup.push(fullResult.documents.pdf.path);

    result.calculatePercentages();
    results.push(result);

    console.log(`\n  Total iteration: ${result.totalDuration}ms`);
    console.log(`  Objectif 60s: ${result.isWithinTarget(60000) ? 'OK' : 'KO'}`);
  }

  // Nettoyage
  console.log('\nNettoyage des fichiers temporaires...');
  await cleanup(filesToCleanup);

  // Generation du rapport
  console.log('Generation du rapport...');
  const report = generateReport(results, iterations);

  // Sauvegarde
  await fsp.mkdir(REPORT_DIR, { recursive: true });
  await fsp.writeFile(reportPath, report);
  await saveJsonReport(results, reportPath.replace('.txt', '.json'));

  console.log(report);
  console.log(`\nRapport sauvegarde: ${reportPath}`);
  console.log(`Rapport JSON: ${reportPath.replace('.txt', '.json')}`);

  // Exit code base sur l'objectif
  const avgDuration = results.reduce((sum, r) => sum + r.totalDuration, 0) / results.length;
  if (avgDuration > 60000) {
    console.log('\n[KO] Temps moyen depasse 60 secondes');
    process.exitCode = 1;
  } else {
    console.log('\n[OK] Temps moyen sous 60 secondes');
  }
}

// Execution
main().catch(err => {
  console.error('Erreur fatale:', err.message);
  process.exitCode = 1;
});
