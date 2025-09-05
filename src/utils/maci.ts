import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// === Tipos ===
type RawAnswer = {
  questionid: number;
  answerid: number | null;
  details: string | null;
};

type MaciKeyRow = {
  questionid: number;
  scale: string;
  scalelabel?: string | null;
  keyed: 'T' | 'F';   // 'T' si puntúa con Verdadero, 'F' si puntúa con Falso
  weight: number;     // default 1
};

export type MaciScaleScore = {
  code: string;
  label: string;
  value: number;       // PD (puntuación directa / suma de aciertos)
  maxPossible: number; // máximo sumable para esa escala/sección
};

export type MaciResult = {
  clientId: number;
  testId: number;
  userName: string | null;
  answered: number;
  scales: MaciScaleScore[];
  ranking: MaciScaleScore[];
  fallbackNote?: string; // mensaje cuando se usa conteo por sección
};

// === Resolver testId dinámicamente ===
async function getMaciTestId(): Promise<number> {
  const { data, error } = await supabase
    .from('tests')
    .select('id, testname')
    .ilike('testname', '%maci%')
    .maybeSingle();

  if (error || !data) {
    throw new Error('No se encontró el test MACI en la tabla "tests".');
  }
  return data.id;
}

// En tu BD las opciones son exactamente "Verdadero" y "Falso".
function isTrue(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return t === 'verdadero';
}

export async function computeMaciScore(clientId: number): Promise<MaciResult> {
  const testId = await getMaciTestId();

  // Nombre del usuario
  const { data: urows } = await supabase
    .from('users')
    .select('id,name')
    .eq('id', clientId)
    .limit(1);
  const userName = (urows && urows[0]?.name) || null;

  // Respuestas del usuario (Verdadero/Falso)
  const { data: arows, error: aErr } = await supabase
    .from('testsanswers')
    .select('questionid, answerid, details')
    .eq('clientid', clientId)
    .eq('testid', testId)
    .order('questionid', { ascending: true })
    .range(0, 999999);
  if (aErr) throw aErr;

  // Mapear answerid -> texto
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

  // Respuesta booleana por pregunta
  const isTrueByQ = new Map<number, boolean>();
  let answered = 0;
  for (const r of (arows || []) as RawAnswer[]) {
    const txt = r.answerid ? idToText.get(r.answerid) : r.details;
    isTrueByQ.set(r.questionid, isTrue(txt));
    answered++;
  }

  // Intento 1: usar la llave maci_key (si existe y tiene filas)
  const { data: keyRows, error: kErr } = await supabase
    .from('maci_key')
    .select('questionid, scale, scalelabel, keyed, weight')
    .eq('testid', testId)
    .range(0, 999999);

  // Si hay error accediendo a maci_key o no hay filas, hacemos fallback por sección:
  if (kErr || !keyRows || keyRows.length === 0) {
    // Fallback: contamos "Verdadero" por sección de `questions`
    const { data: qrows, error: qErr } = await supabase
      .from('questions')
      .select('id, section')
      .eq('testid', testId)
      .range(0, 999999);
    if (qErr) throw qErr;

    const sectionMax = new Map<number, number>(); // cuántos ítems hay por sección
    const sectionTrue = new Map<number, number>(); // cuántos "Verdadero" respondió por sección

    for (const q of qrows || []) {
      const sec = Number(q.section) || 0;
      if (!sec) continue;
      sectionMax.set(sec, (sectionMax.get(sec) || 0) + 1);
      const v = isTrueByQ.get(q.id);
      if (v === true) sectionTrue.set(sec, (sectionTrue.get(sec) || 0) + 1);
    }

    const sections = Array.from(sectionMax.keys()).sort((a, b) => a - b);
    const scales: MaciScaleScore[] = sections.map((sec) => ({
      code: `SEC_${sec}`,
      label: `Sección ${sec}`,
      value: sectionTrue.get(sec) || 0,
      maxPossible: sectionMax.get(sec) || 0,
    }));

    const ranking = [...scales].sort((a, b) => b.value - a.value);

    return {
      clientId,
      testId,
      userName,
      answered,
      scales,
      ranking,
      fallbackNote:
        'Sin llave de escalas (maci_key). Tabla basada en conteo de "Verdadero" por sección.',
    };
  }

  // Intento 2 (ideal): maci_key presente -> sumas por escala
  const sumByScale = new Map<string, number>();
  const maxByScale = new Map<string, number>();
  const labelByScale = new Map<string, string>();

  for (const k of (keyRows || []) as MaciKeyRow[]) {
    const ansTrue = isTrueByQ.get(k.questionid);
    if (ansTrue === undefined) continue; // ítem sin respuesta

    const keyedTrue = k.keyed === 'T';
    const weight = Number.isFinite(k.weight) ? k.weight : 1;

    // máximo posible (suma de pesos de la escala)
    maxByScale.set(k.scale, (maxByScale.get(k.scale) || 0) + weight);

    // suma si coincide la clave: 'T' <-> Verdadero, 'F' <-> Falso
    const hit = keyedTrue ? ansTrue === true : ansTrue === false;
    if (hit) sumByScale.set(k.scale, (sumByScale.get(k.scale) || 0) + weight);

    // etiqueta
    if (!labelByScale.has(k.scale)) {
      labelByScale.set(k.scale, (k.scalelabel ?? k.scale).trim());
    }
  }

  const scales: MaciScaleScore[] = Array.from(maxByScale.keys()).map((code) => ({
    code,
    label: labelByScale.get(code) || code,
    value: sumByScale.get(code) || 0,
    maxPossible: maxByScale.get(code) || 0,
  }));

  const ranking = [...scales].sort((a, b) => b.value - a.value);

  return {
    clientId,
    testId,
    userName,
    answered,
    scales,
    ranking,
  };
}

