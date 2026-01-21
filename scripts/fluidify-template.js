const fs = require('fs');
const path = require('path');

/**
 * TEMPLATE FLUIDIFICATION SCRIPT
 * Generates a fluid HTML template for proposal generation.
 * This template uses CSS flexbox/grid instead of absolute positioning,
 * allowing AI-generated content to flow naturally without breaking layout.
 */

const OUTPUT_FILE = path.join(__dirname, '../templates/proposal.html');

console.log('Starting template generation...');

const fluidTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposition Commerciale Icam</title>
  <style>
    /* === RESET & BASE === */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      line-height: 1.5;
      color: #333;
      background: #fff;
    }

    /* === COLORS (Icam Brand) === */
    :root {
      --icam-orange: #E35205;
      --icam-dark: #1a1a1a;
      --icam-gray: #666;
      --icam-light-gray: #f5f5f5;
      --icam-border: #ddd;
    }

    /* === PAGE LAYOUT === */
    .page {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm 20mm;
      background: #fff;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    .no-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* === COVER PAGE === */
    .cover {
      min-height: 250mm;
      display: flex;
      flex-direction: column;
    }

    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }

    .logo-section {
      display: flex;
      flex-direction: column;
    }

    .logo {
      font-size: 32pt;
      font-weight: bold;
      color: var(--icam-orange);
      letter-spacing: 2px;
    }

    .logo-subtitle {
      font-size: 10pt;
      color: var(--icam-gray);
      margin-top: 4px;
    }

    .client-info {
      text-align: right;
      font-size: 10pt;
      line-height: 1.6;
    }

    .client-info strong {
      color: var(--icam-dark);
    }

    .cover-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 60px 0;
    }

    .cover-title {
      font-size: 28pt;
      font-weight: bold;
      color: var(--icam-orange);
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 30px;
    }

    .cover-subtitle {
      font-size: 14pt;
      color: var(--icam-dark);
      max-width: 80%;
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .cover-ref {
      font-size: 10pt;
      color: var(--icam-gray);
      margin-top: 15px;
    }

    .cover-details {
      background: var(--icam-light-gray);
      border-left: 4px solid var(--icam-orange);
      padding: 20px 25px;
      margin-top: auto;
      font-size: 10pt;
      line-height: 1.8;
    }

    .cover-details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 30px;
    }

    .cover-details strong {
      color: var(--icam-dark);
    }

    /* === SECTION STYLING === */
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: var(--icam-orange);
      text-transform: uppercase;
      border-bottom: 2px solid var(--icam-orange);
      padding-bottom: 6px;
      margin: 30px 0 15px 0;
    }

    .section-title:first-child {
      margin-top: 0;
    }

    .subsection-title {
      font-size: 12pt;
      font-weight: bold;
      color: var(--icam-dark);
      margin: 20px 0 10px 0;
    }

    /* === CONTENT BLOCKS === */
    .block {
      margin-bottom: 15px;
      text-align: justify;
      line-height: 1.6;
    }

    .ai-content {
      margin: 15px 0;
      text-align: justify;
      line-height: 1.6;
    }

    .ai-content p {
      margin-bottom: 10px;
    }

    .ai-content ul, .ai-content ol {
      margin: 10px 0 10px 25px;
    }

    .ai-content li {
      margin-bottom: 5px;
    }

    .ai-content h3 {
      font-size: 12pt;
      font-weight: bold;
      color: var(--icam-dark);
      margin: 15px 0 8px 0;
    }

    .ai-content h4 {
      font-size: 11pt;
      font-weight: bold;
      color: var(--icam-gray);
      margin: 12px 0 6px 0;
    }

    /* === TABLES === */
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10pt;
    }

    .table th,
    .table td {
      border: 1px solid var(--icam-border);
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }

    .table th {
      background: var(--icam-light-gray);
      font-weight: bold;
      color: var(--icam-dark);
    }

    .table.payment-schedule th {
      background: var(--icam-orange);
      color: #fff;
    }

    /* === INFO BOX === */
    .info-box {
      background: var(--icam-light-gray);
      border-left: 4px solid var(--icam-orange);
      padding: 15px 20px;
      margin: 20px 0;
    }

    .info-box.highlight {
      background: #fff8f0;
      border-color: var(--icam-orange);
    }

    /* === SIGNATURE SECTION === */
    .signature-section {
      margin-top: 50px;
    }

    .signature-table {
      width: 100%;
      border-collapse: collapse;
    }

    .signature-table td {
      width: 50%;
      height: 150px;
      border: 1px solid var(--icam-border);
      padding: 15px;
      vertical-align: top;
    }

    .signature-table strong {
      color: var(--icam-dark);
    }

    /* === UTILITIES === */
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: var(--icam-gray); }
    .text-orange { color: var(--icam-orange); }
    .mt-20 { margin-top: 20px; }
    .mb-20 { margin-bottom: 20px; }

    /* === PRINT STYLES === */
    @media print {
      body {
        background: #fff;
      }

      .page {
        padding: 0;
        max-width: none;
      }

      .page-break {
        page-break-before: always;
      }

      .no-break {
        page-break-inside: avoid;
      }

      .cover {
        min-height: auto;
      }
    }
  </style>
