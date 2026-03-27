import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Band = 'C' | 'H' | 'A' | 'S' | 'I' | 'D' | 'E';
type Scale = 'interest' | 'aptitude';

const SECTION_TO_BAND: Record<number, Band> = {
  1: 'C',
  2: 'H',
  3: 'A',
  4: 'S',
  5: 'I',
  6: 'D',
  7: 'E',
};

const BAND_LABELS: Record<Band, string> = {
  C: 'Científico',
  H: 'Humanístico',
  A: 'Artístico',
  S: 'Social',
  I: 'Investigativo',
  D: 'Directivo',
  E: 'Emprendedor',
};

export function isYes(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return t === 'sí' || t === 'si';
}

type RawCounts = {
  interest: Record<Band, number>;
  aptitude: Record<Band, number>;
};

export type ChasideScore = {
  clientId: number;
  testId: number;
  client: import('./pdfUtils').ClientPdfData;
  counts: RawCounts;
  totals: { interest: number; aptitude: number; overall: Record<Band, number> };
  ranking: {
    interest: Array<{ band: Band; value: number }>;
    aptitude: Array<{ band: Band; value: number }>;
    overall: Array<{ band: Band; value: number }>;
  };
  answered: number;
  yesCount: number;
};

async function getChasideTestId(): Promise<number> {
  const { data, error } = await supabase
    .from('tests')
    .select('id, testname')
    .ilike('testname', '%chaside%')
    .maybeSingle();

  if (error || !data) {
    throw new Error('No se encontró el test CHASIDE en la tabla "tests".');
  }
  return data.id;
}

export async function computeChasideScore(clientId: number, attemptId: string = 'active'): Promise<ChasideScore> {
  const testId = await getChasideTestId();

  const { data: urows } = await supabase
    .from('users')
    .select('id, name, firstlastname, secondlastname')
    .eq('id', clientId)
    .limit(1);
  const urow = urows?.[0];
  const { data: cirows } = await supabase
    .from('clientsinfo')
    .select('school, grade, birthday, birthplace, gender')
    .eq('userid', clientId)
    .limit(1);
  const ci = cirows?.[0];
  const clientData: import('./pdfUtils').ClientPdfData = {
    name:           urow?.name           ?? null,
    firstlastname:  urow?.firstlastname  ?? null,
    secondlastname: urow?.secondlastname ?? null,
    school:         ci?.school           ?? null,
    grade:          ci?.grade            ?? null,
    birthday:       ci?.birthday         ?? null,
    birthplace:     ci?.birthplace       ?? null,
    gender:         ci?.gender           ?? null,
  };

  const { data: qrows, error: qErr } = await supabase
    .from('questions')
    .select('id, section, chatype')
    .eq('testid', testId)
    .range(0, 99999);

  if (qErr) throw qErr;

  const qToBand = new Map<number, Band>();
  const qToScale = new Map<number, Scale>();

  for (const q of qrows || []) {
    const band = SECTION_TO_BAND[q.section as number];
    const scale = (q.chatype as string)?.toLowerCase() as Scale;
    if (!band) continue;
    if (scale !== 'interest' && scale !== 'aptitude') continue;
    qToBand.set(q.id, band);
    qToScale.set(q.id, scale);
  }

  const { data: arows, error: aErr } = await supabase
    .from('testsanswers')
    .select('questionid, answerid, details')
    .eq('clientid', clientId)
    .eq('testid', testId)
    .order('questionid', { ascending: true })
    .range(0, 999999);

  if (aErr) throw aErr;

  const filteredArows = (arows || []).filter(r => {
    const d = r.details || '';
    if (attemptId === 'active') return !d.startsWith('[HIST_');
    return d.startsWith(attemptId);
  });

  const answerIds = Array.from(
    new Set((arows || []).map((r) => r.answerid).filter((x): x is number => x != null))
  );

  let idToText = new Map<number, string>();
  if (answerIds.length) {
    const { data: optrows, error: oErr } = await supabase
      .from('answeroptions')
      .select('id, answer')
      .in('id', answerIds)
      .range(0, 999999);
    if (oErr) throw oErr;
    idToText = new Map((optrows || []).map((o) => [o.id, String(o.answer || '')]));
  }

  const { counts, totals, ranking, answered, yesCount } = calculateChasideResultSummary(
    filteredArows,
    qToBand,
    qToScale,
    idToText
  );

  return {
    clientId,
    testId,
    client: clientData,
    counts,
    totals,
    ranking,
    answered,
    yesCount,
  };
}

export function calculateChasideResultSummary(
  filteredArows: Array<{ questionid: number; answerid?: number | null; details?: string | null }>,
  qToBand: Map<number, Band>,
  qToScale: Map<number, Scale>,
  idToText: Map<number, string>
) {
  const initBandCounts = (): Record<Band, number> =>
    ({ C: 0, H: 0, A: 0, S: 0, I: 0, D: 0, E: 0 });

  const counts: RawCounts = {
    interest: initBandCounts(),
    aptitude: initBandCounts(),
  };

  let answered = 0;
  let yesCount = 0;

  for (const r of filteredArows) {
    const band = qToBand.get(r.questionid);
    const scale = qToScale.get(r.questionid);
    if (!band || !scale) continue;

    answered++;

    const txt = r.answerid ? idToText.get(r.answerid) : r.details;
    if (isYes(txt)) {
      counts[scale][band] += 1;
      yesCount++;
    }
  }

  const totalsInterest = (Object.values(counts.interest) as number[]).reduce((a, b) => a + b, 0);
  const totalsAptitude = (Object.values(counts.aptitude) as number[]).reduce((a, b) => a + b, 0);

  const overall: Record<Band, number> = initBandCounts();
  (Object.keys(overall) as Band[]).forEach((b) => {
    overall[b] = counts.interest[b] + counts.aptitude[b];
  });

  const sortBands = (rec: Record<Band, number>) =>
    (Object.keys(rec) as Band[])
      .map((b) => ({ band: b, value: rec[b] }))
      .sort((x, y) => y.value - x.value || BAND_LABELS[x.band].localeCompare(BAND_LABELS[y.band]));

  const ranking = {
    interest: sortBands(counts.interest),
    aptitude: sortBands(counts.aptitude),
    overall: sortBands(overall),
  };

  return { counts, totals: { interest: totalsInterest, aptitude: totalsAptitude, overall }, ranking, answered, yesCount };
}

