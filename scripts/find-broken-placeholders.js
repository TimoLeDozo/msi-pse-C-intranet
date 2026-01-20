require('dotenv').config();

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const DELIM = '\u0000';

function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function getTemplatePath() {
  const argPath = process.argv[2];
  const templateName = argPath || process.env.DOCX_TEMPLATE_NAME;
  if (!templateName) return null;
  if (path.isAbsolute(templateName)) return templateName;
  return path.join(__dirname, '..', 'templates', templateName);
}

function extractTextNodes(xml) {
  const nodes = [];
  const regex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    nodes.push(decodeXml(match[1]));
  }
  return nodes;
}

function buildCombined(nodes) {
  let combined = '';
  const ranges = [];
  nodes.forEach((text, idx) => {
    const start = combined.length;
    combined += text;
    const end = combined.length;
    ranges.push({ idx, start, end, text });
    if (idx < nodes.length - 1) combined += DELIM;
  });
  return { combined, ranges };
}

function findBrokenPlaceholders(combined, ranges) {
  const results = [];
  const normalizedMap = [];
  const normalizedChars = [];

  for (let i = 0; i < combined.length; i += 1) {
    const ch = combined[i];
    if (ch === DELIM) continue;
    normalizedMap.push(i);
    normalizedChars.push(ch);
  }

  const normalized = normalizedChars.join('');
  const placeholderRegex = /\{\{[^}]*\}\}/g;
  let match;
  while ((match = placeholderRegex.exec(normalized)) !== null) {
    const normalizedStart = match.index;
    const normalizedEnd = match.index + match[0].length - 1;
    const combinedStart = normalizedMap[normalizedStart];
    const combinedEnd = normalizedMap[normalizedEnd];
    const segment = combined.slice(combinedStart, combinedEnd + 1);

    if (!segment.includes(DELIM)) continue;

    const nodes = ranges.filter((r) => r.end > combinedStart && r.start < combinedEnd + 1);
    const broken = segment.split(DELIM).join('|');
    const contextStart = Math.max(0, combinedStart - 30);
    const contextEnd = Math.min(combined.length, combinedEnd + 31);
    const context = combined
      .slice(contextStart, contextEnd)
      .split(DELIM)
      .join('|');

    results.push({
      broken,
      normalized: match[0],
      nodes,
      context
    });
  }

  return results;
}

function formatReport(findings, templatePath) {
  const lines = [];
  lines.push(`Template: ${templatePath}`);
  lines.push('');

  if (findings.length === 0) {
    lines.push('No broken placeholders found.');
    return lines.join('\n');
  }

  let total = 0;
  findings.forEach((fileResult) => {
    lines.push(`[${fileResult.file}]`);
    fileResult.results.forEach((result, idx) => {
      total += 1;
      lines.push(`${idx + 1}. ${result.broken} -> ${result.normalized}`);
      lines.push(`   context: ${result.context}`);
      lines.push('   fragments:');
      result.nodes.forEach((node) => {
        lines.push(`     - #${node.idx}: "${node.text}"`);
      });
    });
    lines.push('');
  });

  lines.push(`Total broken placeholders: ${total}`);
  return lines.join('\n');
}

function main() {
  const templatePath = getTemplatePath();
  if (!templatePath) {
    console.error('DOCX_TEMPLATE_NAME is not set and no path argument provided.');
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exitCode = 1;
    return;
  }

  const buffer = fs.readFileSync(templatePath);
  const zip = new PizZip(buffer);
  const xmlFiles = zip.file(/word\/(document|header\d+|footer\d+)\.xml/);

  const findings = [];
  xmlFiles.forEach((file) => {
    const xml = file.asText();
    const nodes = extractTextNodes(xml);
    if (!nodes.length) return;
    const { combined, ranges } = buildCombined(nodes);
    const results = findBrokenPlaceholders(combined, ranges);
    if (results.length) {
      findings.push({ file: file.name, results });
    }
  });

  const report = formatReport(findings, templatePath);
  const reportDir = path.join(__dirname, '..', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'placeholder-report.txt');
  fs.writeFileSync(reportPath, report, 'utf8');

  console.log(report);
  console.log(`\nReport saved to: ${reportPath}`);
}

main();