</head>
<body>

  <!-- ========== PAGE 1: COVER ========== -->
  <div class="page cover">
    <div class="cover-header">
      <div class="logo-section">
        <div class="logo">icam</div>
        <div class="logo-subtitle">Grand Paris Sud</div>
      </div>
      <div class="client-info">
        <div><strong>Client :</strong> {{entrepriseNom}}</div>
        <div><strong>A l'attention de :</strong> {{clientNom}}</div>
        <div><strong>Date :</strong> {{DateDuJour}}</div>
      </div>
    </div>

    <div class="cover-main">
      <div class="cover-title">Proposition Commerciale</div>
      <div class="cover-subtitle">{{titre}}</div>
      <div class="cover-ref">
        <div>Ref : {{codeProjet}}_{{entrepriseNom}}</div>
        <div>Type : {{typeContrat}}</div>
      </div>
    </div>

    <div class="cover-details">
      <div class="cover-details-grid">
        <div><strong>Entreprise :</strong> {{entrepriseNom}}</div>
        <div><strong>Adresse :</strong> {{entrepriseAdresse}}</div>
        <div><strong>Contact :</strong> {{clientNom}} ({{clientFonction}})</div>
        <div><strong>Email :</strong> {{clientEmail}}</div>
        <div><strong>Telephone :</strong> {{clientTelephone}}</div>
        <div><strong>Thematique :</strong> {{thematique}}</div>
        <div><strong>Demarrage :</strong> {{dateDebut}}</div>
        <div><strong>Duree :</strong> {{dureeSemaines}} semaines</div>
      </div>
    </div>
  </div>

  <!-- ========== PAGE 2+: CONTENT ========== -->
  <div class="page-break"></div>

  <div class="page">
    <!-- Section 1: Contexte et objectifs -->
    <div class="section-title">1. Contexte et objectifs</div>
    <div class="ai-content">{{contexte}}</div>

    <!-- Section 2: Demarche proposee -->
    <div class="section-title">2. Demarche proposee</div>
    <div class="ai-content">{{demarche}}</div>

    <!-- Section 3: Phasage et livrables -->
    <div class="section-title">3. Phasage et livrables</div>
    <div class="ai-content">{{phases}}</div>
  </div>

  <div class="page-break"></div>

  <div class="page">
    <!-- Section 4: Budget et planning -->
    <div class="section-title">4. Budget et planning</div>

    <div class="info-box highlight no-break">
      <div class="ai-content">{{budget_texte}}</div>
    </div>

    <div class="subsection-title">Echeancier de paiement</div>
    <div class="ai-content">{{echeancier}}</div>
    <div class="ai-content">{{echeancier2}}</div>

    <!-- Section 5: Propriete intellectuelle -->
    <div class="section-title">5. Propriete intellectuelle</div>
    <div class="block">{{clause_propriete_intellectuelle}}</div>

    <!-- Eligibilite CII/CIR si applicable -->
    <div class="ai-content">{{eligibiliteCII}}</div>
  </div>

  <div class="page-break"></div>

  <div class="page">
    <!-- Section 6: Clauses contractuelles -->
    <div class="section-title">6. Clauses contractuelles</div>

    <div class="subsection-title">Confidentialite</div>
    <div class="block">
      Les parties s'engagent a considerer comme strictement confidentielles toutes les informations echangees dans le cadre de cette proposition et du projet qui en decoule. Cette obligation de confidentialite restera en vigueur pendant toute la duree du projet et pendant une periode de cinq (5) ans apres son achevement.
    </div>

    <div class="subsection-title">Limites du projet - Responsabilites</div>
    <div class="block">
      L'Icam s'engage a apporter tout le soin necessaire a la realisation des prestations decrites. Sa responsabilite est limitee aux dommages directs et ne saurait exceder le montant total du contrat. L'Icam ne peut etre tenu responsable des decisions prises par le client sur la base des livrables fournis.
    </div>

    <div class="subsection-title">Juridiction et litiges</div>
    <div class="block">
      En cas de litige relatif a l'interpretation ou a l'execution du present contrat, les parties s'engagent a rechercher une solution amiable. A defaut d'accord, le litige sera soumis aux tribunaux competents de Paris.
    </div>

    <div class="subsection-title">Duree et validite</div>
    <div class="block">
      La duree de l'etude est estimee a {{dureeSemaines}} semaines a compter de la date de demarrage convenue ({{dateDebut}}). Cette proposition est valable pendant une duree de trois (3) mois a compter de sa date d'emission.
    </div>
  </div>

  <!-- Annexe supplementaire (genere dynamiquement si budget > seuil) -->
  {{annexe_supplementaire}}

  <div class="page-break"></div>

  <div class="page">
    <!-- Section Signatures -->
    <div class="section-title">Acceptation de la proposition</div>

    <div class="block">
      La signature du present document vaut acceptation des termes de la proposition commerciale et engagement des deux parties.
    </div>

    <div class="signature-section no-break">
      <table class="signature-table">
        <tr>
          <td>
            <strong>Pour l'Icam :</strong><br><br>
            Nom : _______________________________<br><br>
            Fonction : ___________________________<br><br>
            Date : _______________________________<br><br>
            Signature :
          </td>
          <td>
            <strong>Pour {{entrepriseNom}} :</strong><br><br>
            Nom : _______________________________<br><br>
            Fonction : ___________________________<br><br>
            Date : _______________________________<br><br>
            Signature :
          </td>
        </tr>
      </table>
    </div>

    <div class="info-box mt-20">
      <div class="text-muted text-center">
        Document genere le {{DateDuJour}} - Ref: {{codeProjet}}<br>
        Icam Grand Paris Sud - Site de formation, recherche et services aux entreprises
      </div>
    </div>
  </div>

</body>
</html>`;

try {
  fs.writeFileSync(OUTPUT_FILE, fluidTemplate, 'utf8');
  console.log(`Success: generated fluid template at ${OUTPUT_FILE}`);
  console.log('Template features:');
  console.log('  - CSS flexbox/grid layout (no absolute positioning)');
  console.log('  - Dynamic content adaptation');
  console.log('  - Print-optimized page breaks');
  console.log('  - 21 placeholders for AI and form data');
} catch (error) {
  console.error('Critical error:', error.message);
  process.exitCode = 1;
}
