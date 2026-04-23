import { supabase } from '@/infrastructure/config/supabaseClient';
import * as XLSX from 'xlsx';
import { HyperFormula } from 'hyperformula';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawPremiumHeader,
  drawClientCard,
  drawSectionHeading,
  drawFooter,
  PDF_COLORS,
  buildClientCardFields
} from '@/infrastructure/utils/pdfUtils';

// ─── Answer cell map: question number (1-160) → [sheetRow (0-indexed), col (0-indexed)] in DATOS Y RESPUESTAS ───
// Layout: Q1-25 → col C (2), Q26-50 → col E (4), Q51-75 → col G (6), Q76-100 → col I (8),
//         Q101-125 → col K (10), Q126-150 → col M (12), Q151-160 → col O (14)
// Rows start at row 14 (index 13) for Q1, decreasing every 25

function getAnswerCell(qNum: number): { col: number; row: number } {
  const colMap = [2, 4, 6, 8, 10, 12, 14]; // C, E, G, I, K, M, O (0-indexed)
  const group = Math.floor((qNum - 1) / 25);     // 0..6
  const offset = (qNum - 1) % 25;                 // 0..24
  return { col: colMap[group], row: 13 + offset }; // row 13 = Excel row 14
}

// ─── RESULTADOS cell positions ───────────────────────────────────────────────
// From our analysis: scale data is in RESULTADOS, columns I (label), N (PD), O (TB), rows 70-99
// Row 70 = X-Transparencia ... row 99 = GG
const RESULTS_SHEET = 'RESULTADOS';
const SCALES = [
  { key: 'X',  label: 'X-Transparencia',                    row: 69 },
  { key: 'Y',  label: 'Y-Deseabilidad',                     row: 70 },
  { key: 'Z',  label: 'Z-Alteración',                       row: 71 },
  { key: '1',  label: '1-Introvertido',                     row: 72 },
  { key: '2A', label: '2A-Inhibido',                        row: 73 },
  { key: '2B', label: '2B-Pesimista',                       row: 74 },
  { key: '3',  label: '3-Sumiso',                           row: 75 },
  { key: '4',  label: '4-Histriónico',                      row: 76 },
  { key: '5',  label: '5-Egocéntrico',                      row: 77 },
  { key: '6A', label: '6A-Rebelde',                         row: 78 },
  { key: '6B', label: '6B-Rudo',                            row: 79 },
  { key: '7',  label: '7-Conformista',                      row: 80 },
  { key: '8A', label: '8A-Oposicionista',                   row: 81 },
  { key: '8B', label: '8B-Autopunitivo',                    row: 82 },
  { key: '9',  label: '9-Tendencia Límite',                 row: 83 },
  { key: 'A',  label: 'A-Difusión de la Identidad',         row: 84 },
  { key: 'B',  label: 'B-Desvalorización de sí mismo.',     row: 85 },
  { key: 'C',  label: 'C-Desagrado por propio cuerpo',      row: 86 },
  { key: 'D',  label: 'D-Incomodidad respecto al sexo',     row: 87 },
  { key: 'E',  label: 'E-Inseguridad con los iguales',      row: 88 },
  { key: 'F',  label: 'F-Insensibiidad social',             row: 89 },
  { key: 'G',  label: 'G-Discordancia Familiar',            row: 90 },
  { key: 'H',  label: 'H-Abusos en la infancia',            row: 91 },
  { key: 'AA', label: 'AA-Trastornos de la Alimentación',   row: 92 },
  { key: 'BB', label: 'BB-Inclinación abuso sustancias',    row: 93 },
  { key: 'CC', label: 'CC-Predisposición a la delincuencia',row: 94 },
  { key: 'DD', label: 'DD-Propensión a la impulsividad',    row: 95 },
  { key: 'EE', label: 'EE-Sentimientos de ansiedad',        row: 96 },
  { key: 'FF', label: 'FF-Afecto depresivo',                row: 97 },
  { key: 'GG', label: 'GG-Tendencia al suicidio',           row: 98 },
];

