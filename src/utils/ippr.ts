import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SectionId = 1|2|3|4|5|6|7|8|9|10|11|12|13|14|15;

type SectionScore = Record<SectionId, number>;

const SECTION_LABELS: Record<SectionId, string> = {
  1:  'Ciencias naturales y medio ambiente',
  2:  'Ingeniería y arquitectura',
  3:  'Ciencias de la salud',
  4:  'Humanidades y ciencias sociales',
  5:  'Derecho, criminología y RR. LL./RR. HH.',
  6:  'Comunicación, publicidad y audiovisuales',
  7:  'Educación y pedagogía',
  8:  'Administración, economía y negocios',
  9:  'Informática y telemática/multimedia',
  10: 'Agropecuaria y recursos naturales',
  11: 'Diseño, artes plásticas y restauración',
  12: 'Artes escénicas y música',
  13: 'Seguridad y defensa',
  14: 'Actividad física y deporte',
  15: 'Turismo, hostelería y ocio',
};

function mapIpprAnswerTextToScore(txt: string | null | undefined): number {
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
  userName: string | null;
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

export async function computeIpprScore(clientId: number): Promise<IpprResult> {
  const testId = await getIpprTestId();

  const { data: urows } = await supabase
    .from('users')
    .select('id,name')
    .eq('id', clientId)
    .limit(1);
  const userName = (urows && urows[0]?.name) || null;

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

  const sectionScores: SectionScore = {
    1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0,
  };

  let totalAnswered = 0;

  for (const r of arows || []) {
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
    .sort((a, b) => b.value - a.value);

  return {
    clientId,
    testId,
    userName,
    sectionScores,
    totalAnswered,
    totalScore,
    ranking,
  };
}

export async function downloadIpprReportPDF(clientId: number): Promise<void> {
  const res = await computeIpprScore(clientId);

  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('es-ES');

  doc.setFont('helvetica');
  doc.setFontSize(16);
  doc.text('IPP-R — Informe de Resultados', 14, 18);

  doc.setFontSize(11);
  doc.text(`Fecha: ${now}`, 14, 26);
  doc.text(`Cliente: ${res.userName ?? clientId.toString()}`, 14, 33);

  const body = (Object.keys(SECTION_LABELS) as unknown as SectionId[]).map((s) => ([
    String(s),
    SECTION_LABELS[s],
    `${res.sectionScores[s]} / 36`,
  ]));

  autoTable(doc, {
    startY: 42,
    head: [['#', 'Campo (sección)', 'Puntaje (0–36)']],
    body,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [30,136,229], textColor: 255 },
    columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center' } },
    theme: 'grid',
    margin: { left: 12, right: 12 },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;

  doc.setFontSize(12);
  doc.text('Ranking de afinidad (Top 5)', 14, y); y += 6;
  doc.setFontSize(10);

  const top5 = res.ranking.slice(0, 5);
  top5.forEach((r, i) => {
    doc.text(`${i+1}) ${r.label} — ${r.value}/36`, 14, y);
    y += 5;
  });

  const filename = `IPPR_${res.userName ?? clientId}.pdf`;
  doc.save(filename);
}
