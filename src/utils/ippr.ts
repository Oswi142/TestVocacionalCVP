import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SectionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

type SectionScore = Record<SectionId, number>;

const SECTION_LABELS: Record<SectionId, string> = {
  1: 'Ciencias naturales y medio ambiente',
  2: 'Ingeniería y arquitectura',
  3: 'Ciencias de la salud',
  4: 'Humanidades y ciencias sociales',
  5: 'Derecho, criminología y RR. LL./RR. HH.',
  6: 'Comunicación, publicidad y audiovisuales',
  7: 'Educación y pedagogía',
  8: 'Administración, economía y negocios',
  9: 'Informática y telemática/multimedia',
  10: 'Agropecuaria y recursos naturales',
  11: 'Diseño, artes plásticas y restauración',
  12: 'Artes escénicas y música',
  13: 'Seguridad y defensa',
  14: 'Actividad física y deporte',
  15: 'Turismo, hostelería y ocio',
};

export function mapIpprAnswerTextToScore(txt: string | null | undefined): number {
  if (!txt) return 0;
  const t = txt.trim().toLowerCase();
  if (t === 'no conozco la actividad o profesión') return 0;
  if (t === 'no me gusta') return 1;
  if (t === 'me es indiferente o tengo dudas') return 2;
  if (t === 'me gusta') return 3;
  return 0;
}

type IpprResult = {
  clientId: number;
  testId: number;
  client: import('./pdfUtils').ClientPdfData;
  sectionScores: SectionScore;
  totalAnswered: number;
  totalScore: number;
  ranking: Array<{ section: SectionId; label: string; value: number }>;
};

async function getIpprTestId(): Promise<number> {
  const { data, error } = await supabase
    .from('tests')
    .select('id, testname')
    .ilike('testname', '%ipp%')
    .maybeSingle();

  if (error || !data) {
    throw new Error('No se encontró el test IPP-R en la tabla "tests".');
  }
  return data.id;
}

export async function computeIpprScore(clientId: number, attemptId: string = 'active'): Promise<IpprResult> {
  const testId = await getIpprTestId();

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
    .select('id, section')
    .eq('testid', testId)
    .range(0, 999999);
  if (qErr) throw qErr;

  const qToSection = new Map<number, SectionId>();
  (qrows || []).forEach((q) => {
    const s = Number(q.section) as SectionId;
    if (s >= 1 && s <= 15) qToSection.set(q.id, s);
  });

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
    const { data: opts, error: oErr } = await supabase
      .from('answeroptions')
      .select('id, answer')
      .in('id', answerIds)
      .range(0, 999999);
    if (oErr) throw oErr;
    idToText = new Map((opts || []).map((o) => [o.id, String(o.answer || '')]));
  }

  const { sectionScores, totalAnswered, totalScore, ranking } = calculateIpprResultSummary(
    filteredArows,
    qToSection,
    idToText
  );

  return {
    clientId,
    testId,
    client: clientData,
    sectionScores,
    totalAnswered,
    totalScore,
    ranking,
  };
}

export function calculateIpprResultSummary(
  filteredArows: Array<{ questionid: number; answerid?: number | null; details?: string | null }>,
  qToSection: Map<number, SectionId>,
  idToText: Map<number, string>
) {
  const sectionScores: SectionScore = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0,
  };

  let totalAnswered = 0;

  for (const r of filteredArows) {
    const sec = qToSection.get(r.questionid);
    if (!sec) continue;

    const txt = r.answerid ? idToText.get(r.answerid) : r.details;
    const score = mapIpprAnswerTextToScore(txt);
    sectionScores[sec] += score;
    totalAnswered++;
  }

  const totalScore = Object.values(sectionScores).reduce((a, b) => a + b, 0);

  const ranking = (Object.keys(sectionScores) as unknown as SectionId[])
    .map((s) => ({ section: s, label: SECTION_LABELS[s], value: sectionScores[s] }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

  return { sectionScores, totalAnswered, totalScore, ranking };
}

export async function downloadIpprReportPDF(clientId: number, attemptId: string = 'active'): Promise<void> {
  const res = await computeIpprScore(clientId, attemptId);
  const { drawPremiumHeader, drawClientCard, drawSectionHeading, drawFooter, PDF_COLORS, PDF_FONT_SIZE } = await import('./pdfUtils');

  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('es-ES');

  // Header
  let y = drawPremiumHeader(doc, 'IPP-R — Informe de Resultados', 'Inventario de Preferencias Profesionales', now);

  // Client info card
  const { buildClientCardFields } = await import('./pdfUtils');
  y = drawClientCard(doc, y, buildClientCardFields(res.client));

  // Scores table
  y = drawSectionHeading(doc, y, 'Puntajes por Campo Profesional');

  const body = (Object.keys(SECTION_LABELS) as unknown as SectionId[]).map((s) => ([
    String(s),
    SECTION_LABELS[s],
    `${res.sectionScores[s]} / 36`,
  ]));

  autoTable(doc, {
    startY: y,
    head: [['#', 'Campo (Sección)', 'Puntaje (0–36)']],
    body,
    styles: { fontSize: PDF_FONT_SIZE, cellPadding: 3, font: 'helvetica' },
    headStyles: { fillColor: PDF_COLORS.accentGreen, textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: PDF_COLORS.bodyText },
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center', cellWidth: 30 } },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Top 5 ranking — always starts on a new page
  doc.addPage();
  y = drawSectionHeading(doc, y - y + 20, 'Ranking de Afinidad (Top 5)');

  const top5 = res.ranking.slice(0, 5);
  const rankingRows = top5.map((r, i) => [
    `${i + 1}°`,
    r.label,
    `${r.value} / 36`,
  ]);

  autoTable(doc, {
    startY: y,
    body: rankingRows,
    styles: { fontSize: PDF_FONT_SIZE, cellPadding: 3, font: 'helvetica' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: PDF_COLORS.accentGreen, cellWidth: 14, halign: 'center' },
      1: { textColor: PDF_COLORS.bodyText },
      2: { textColor: PDF_COLORS.bodyText, halign: 'center', cellWidth: 28 },
    },
    theme: 'plain',
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Bar chart — all 15 sections
  const { drawHorizontalBarChart, CHART_PALETTE } = await import('./pdfUtils');
  y = drawSectionHeading(doc, y, 'Gráfico de Afinidad — Todas las Áreas (0–36)');
  const sortedForChart = [...res.ranking].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  y = drawHorizontalBarChart(doc, y,
    sortedForChart.map((r, i) => ({ label: r.label, value: r.value, color: CHART_PALETTE[i % CHART_PALETTE.length], labelText: `${r.value}/36` })),
    36,
    { labelWidth: 68, barMaxWidth: 90, barH: 5, rowGap: 2 }
  );

  drawFooter(doc);
  doc.save(`IPPR_${res.client.name ?? clientId}.pdf`);
}