// Column N = index 13 (PD), Column O = index 14 (TB)
const PD_COL = 13;
const TB_COL = 14;

// ─── Client info cell positions in DATOS Y RESPUESTAS ───────────────────────
// B4=Nombre, B5=Apellidos, B6=Sexo, B7=Edad, B8=Institución
const INFO_SHEET = 'DATOS Y RESPUESTAS';
const INFO_CELLS = {
  nombre:  { r: 3, c: 1 },
  apellido:{ r: 4, c: 1 },
  sexo:    { r: 5, c: 1 },
  edad:    { r: 6, c: 1 },
  inst:    { r: 7, c: 1 },
};

export interface MaciExcelResult {
  client: any;
  rawScores: Record<string, number>;
  baseRates: Record<string, number>;
  finalRates: Record<string, number>;
  validity: { protocoloValido: boolean; transparencia: number; deseabilidad: number; alteracion: number; warnings: string[] };
}

function isYes(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return t === 'sí' || t === 'si' || t === 'v' || t === 'verdadero';
}

export async function computeMaciWithExcel(clientId: number, attemptId: string = 'active'): Promise<MaciExcelResult> {
  // ── 1. Fetch patient info ────────────────────────────────────────────────
  const { data: urow } = await supabase.from('users').select('*').eq('id', clientId).single();
  const { data: ci }   = await supabase.from('clientsinfo').select('*').eq('userid', clientId).single();

  const client = {
    name: urow?.name, firstlastname: urow?.firstlastname, secondlastname: urow?.secondlastname,
    school: ci?.school, grade: ci?.grade, birthday: ci?.birthday, gender: ci?.gender
  };

  const age    = ci?.birthday ? (new Date().getFullYear() - new Date(ci.birthday).getFullYear()) : 15;
  const gender = (ci?.gender || 'MASCULINO').toUpperCase();

  // ── 2. Fetch MACI answers ────────────────────────────────────────────────
  const { data: tData } = await supabase.from('tests').select('id').ilike('testname', '%maci%').maybeSingle();
  if (!tData) throw new Error('MACI test not found');
  const testId = tData.id;

  const { data: arows } = await supabase
    .from('testsanswers')
    .select('questionid, answerid, details')
    .eq('clientid', clientId)
    .eq('testid', testId);

  const filteredArows = (arows || []).filter((r: any) => {
    const d = r.details || '';
    if (attemptId === 'active') return !d.startsWith('[HIST_');
    return d.startsWith(attemptId);
  });

  // Build question number map
  const { data: qList } = await supabase
    .from('questions')
    .select('id, questionnumber')
    .eq('testid', testId)
    .order('id', { ascending: true });

  const qIdToNum = new Map<number, number>();
  if (qList && qList.length > 0) {
    qList.forEach((q: any, idx: number) => {
      const parsed = parseInt(String(q.questionnumber || '').replace(/\D/g, ''));
      qIdToNum.set(q.id, isNaN(parsed) || parsed === 0 ? idx + 1 : parsed);
    });
  } else {
    const sorted = [...filteredArows].sort((a: any, b: any) => a.questionid - b.questionid);
    sorted.forEach((r: any, idx: number) => qIdToNum.set(r.questionid, idx + 1));
  }

  const ansIds = filteredArows.map((a: any) => a.answerid).filter(Boolean);
  const { data: opts } = await supabase.from('answeroptions').select('id, answer').in('id', ansIds);
  const optMap = new Map(opts?.map(o => [o.id, o.answer]) || []);

  // Map: qNum → V/F boolean
  const answersMap = new Map<number, boolean>();
  filteredArows.forEach((r: any) => {
    const qNum = qIdToNum.get(r.questionid) || 0;
    if (qNum >= 1 && qNum <= 160) {
      const text = r.answerid ? optMap.get(r.answerid) : r.details;
      answersMap.set(qNum, isYes(text));
    }
  });

  // ── 3. Load Excel template as ArrayBuffer ────────────────────────────────
  const resp = await fetch('/maci_engine.xlsx');
  const arrayBuf = await resp.arrayBuffer();
  const workbook = XLSX.read(arrayBuf, { type: 'array', cellFormula: true, cellNF: true });

  // ── 4. Inject patient info ───────────────────────────────────────────────
  const infoSheet = workbook.Sheets[INFO_SHEET];
  const nombre = [urow?.name, urow?.firstlastname, urow?.secondlastname].filter(Boolean).join(' ');
  infoSheet[XLSX.utils.encode_cell(INFO_CELLS.nombre)]   = { t: 's', v: nombre };
  infoSheet[XLSX.utils.encode_cell(INFO_CELLS.sexo)]     = { t: 's', v: gender };
  infoSheet[XLSX.utils.encode_cell(INFO_CELLS.edad)]     = { t: 'n', v: age };
  if (ci?.school) infoSheet[XLSX.utils.encode_cell(INFO_CELLS.inst)] = { t: 's', v: ci.school };

  // ── 5. Inject answers (V or F strings) ──────────────────────────────────
  for (let qNum = 1; qNum <= 160; qNum++) {
    const ans = answersMap.get(qNum);
    const { col, row } = getAnswerCell(qNum);
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    const val = ans === true ? 'V' : 'F';
    infoSheet[addr] = { t: 's', v: val };
  }

  // ── 6. Build HyperFormula with formulas preserved ─────────────────────
  const sheetNames = workbook.SheetNames;
  const hfData: Record<string, (string | number | boolean | null)[][]> = {};

  for (const sName of sheetNames) {
    const ws = workbook.Sheets[sName];
    const wsRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const rows: (string | number | boolean | null)[][] = [];

    for (let r = 0; r <= wsRange.e.r; r++) {
      const rowArr: (string | number | boolean | null)[] = [];
      for (let c = 0; c <= wsRange.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) { rowArr.push(null); }
        else if (cell.f) { 
          // Reemplazo del LOOKUP(3 args) y LOOKUP(2 args) por INDEX(MATCH(..)) para soportarlo nativamente
          let f = cell.f;
          f = f.replace(/LOOKUP\(([^,]+),([^,]+),([^)]+)\)/g, 'INDEX($3, MATCH($1, $2, 1))');
          f = f.replace(/LOOKUP\(([^,]+), *([A-Z]+)(\d+) *: *([A-Z]+)(\d+)\)/g, (_match: string, val: string, col1: string, row1: string, col2: string, row2: string) => {
            return `INDEX(${col2}${row1}:${col2}${row2}, MATCH(${val}, ${col1}${row1}:${col1}${row2}, 1))`;
          });
          rowArr.push('=' + f); 
        }
        else { rowArr.push(cell.v !== undefined ? cell.v : null); }
      }
      rows.push(rowArr);
    }
    hfData[sName] = rows;
  }

  // ── 7. Run HyperFormula ──────────────────────────────────────────────────
  const hf = HyperFormula.buildFromSheets(hfData, { licenseKey: 'gpl-v3' });

  // After building, update the answer cells with real V/F values
  const infoSheetIdx = sheetNames.indexOf(INFO_SHEET);
  for (let qNum = 1; qNum <= 160; qNum++) {
    const ans = answersMap.get(qNum);
    const { col, row } = getAnswerCell(qNum);
    hf.setCellContents({ sheet: infoSheetIdx, row, col }, [[ans === true ? 'V' : 'F']]);
  }

  // ── 8. Read computed results ─────────────────────────────────────────────
  const rawScores: Record<string, number> = {};
  const baseRates: Record<string, number> = {};
  const finalRates: Record<string, number> = {};
  const resultsSheetIdx = sheetNames.indexOf(RESULTS_SHEET);

  const TB_FINAL_COL = 46; // AU

  for (const scale of SCALES) {
    const pd = hf.getCellValue({ sheet: resultsSheetIdx, row: scale.row, col: PD_COL });
    const tb = hf.getCellValue({ sheet: resultsSheetIdx, row: scale.row, col: TB_COL });
    const tbFinal = hf.getCellValue({ sheet: resultsSheetIdx, row: scale.row, col: TB_FINAL_COL });
    
    rawScores[scale.key] = typeof pd === 'number' ? Math.round(pd) : parseFloat(String(pd)) || 0;
    baseRates[scale.key] = typeof tb === 'number' ? Math.round(tb) : parseFloat(String(tb)) || 0;
    finalRates[scale.key] = typeof tbFinal === 'number' ? Math.round(tbFinal) : parseFloat(String(tbFinal)) || 0;
  }

  hf.destroy();

  // ── 9. Validity ──────────────────────────────────────────────────────────
  const transparencia = rawScores['X'] || 0;
  const deseabilidad  = rawScores['Y'] || 0;
  const alteracion    = rawScores['Z'] || 0;
  const warnings: string[] = [];
  if (transparencia < 150) warnings.push('Baja transparencia en las respuestas');
  if (deseabilidad > 20)   warnings.push('Alta deseabilidad social');
  if (alteracion > 15)     warnings.push('Posible exageración o distorsión de síntomas');
  const protocoloValido = warnings.length === 0;

  return { client, rawScores, baseRates, finalRates, validity: { protocoloValido, transparencia, deseabilidad, alteracion, warnings } };
}

