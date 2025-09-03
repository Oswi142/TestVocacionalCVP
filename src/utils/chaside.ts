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

function isYes(text: string | null | undefined): boolean {
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
  userName: string | null;
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

export async function computeChasideScore(clientId: number): Promise<ChasideScore> {
  const testId = await getChasideTestId();

  const { data: urows } = await supabase
    .from('users')
    .select('id,name')
    .eq('id', clientId)
    .limit(1);
  const userName = (urows && urows[0]?.name) || null;

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

  const initBandCounts = (): Record<Band, number> =>
    ({ C: 0, H: 0, A: 0, S: 0, I: 0, D: 0, E: 0 });

  const counts: RawCounts = {
    interest: initBandCounts(),
    aptitude: initBandCounts(),
  };

  let answered = 0;
  let yesCount = 0;

  for (const r of arows || []) {
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
      .sort((x, y) => y.value - x.value);

  const ranking = {
    interest: sortBands(counts.interest),
    aptitude: sortBands(counts.aptitude),
    overall: sortBands(overall),
  };

  return {
    clientId,
    testId,
    userName,
    counts,
    totals: { interest: totalsInterest, aptitude: totalsAptitude, overall },
    ranking,
    answered,
    yesCount,
  };
}

export async function downloadChasideReportPDF(clientId: number): Promise<void> {
  const score = await computeChasideScore(clientId);

  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('es-ES');

  doc.setFont('helvetica');
  doc.setFontSize(16);
  doc.text('CHASIDE — Informe de Resultados', 14, 18);

  doc.setFontSize(11);
  doc.text(`Fecha: ${now}`, 14, 26);
  doc.text(`Cliente: ${score.userName ?? clientId.toString()}`, 14, 33);

  doc.setFontSize(10);
  doc.text('C = Científico',     14, 46);
  doc.text('H = Humanístico',    14, 51);
  doc.text('A = Artístico',      14, 56);
  doc.text('S = Social',         14, 61);
  doc.text('I = Investigativo',  14, 66);
  doc.text('D = Directivo',      14, 71);
  doc.text('E = Emprendedor',    14, 76);

  const bands: Band[] = ['C', 'H', 'A', 'S', 'I', 'D', 'E'];
  const interestRow = ['Interés', ...bands.map((b) => String(score.counts.interest[b]))];
  const aptitudeRow = ['Aptitud', ...bands.map((b) => String(score.counts.aptitude[b]))];
  const overallRow  = ['Total (I+A)', ...bands.map((b) => String(score.totals.overall[b]))];

  autoTable(doc, {
    startY: 84,
    head: [['Escala', ...bands]],
    body: [interestRow, aptitudeRow, overallRow],
    styles: { fontSize: 10, cellPadding: 2, halign: 'center' as const },
    headStyles: { fillColor: [30, 136, 229], textColor: 255 },
    theme: 'grid',
    margin: { left: 12, right: 12 },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;

  doc.setFontSize(12);
  doc.text('Ranking por escala', 14, y); y += 6;

  const top = (arr: Array<{ band: Band; value: number }>, k = 3) =>
    arr
      .slice(0, k)
      .map((x) => `${BAND_LABELS[x.band]} (${x.value})`)
      .join(', ');

  doc.setFontSize(10);
  doc.text(`• Interés: ${top(score.ranking.interest)}`, 14, y); y += 5;
  doc.text(`• Aptitud: ${top(score.ranking.aptitude)}`, 14, y); y += 5;
  doc.text(`• General: ${top(score.ranking.overall)}`, 14, y); y += 8;

  const firstI = score.ranking.interest[0];
  const firstA = score.ranking.aptitude[0];

  const quickNote =
    firstI && firstA
      ? `Mayor interés en ${BAND_LABELS[firstI.band]} y mayor aptitud en ${BAND_LABELS[firstA.band]}.`
      : 'No hay suficientes datos para interpretar.';

  doc.setFontSize(11);
  doc.text('Nota rápida:', 14, y); y += 6;
  doc.setFontSize(10);
  doc.text(quickNote, 14, y);

  const filename = `CHASIDE_${score.userName ?? clientId}.pdf`;
  doc.save(filename);
}
