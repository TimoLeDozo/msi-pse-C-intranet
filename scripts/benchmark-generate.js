require('dotenv').config();

const fs = require('fs');
const generateProposal = require('../usecases/generateProposal.usecase');

const sample = {
  entrepriseNom: 'BenchmarkCo',
  titre: 'Benchmark',
  thematique: 'RD',
  dureeSemaines: 24,
  nbEquipes: 1,
  ia_histoire: 'Synthetic history',
  ia_probleme: 'Synthetic problem',
  ia_solution: 'Synthetic solution',
  ia_objectifs: 'Synthetic objectives'
};

async function cleanup(result) {
  const paths = [
    result?.documents?.pdf?.path
  ].filter(Boolean);

  for (const filePath of paths) {
    try {
      await fs.promises.unlink(filePath);
    } catch (_) {}
  }
}

async function run() {
  const start = Date.now();
  const result = await generateProposal.execute(sample);
  const durationMs = Date.now() - start;

  console.log(`durationMs=${durationMs}`);

  if (!result.success) {
    await cleanup(result);
    throw new Error(result.error || 'Generation failed');
  }

  if (!result.documents?.pdf) {
    await cleanup(result);
    throw new Error('PDF not generated (Playwright missing or failed)');
  }

  if (durationMs > 60000) {
    await cleanup(result);
    throw new Error('Generation exceeded 60 seconds');
  }

  await cleanup(result);
  console.log('OK');
}

run().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