// ─── Interpretation helpers ───────────────────────────────────────────────────
const VALIDITY_KEYS = new Set(['X', 'Y', 'Z']);

const getInterp = (key: string, br: number): string => {
  if (VALIDITY_KEYS.has(key)) return '';
  if (br >= 85) return 'Área principal de preocupación';
  if (br >= 75) return 'Área problemática';
  if (br >= 60) return 'Tema ligeramente problemático';
  return 'Indicador nulo';
};

// ─── Profile chart drawing helper ───────────────────────────────────────────
function drawProfileChart(
  doc: any,
  title: string,
  scales: { label: string; key: string }[],
  finalRates: Record<string, number>,
  startY: number
): number {
  const pageH      = doc.internal.pageSize.getHeight();
  const pageW      = doc.internal.pageSize.getWidth();
  const marginL    = 14;
  const marginR    = 14;
  const labelW     = 52;                           // width for scale label column
  const chartX     = marginL + labelW;             // where bars start
  const chartW     = pageW - marginL - marginR - labelW; // full bar area width
  const maxVal     = 115;                          // max TB FINAL to display
  const barH       = 7;                            // height of each bar
  const rowH       = barH + 3;                     // spacing per row
  const headerH    = 14;
  const totalH     = headerH + scales.length * rowH + 10;

  // New page if doesn't fit
  if (startY + totalH > pageH - 20) {
    doc.addPage();
    startY = 20;
  }

  const accentR = PDF_COLORS.accentGreen[0];
  const accentG = PDF_COLORS.accentGreen[1];
  const accentB = PDF_COLORS.accentGreen[2];

  // ── Section title ──
  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(marginL, startY, pageW - marginL - marginR, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text(title, marginL + 3, startY + 5.5);
  doc.setFont(undefined, 'normal');
  let y = startY + 10;

  // ── Column header ticks (0, 30, 60, 75, 85, 100, 115) ──
  const ticks = [0, 30, 60, 75, 85, 100, 115];
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(6.5);
  for (const tick of ticks) {
    const tx = chartX + (tick / maxVal) * chartW;
    doc.text(String(tick), tx, y, { align: 'center' });
  }
  y += 3;

  // ── Rows ──
  for (let i = 0; i < scales.length; i++) {
    const s   = scales[i];
    const val = Math.min(finalRates[s.key] ?? 0, maxVal);
    const bw  = (val / maxVal) * chartW;
    const ry  = y + (rowH - barH) / 2;

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(246, 248, 246);
      doc.rect(marginL, y, pageW - marginL - marginR, rowH, 'F');
    }

    // Label
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(7.5);
    doc.text(s.label, marginL + 1, ry + barH * 0.65);

    // Background track
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(chartX, ry, chartW, barH, 1.5, 1.5, 'F');

    // Zone tint: 60-75 yellow, 75-85 orange, 85+ red
    const zone60x = chartX + (60 / maxVal) * chartW;
    const zone75x = chartX + (75 / maxVal) * chartW;
    const zone85x = chartX + (85 / maxVal) * chartW;

    // Light tint zones (full width, subtle)
    doc.setFillColor(255, 243, 205); // yellow zone 60–75
    doc.rect(zone60x, ry, zone75x - zone60x, barH, 'F');
    doc.setFillColor(255, 218, 185); // orange zone 75–85
    doc.rect(zone75x, ry, zone85x - zone75x, barH, 'F');
    doc.setFillColor(255, 200, 200); // red zone 85+
    doc.rect(zone85x, ry, chartX + chartW - zone85x, barH, 'F');

    // Actual bar — color by value
    let barR = accentR, barG = accentG, barB = accentB;
    if (val >= 85) { barR = 220; barG = 53;  barB = 53; }
    else if (val >= 75) { barR = 230; barG = 130; barB = 30; }
    else if (val >= 60) { barR = 200; barG = 170; barB = 20; }
    doc.setFillColor(barR, barG, barB);
    if (bw > 0) doc.roundedRect(chartX, ry, bw, barH, 1.5, 1.5, 'F');

    // Value label inside/outside bar
    doc.setTextColor(val >= 20 ? 255 : 60, val >= 20 ? 255 : 60, val >= 20 ? 255 : 60);
    doc.setFontSize(6.5);
    if (val > 10) {
      doc.text(String(val), chartX + bw - 2, ry + barH * 0.7, { align: 'right' });
    } else {
      doc.setTextColor(80, 80, 80);
      doc.text(String(val), chartX + bw + 2, ry + barH * 0.7);
    }

    // Threshold lines at 60, 75, 85
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    for (const threshold of [60, 75, 85]) {
      const lx = chartX + (threshold / maxVal) * chartW;
      doc.setLineDash([1, 1], 0);
      doc.line(lx, ry, lx, ry + barH);
    }
    doc.setLineDash([], 0);

    y += rowH;
  }

  return y + 6;
}

