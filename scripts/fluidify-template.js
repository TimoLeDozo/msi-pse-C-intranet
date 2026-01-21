const fs = require('fs');
const path = require('path');

/**
 * TEMPLATE FLUIDIFICATION SCRIPT
 * Goal: transform a static PDF-like HTML into a fluid layout that can be
 * safely filled by AI placeholders without breaking the layout.
 */

const INPUT_FILE = path.join(__dirname, '../templates/Template-PlaceHolder-V2.html');
const OUTPUT_FILE = path.join(__dirname, '../templates/proposal.html');

console.log('Starting template fluidification...');

try {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Source file not found: ${INPUT_FILE}`);
  }

  const sourceHtml = fs.readFileSync(INPUT_FILE, 'utf8');

  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const styles = [];
  let match;
  while ((match = styleRegex.exec(sourceHtml)) !== null) {
    styles.push(match[1]);
  }

  if (!styles.length) {
    throw new Error('No CSS styles found in the source HTML.');
  }

  const originalCSS = styles.join('\n');

  const fluidCSS = `
    /* --- FLUID LAYOUT RULES --- */
    body {
      background-color: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-y: auto !important;
      color: #111;
    }

    .page-container {
      width: 210mm;
      margin: 0 auto;
      position: relative;
      background: #fff;
      padding: 20mm;
      box-sizing: border-box;
    }

    .pc, .c, .t {
      position: relative !important;
      left: auto !important;
      top: auto !important;
      width: 100% !important;
      height: auto !important;
      white-space: normal !important;
      transform: none !important;
    }

    .ai-content {
      margin-top: 12px;
      margin-bottom: 20px;
      text-align: justify;
      line-height: 1.5;
      color: #333;
      font-size: 11pt;
      font-family: 'Calibri', Arial, sans-serif;
    }

    .icam-title {
      color: #E35205;
      font-size: 22pt;
      margin: 0 0 10px 0;
      text-transform: uppercase;
    }

    .icam-subtitle {
      color: #E35205;
      font-size: 14pt;
      border-bottom: 2px solid #E35205;
      padding-bottom: 4px;
      margin: 28px 0 12px;
      text-transform: uppercase;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 10.5pt;
    }

    .table th,
    .table td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }

    .muted {
      color: #666;
    }

    .page-break {
      page-break-before: always;
    }

    .no-break {
      page-break-inside: avoid;
    }

    @media print {
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
    }
  `;

  const newHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Proposition Commerciale Icam</title>
  <style>
${originalCSS}
  </style>
  <style>
${fluidCSS}
  </style>
</head>
<body>
  <div class="page-container">
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <div style="color:#E35205; font-weight:bold; font-size:20pt;">icam</div>
        <div class="muted">Grand Paris Sud</div>
      </div>
      <div style="text-align:right;">
        <div><strong>Client:</strong> {{entrepriseNom}}</div>
        <div><strong>A l'attention de:</strong> {{clientNom}}</div>
        <div><strong>Date:</strong> {{DateDuJour}}</div>
      </div>
    </div>

    <div style="margin-top:60px; text-align:center;">
      <div class="icam-title">Proposition Commerciale</div>
      <div class="ai-content">{{titre}}</div>
      <div class="muted">Ref: {{codeProjet}}_{{entrepriseNom}}</div>
      <div class="muted">Type: {{typeContrat}}</div>
    </div>

    <div style="margin-top:50px; background:#f9f9f9; padding:22px; border-left:4px solid #E35205;">
      <div><strong>Entreprise:</strong> {{entrepriseNom}}</div>
      <div><strong>Adresse:</strong> {{entrepriseAdresse}}</div>
      <div><strong>Contact:</strong> {{clientNom}} ({{clientFonction}})</div>
      <div><strong>Email:</strong> {{clientEmail}} - <strong>Tel:</strong> {{clientTelephone}}</div>
      <div><strong>Demarrage:</strong> {{dateDebut}} - <strong>Duree:</strong> {{dureeSemaines}} semaines</div>
      <div><strong>Thematique:</strong> {{thematique}}</div>
    </div>
  </div>

  <div class="page-break"></div>

  <div class="page-container">
    <h2 class="icam-subtitle">1. Contexte et objectifs</h2>
    <div class="ai-content">{{contexte}}</div>

    <h2 class="icam-subtitle">2. Demarche proposee</h2>
    <div class="ai-content">{{demarche}}</div>

    <h2 class="icam-subtitle">3. Phasage et livrables</h2>
    <div class="ai-content">{{phases}}</div>

    <h2 class="icam-subtitle">4. Budget et planning</h2>
    <div class="ai-content">{{budget_texte}}</div>
    <div class="ai-content">{{echeancier}}</div>
    <div class="ai-content">{{echeancier2}}</div>

    <h2 class="icam-subtitle">5. Propriete intellectuelle</h2>
    <div class="ai-content">{{clause_propriete_intellectuelle}}</div>

    <div class="ai-content">{{eligibiliteCII}}</div>

    {{annexe_supplementaire}}

    <div class="no-break" style="margin-top:50px;">
      <table class="table">
        <tr>
          <td style="width:50%; height:130px;">
            <strong>Pour l'Icam:</strong><br><br>
            Date: ______________<br>
            Signature:
          </td>
          <td style="width:50%; height:130px;">
            <strong>Pour {{entrepriseNom}}:</strong><br><br>
            Date: ______________<br>
            Signature:
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
  `.trim();

  fs.writeFileSync(OUTPUT_FILE, newHtml, 'utf8');

  console.log(`Success: generated template at ${OUTPUT_FILE}`);
} catch (error) {
  console.error('Critical error:', error.message);
  process.exitCode = 1;
}
