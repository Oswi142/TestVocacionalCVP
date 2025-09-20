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

// === Cálculo de puntajes (PD por escala) ================================
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

  // Si no existe llave, fallback por sección (suma "Verdadero" por sección)
  if (kErr || !keyRows || keyRows.length === 0) {
    const { data: qrows, error: qErr } = await supabase
      .from('questions')
      .select('id, section')
      .eq('testid', testId)
      .range(0, 999999);
    if (qErr) throw qErr;

    const sectionMax = new Map<number, number>();
    const sectionTrue = new Map<number, number>();

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

  // maci_key presente -> PD por escala
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

    // suma si coincide la clave
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

// === Transformación TB ilustrativa e interpretación =======================
function tbFromPD(pd: number, max: number): number {
  if (!max) return 0;
  return Math.round((pd / max) * 100); // 0–100 (place-holder)
}

function interpretacion(tb: number): string {
  // Ajusta los cortes si quieres replicar literal tu planilla:
  if (tb >= 85) return 'Área principal de preocupación';
  if (tb >= 75) return 'Área problemática';
  if (tb >= 60) return 'Tema ligeramente problemático';
  return 'Indicador nulo';
}

// === PDF: SOLO TABLA como en tu imagen ===================================
export async function downloadMaciReportPDF(clientId: number): Promise<void> {
  const res = await computeMaciScore(clientId);

  // Orden exacto del cuadro mostrado (primero 1–9, luego A–GG)
  const block1 = ['1','2A','2B','3','4','5','6A','6B','7','8A','8B','9'];
  const block2 = ['A','B','C','D','E','F','G','H','AA','BB','CC','DD','EE','FF','GG'];

  // Indexar por código
  const byCode = new Map(res.scales.map(s => [s.code.toUpperCase(), s]));

  const rowsForBlock = (codes: string[]) =>
    codes
      .map(code => byCode.get(code.toUpperCase()))
      .filter((s): s is typeof res.scales[number] => !!s)
      .map(s => {
        const tb = tbFromPD(s.value, s.maxPossible);
        const inter = interpretacion(tb);
        // SOLO TB + INTERPRETACIÓN (como tu ejemplo)
        return [s.label, tb.toString(), inter];
      });

  // Construcción del cuerpo
  const body: any[] = [];
  body.push(...rowsForBlock(block1));
  // separador intermedio “ESCALAS”
  body.push([{ content: 'ESCALAS', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } }]);
  body.push(...rowsForBlock(block2));

  // === PDF ===
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const now = new Date().toLocaleDateString('es-ES');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('INVENTARIO CLÍNICO PARA ADOLESCENTES DE MILLON (MACI)', 40, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Fecha: ${now}`, 40, 64);
  doc.text(`Cliente: ${res.userName ?? String(res.clientId)}`, 40, 78);

  if (res.fallbackNote) {
    doc.setTextColor(180, 0, 0);
    doc.text(res.fallbackNote, 40, 94, { maxWidth: 515 });
    doc.setTextColor(0, 0, 0);
  } else {
    doc.text(
      'TB mostrado es una transformación lineal ilustrativa (no baremos oficiales).',
      40,
      94,
      { maxWidth: 515 }
    );
  }

  autoTable(doc, {
    startY: 112,
    head: [['ESCALAS', 'TB', 'INTERPRETACIÓN']],
    body,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [224, 224, 224], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 260 },
      1: { halign: 'center', cellWidth: 60 },
      2: { cellWidth: 220 },
    },
    margin: { left: 40, right: 40 },
    didParseCell: (data) => {
      const raw: any = data.cell.raw;
      if (raw && typeof raw === 'object' && raw.content === 'ESCALAS') {
        data.cell.styles.fillColor = [240, 240, 240];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
    },
  });


  const filename = `MACI_TABLA_${res.userName ?? res.clientId}.pdf`;
  doc.save(filename);
}
