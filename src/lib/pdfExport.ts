import type { PerTestAnalytics, TestAttempt } from '../types';

function escapePdfText(text: string): string {
  // Keep printable ASCII so PDF standard Helvetica font renders cleanly everywhere
  const ascii = text.replace(/[^\x20-\x7E]/g, ' ');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLine(text: string, maxChars = 84): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

/**
 * Generates a valid, self-contained single- or multi-page PDF 1.4 binary Blob
 * using built-in Helvetica font — works cleanly inside sandboxed iframes without window.open.
 */
export function buildTextLinesPdfBlob(title: string, lines: string[]): Blob {
  const pageWidth = 595; // A4 pt
  const pageHeight = 842;
  const marginX = 48;
  const topY = 788;
  const bottomY = 56;
  const lineHeight = 15;

  const formattedLines: Array<{ text: string; bold?: boolean; size?: number }> = [
    { text: title, bold: true, size: 16 },
    { text: `Generated on ${new Date().toLocaleString('en-IN')}`, size: 9 },
    { text: '', size: 10 },
  ];

  lines.forEach((raw) => {
    if (raw.startsWith('## ')) {
      formattedLines.push({ text: '', size: 8 });
      formattedLines.push({ text: raw.slice(3), bold: true, size: 12 });
    } else {
      wrapLine(raw, 86).forEach((chunk) => {
        formattedLines.push({ text: chunk, size: 10 });
      });
    }
  });

  // Paginate lines
  const pages: Array<Array<{ text: string; bold?: boolean; size?: number }>> = [];
  let currentPage: Array<{ text: string; bold?: boolean; size?: number }> = [];
  let y = topY;

  for (const item of formattedLines) {
    const step = (item.size ?? 10) >= 15 ? 22 : (item.size ?? 10) >= 12 ? 18 : lineHeight;
    if (y - step < bottomY && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      y = topY;
    }
    currentPage.push(item);
    y -= step;
  }
  if (currentPage.length > 0) pages.push(currentPage);

  // Build PDF objects:
  // 1: Catalog, 2: Pages, 3: Helvetica, 4: Helvetica-Bold, then pairs of (Page, Content)
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push(''); // placeholder for Pages object (id 2)
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  let nextObjId = 5;
  pages.forEach((pageLines, pageIdx) => {
    const pageObjId = nextObjId++;
    const contentObjId = nextObjId++;
    pageObjectIds.push(pageObjId);

    const streamOps: string[] = ['BT'];
    let cursorY = topY;

    pageLines.forEach((line) => {
      const size = line.size ?? 10;
      const fontRef = line.bold ? '/F2' : '/F1';
      const step = size >= 15 ? 22 : size >= 12 ? 18 : lineHeight;
      if (line.text) {
        streamOps.push(`${fontRef} ${size} Tf`);
        streamOps.push(`1 0 0 1 ${marginX} ${cursorY} Tm`);
        streamOps.push(`(${escapePdfText(line.text)}) Tj`);
      }
      cursorY -= step;
    });

    // Footer page number
    streamOps.push('/F1 8 Tf');
    streamOps.push(`1 0 0 1 ${marginX} 30 Tm`);
    streamOps.push(
      `(${escapePdfText(`Evalynx Analytics Report - Page ${pageIdx + 1} of ${pages.length}`)}) Tj`
    );
    streamOps.push('ET');

    const streamContent = streamOps.join('\n');
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`
    );
  });

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(' ')}] /Count ${pageObjectIds.length} >>\nendobj\n`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadTestAnalyticsPdf(
  analytics: PerTestAnalytics,
  submissions: TestAttempt[]
): void {
  const avgMins = Math.floor(analytics.averageTimeSeconds / 60);
  const avgSecs = analytics.averageTimeSeconds % 60;

  const lines: string[] = [
    `Subject: ${analytics.subject || 'General'}`,
    `Total Submissions: ${analytics.submissionCount} (${analytics.evaluatedCount} evaluated)`,
    `Average Score: ${analytics.averagePercent}% (${analytics.averageMarks} / ${analytics.totalMarks} marks)`,
    `Highest Score: ${analytics.highestPercent}% (${analytics.highestMarks} / ${analytics.totalMarks}) | Lowest Score: ${analytics.lowestPercent}% (${analytics.lowestMarks} / ${analytics.totalMarks})`,
    `Pass Rate: ${analytics.passRate}% | Average Time: ${avgMins}m ${avgSecs}s`,
    `Monitoring Summary: ${analytics.highRiskCount} high-risk attempts, ${analytics.flaggedCount} flagged submissions`,
    '## Score Distribution',
    ...analytics.scoreDistribution.map(
      (b) => `  ${b.range.padEnd(10)} : ${b.count} students (${b.percentage}%)`
    ),
    '## Hardest Questions (Lowest Accuracy)',
    ...(analytics.hardestQuestions.length > 0
      ? analytics.hardestQuestions.map(
          (q) =>
            `  Q${q.questionNumber} [${q.topic}] - ${q.accuracyPercent}% accuracy (${q.correctCount} correct, ${q.wrongCount} wrong, ${q.skippedCount} skipped) - ${q.prompt.slice(0, 56)}`
        )
      : ['  No graded question responses yet.']),
    '## Student Submissions',
    ...(submissions.length > 0
      ? submissions.slice(0, 40).map((s) => {
          const risk = (s.riskLevel || 'low').toUpperCase();
          return `  ${s.studentName} (${s.studentEmail}) - ${s.score}/${s.totalMarks} (${s.percentage}%) | Integrity: ${s.integrityScore ?? 100}% (${risk}) | Violations: ${s.violationCount ?? 0}`;
        })
      : ['  No submissions recorded yet.']),
  ];

  const blob = buildTextLinesPdfBlob(`${analytics.testTitle} - Analytics Report`, lines);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `evalynx-${analytics.testTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-analytics.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