export async function downloadChasideReportPDF(clientId: number, attemptId: string = 'active'): Promise<void> {
  const score = await computeChasideScore(clientId, attemptId);
  const { drawPremiumHeader, drawClientCard, drawSectionHeading, drawFooter, PDF_COLORS, PDF_FONT_SIZE } = await import('./pdfUtils');

  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('es-ES');

  // Header
  let y = drawPremiumHeader(doc, 'CHASIDE — Informe de Resultados', 'Inventario de Intereses y Aptitudes Vocacionales', now);

  // Client info card
  const { buildClientCardFields } = await import('./pdfUtils');
  y = drawClientCard(doc, y, buildClientCardFields(score.client));

  // Legend
  y = drawSectionHeading(doc, y, 'Referencia de Bandas');

  const bands: Band[] = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];
  const cols = 2;
  const colW = (210 - 14 * 2) / cols;
  bands.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = 14 + col * colW;
    const by = y + row * 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.accentGreen as [number,number,number]);
    doc.text(`${b}`, bx, by);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.bodyText as [number,number,number]);
    doc.text(`= ${BAND_LABELS[b]}`, bx + 5, by);
  });
  y += Math.ceil(bands.length / cols) * 6 + 4;

  // Scores table
  y = drawSectionHeading(doc, y, 'Resultados por Escala');
  const interestRow = ['Interés', ...bands.map((b) => String(score.counts.interest[b]))];
  const aptitudeRow = ['Aptitud', ...bands.map((b) => String(score.counts.aptitude[b]))];
  const overallRow  = ['Total (I+A)', ...bands.map((b) => String(score.totals.overall[b]))];

  autoTable(doc, {
    startY: y,
    head: [['Escala', ...bands]],
    body: [interestRow, aptitudeRow, overallRow],
    styles: { fontSize: PDF_FONT_SIZE, cellPadding: 3, halign: 'center' as const, font: 'helvetica' },
    headStyles: { fillColor: PDF_COLORS.accentGreen, textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: PDF_COLORS.bodyText },
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Bar chart — Total (I+A) per band
  const { drawHorizontalBarChart, CHART_PALETTE } = await import('./pdfUtils');
  y = drawSectionHeading(doc, y, 'Gráfico de Resultados — Total (Interés + Aptitud)');
  const maxOverall = Math.max(...bands.map(b => score.totals.overall[b]), 1);
  y = drawHorizontalBarChart(doc, y,
    bands.map((b, i) => ({ label: `${b} — ${BAND_LABELS[b]}`, value: score.totals.overall[b], color: CHART_PALETTE[i % CHART_PALETTE.length], labelText: `${score.totals.overall[b]}/${maxOverall}` })),
    maxOverall,
    { labelWidth: 50, barMaxWidth: 110, barH: 5.5, rowGap: 2.5 }
  );

  // Ranking section (starts on page 2, no extra header)
  doc.addPage();
  y = 20;
  y = drawSectionHeading(doc, y, 'Ranking por Escala');

  const top = (arr: Array<{ band: Band; value: number }>, k = 3) =>
    arr.slice(0, k).map((x, i) => `${i + 1}. ${BAND_LABELS[x.band]} (${x.value})`).join('   ');

  const rows = [
    ['Interés', top(score.ranking.interest)],
    ['Aptitud', top(score.ranking.aptitude)],
    ['General', top(score.ranking.overall)],
  ];
  autoTable(doc, {
    startY: y,
    body: rows,
    styles: { fontSize: PDF_FONT_SIZE, cellPadding: 3, font: 'helvetica' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: PDF_COLORS.accentGreen, cellWidth: 24 },
      1: { textColor: PDF_COLORS.bodyText },
    },
    theme: 'plain',
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Quick note
  const firstI = score.ranking.interest[0];
  const firstA = score.ranking.aptitude[0];
  const quickNote = firstI && firstA
    ? `Mayor interés en ${BAND_LABELS[firstI.band]} y mayor aptitud en ${BAND_LABELS[firstA.band]}.`
    : 'No hay suficientes datos para interpretar.';

  doc.setFillColor(...PDF_COLORS.lightBg as [number,number,number]);
  doc.setDrawColor(...PDF_COLORS.accentAmber as [number,number,number]);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, 182, 12, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.accentAmber as [number,number,number]);
  doc.text('Nota: ', 18, y + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.bodyText as [number,number,number]);
  doc.text(quickNote, 30, y + 7.5);

  drawFooter(doc);
  doc.save(`CHASIDE_${score.client.name ?? clientId}.pdf`);
}