export async function downloadMaciReportPDF(clientId: number, attemptId: string = 'active'): Promise<void> {
  const score = await computeMaciWithExcel(clientId, attemptId);
  const doc = new jsPDF() as any;
  const now = new Date().toLocaleDateString('es-ES');

  let y = drawPremiumHeader(doc, 'MACI — Informe de Resultados', 'Inventario Clínico de Millon para Adolescentes', now);
  y = drawClientCard(doc, y, buildClientCardFields(score.client));
  
  y = drawSectionHeading(doc, y, 'Resultados por Escala');

  autoTable(doc, {
    startY: y + 2,
    head: [['Escalas', 'PD', 'TB', 'TB FINAL', 'Interpretacion de la Escala']],
    body: SCALES.map(s => [
      s.label, 
      score.rawScores[s.key] ?? 0, 
      score.baseRates[s.key] ?? 0, 
      score.finalRates[s.key] ?? 0,
      getInterp(s.key, score.finalRates[s.key] ?? 0)
    ]),
    styles: { fontSize: 8.5, cellPadding: 1.5 },
    headStyles: { fillColor: PDF_COLORS.accentGreen, textColor: 255 },
    theme: 'grid', margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 4 && ['X', 'Y', 'Z'].includes(SCALES[data.row.index].key)) {
        data.cell.styles.fillColor = [210, 210, 210];
      }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Perfil I: Prototipos de Personalidad (escalas 1–9) ──
  const perfilI = SCALES.filter(s => ['1','2A','2B','3','4','5','6A','6B','7','8A','8B','9'].includes(s.key));
  y = drawProfileChart(doc, 'Perfil I — Prototipos de Personalidad', perfilI, score.finalRates, y);

  // ── Perfil II: Preocupaciones Expresadas (escalas A–H) ──
  const perfilII = SCALES.filter(s => ['A','B','C','D','E','F','G','H'].includes(s.key));
  y = drawProfileChart(doc, 'Perfil II — Preocupaciones Expresadas', perfilII, score.finalRates, y);

  // ── Perfil III: Síndromes Clínicos (escalas AA–GG) ──
  const perfilIII = SCALES.filter(s => ['AA','BB','CC','DD','EE','FF','GG'].includes(s.key));
  y = drawProfileChart(doc, 'Perfil III — Síndromes Clínicos', perfilIII, score.finalRates, y);

  // ── Reporte condensado (formato Excel) ──────────────────────────────────────
  doc.addPage();
  let yc = drawPremiumHeader(doc, 'MACI — Reporte de Interpretación', 'Inventario Clínico de Millon para Adolescentes', now);
  yc = drawSectionHeading(doc, yc, 'Perfil por Escalas');

  // Helper to get row color by interpretation
  const interpColor = (key: string, tb: number): [number,number,number] | null => {
    if (VALIDITY_KEYS.has(key)) return null;
    if (tb >= 85) return [255, 220, 220];
    if (tb >= 75) return [255, 234, 205];
    if (tb >= 60) return [255, 250, 210];
    return null;
  };

  // Build rows for Perfil I
  const p1Rows = perfilI.map(s => {
    const tb = score.finalRates[s.key] ?? 0;
    return [s.label, tb, getInterp(s.key, tb)];
  });

  // Build rows for Perfil II + III combined
  const p23Rows = [...perfilII, ...perfilIII].map(s => {
    const tb = score.finalRates[s.key] ?? 0;
    return [s.label, tb, getInterp(s.key, tb)];
  });

  const allP1Scales  = perfilI;
  const allP23Scales = [...perfilII, ...perfilIII];

  // Table 1 — Perfil I
  autoTable(doc, {
    startY: yc + 2,
    head: [['ESCALAS', 'TB', 'INTERPRETACIÓN']],
    body: p1Rows,
    columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 18, halign: 'center' }, 2: { cellWidth: 'auto' } },
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: PDF_COLORS.accentGreen, textColor: 255, fontStyle: 'bold' },
    theme: 'grid', margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const scale = allP1Scales[data.row.index];
        if (scale) {
          const color = interpColor(scale.key, score.finalRates[scale.key] ?? 0);
          if (color) data.cell.styles.fillColor = color;
        }
      }
    }
  });

  yc = (doc as any).lastAutoTable.finalY + 4;

  // Table 2 — Perfil II + III (with its own header)
  autoTable(doc, {
    startY: yc,
    head: [['ESCALAS', 'TB', 'INTERPRETACIÓN']],
    body: p23Rows,
    columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 18, halign: 'center' }, 2: { cellWidth: 'auto' } },
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [80, 120, 160], textColor: 255, fontStyle: 'bold' },
    theme: 'grid', margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const scale = allP23Scales[data.row.index];
        if (scale) {
          const color = interpColor(scale.key, score.finalRates[scale.key] ?? 0);
          if (color) data.cell.styles.fillColor = color;
        }
      }
    }
  });

  drawFooter(doc);
  doc.save(`MACI_Reporte_${score.client.name || 'Cliente'}.pdf`);
}