// Helpers para la tabla “tipo Excel”
function tbFromPD(pd: number, max: number): number {
  if (!max) return 0;
  return Math.round((pd / max) * 100); // 0–100
}
function interpretacion(tb: number): string {
  if (tb >= 60) return 'Área principal de preocupación';
  if (tb >= 40) return 'Tema ligeramente problemático';
  return 'Indicador nulo';
}

// === PDF con tabla estilo “Excel” ===
export async function downloadMaciReportPDF(clientId: number): Promise<void> {
  const res = await computeMaciScore(clientId);

  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('es-ES');

  // Encabezado
  doc.setFont('helvetica');
  doc.setFontSize(16);
  doc.text('MACI — Informe de Puntuaciones Brutas', 14, 18);

  doc.setFontSize(11);
  doc.text(`Fecha: ${now}`, 14, 26);
  doc.text(`Cliente: ${res.userName ?? clientId.toString()}`, 14, 33);

  doc.setFontSize(9);
  if (res.fallbackNote) {
    doc.text(res.fallbackNote, 14, 39);
  } else {
    doc.text(
      'Nota: puntajes brutos calculados desde una llave local. No son baremos ni interpretación clínica.',
      14,
      39
    );
  }

  // Cuerpo de tabla “tipo Excel”
  const tableBody = res.scales.map((s) => {
    const pd = s.value;
    const tb = tbFromPD(s.value, s.maxPossible);
    const tbFinal = tb; // placeholder
    const interp = interpretacion(tb);
    return [s.label, pd.toString(), tb.toString(), tbFinal.toString(), interp];
  });

  autoTable(doc, {
    startY: 46,
    head: [['ESCALAS', 'PD', 'TB', 'TB FINAL', 'INTERPRETACIÓN DE LA ESCALA']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 136, 229], textColor: 255 },
    columnStyles: {
      1: { halign: 'center' as const, cellWidth: 22 },
      2: { halign: 'center' as const, cellWidth: 22 },
      3: { halign: 'center' as const, cellWidth: 26 },
      0: { cellWidth: 90 },
    },
    theme: 'grid',
    margin: { left: 12, right: 12 },
  });

  // Fila “PROTOCOLO VÁLIDO”
  const y = (doc as any).lastAutoTable.finalY + 3;
  autoTable(doc, {
    startY: y,
    body: [['PROTOCOLO VÁLIDO']],
    styles: { fontSize: 9, cellPadding: 2 },
    theme: 'plain',
    margin: { left: 12, right: 12 },
    didParseCell: (data) => {
      data.cell.styles.fontStyle = 'bold';
    },
  });

  const filename = `MACI_${res.userName ?? clientId}.pdf`;
  doc.save(filename);
}
