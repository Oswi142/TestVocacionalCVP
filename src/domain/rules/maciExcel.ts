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

function getAnswerCell(qNum: number): { col: number; row: number } {
  const colMap = [2, 4, 6, 8, 10, 12, 14];
  const group = Math.floor((qNum - 1) / 25);
  const offset = (qNum - 1) % 25;
  return { col: colMap[group], row: 13 + offset };
}


const RESULTS_SHEET = 'RESULTADOS';
const SCALES = [
  { key: 'X', label: 'X-Transparencia', row: 69 },
  { key: 'Y', label: 'Y-Deseabilidad', row: 70 },
  { key: 'Z', label: 'Z-Alteración', row: 71 },
  { key: '1', label: '1-Introvertido', row: 72 },
  { key: '2A', label: '2A-Inhibido', row: 73 },
  { key: '2B', label: '2B-Pesimista', row: 74 },
  { key: '3', label: '3-Sumiso', row: 75 },
  { key: '4', label: '4-Histriónico', row: 76 },
  { key: '5', label: '5-Egocéntrico', row: 77 },
  { key: '6A', label: '6A-Rebelde', row: 78 },
  { key: '6B', label: '6B-Rudo', row: 79 },
  { key: '7', label: '7-Conformista', row: 80 },
  { key: '8A', label: '8A-Oposicionista', row: 81 },
  { key: '8B', label: '8B-Autopunitivo', row: 82 },
  { key: '9', label: '9-Tendencia Límite', row: 83 },
  { key: 'A', label: 'A-Difusión de la Identidad', row: 84 },
  { key: 'B', label: 'B-Desvalorización de sí mismo.', row: 85 },
  { key: 'C', label: 'C-Desagrado por propio cuerpo', row: 86 },
  { key: 'D', label: 'D-Incomodidad respecto al sexo', row: 87 },
  { key: 'E', label: 'E-Inseguridad con los iguales', row: 88 },
  { key: 'F', label: 'F-Insensibiidad social', row: 89 },
  { key: 'G', label: 'G-Discordancia Familiar', row: 90 },
  { key: 'H', label: 'H-Abusos en la infancia', row: 91 },
  { key: 'AA', label: 'AA-Trastornos de la Alimentación', row: 92 },
  { key: 'BB', label: 'BB-Inclinación abuso sustancias', row: 93 },
  { key: 'CC', label: 'CC-Predisposición a la delincuencia', row: 94 },
  { key: 'DD', label: 'DD-Propensión a la impulsividad', row: 95 },
  { key: 'EE', label: 'EE-Sentimientos de ansiedad', row: 96 },
  { key: 'FF', label: 'FF-Afecto depresivo', row: 97 },
  { key: 'GG', label: 'GG-Tendencia al suicidio', row: 98 },
];

const PD_COL = 13;
const TB_COL = 14;

const INFO_SHEET = 'DATOS Y RESPUESTAS';
const INFO_CELLS = {
  nombre: { r: 3, c: 1 },
  apellido: { r: 4, c: 1 },
  sexo: { r: 5, c: 1 },
  edad: { r: 6, c: 1 },
  inst: { r: 7, c: 1 },
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

export async function computeMaciWithExcel(client_id: number, attemptId: string = 'active'): Promise<MaciExcelResult> {
  const { data: urow } = await supabase.from('users').select('*').eq('id', client_id).single();
  const { data: ci } = await supabase.from('clients_info').select('*').eq('user_id', client_id).single();

  const client = {
    name: urow?.name, first_last_name: urow?.first_last_name, second_last_name: urow?.second_last_name,
    school: ci?.school, grade: ci?.grade, birthday: ci?.birthday, gender: ci?.gender
  };

  const age = ci?.birthday ? (new Date().getFullYear() - new Date(ci.birthday).getFullYear()) : 15;
  const gender = (ci?.gender || 'MASCULINO').toUpperCase();

  const { data: tData } = await supabase.from('tests').select('id').ilike('test_name', '%maci%').maybeSingle();
  if (!tData) throw new Error('MACI test not found');
  const test_id = tData.id;

  const { data: arows } = await supabase
    .from('test_answers')
    .select('question_id, answer_id, details')
    .eq('client_id', client_id)
    .eq('test_id', test_id);

  const filteredArows = (arows || []).filter((r: any) => {
    const d = r.details || '';
    if (attemptId === 'active') return !d.startsWith('[HIST_');
    return d.startsWith(attemptId);
  });

  const { data: qList } = await supabase
    .from('questions')
    .select('id, questionnumber')
    .eq('test_id', test_id)
    .order('id', { ascending: true });

  const qIdToNum = new Map<number, number>();
  if (qList && qList.length > 0) {
    qList.forEach((q: any, idx: number) => {
      const parsed = parseInt(String(q.questionnumber || '').replace(/\D/g, ''));
      qIdToNum.set(q.id, isNaN(parsed) || parsed === 0 ? idx + 1 : parsed);
    });
  } else {
    const sorted = [...filteredArows].sort((a: any, b: any) => a.question_id - b.question_id);
    sorted.forEach((r: any, idx: number) => qIdToNum.set(r.question_id, idx + 1));
  }

  const ansIds = filteredArows.map((a: any) => a.answer_id).filter(Boolean);
  const { data: opts } = await supabase.from('answer_options').select('id, answer').in('id', ansIds);
  const optMap = new Map(opts?.map(o => [o.id, o.answer]) || []);

  const answersMap = new Map<number, boolean>();
  filteredArows.forEach((r: any) => {
    const qNum = qIdToNum.get(r.question_id) || 0;
    if (qNum >= 1 && qNum <= 160) {
      const text = r.answer_id ? optMap.get(r.answer_id) : r.details;
      answersMap.set(qNum, isYes(text));
    }
  });

  const resp = await fetch('/maci_engine.xlsx');
  const arrayBuf = await resp.arrayBuffer();
  const workbook = XLSX.read(arrayBuf, { type: 'array', cellFormula: true, cellNF: true });

  const infoSheet = workbook.Sheets[INFO_SHEET];
  const nombre = [urow?.name, urow?.first_last_name, urow?.second_last_name].filter(Boolean).join(' ');
  infoSheet[XLSX.utils.encode_cell(INFO_CELLS.nombre)] = { t: 's', v: nombre };
  infoSheet[XLSX.utils.encode_cell(INFO_CELLS.sexo)] = { t: 's', v: gender };
  infoSheet[XLSX.utils.encode_cell(INFO_CELLS.edad)] = { t: 'n', v: age };
  if (ci?.school) infoSheet[XLSX.utils.encode_cell(INFO_CELLS.inst)] = { t: 's', v: ci.school };

  for (let qNum = 1; qNum <= 160; qNum++) {
    const ans = answersMap.get(qNum);
    const { col, row } = getAnswerCell(qNum);
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    const val = ans === true ? 'V' : 'F';
    infoSheet[addr] = { t: 's', v: val };
  }

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

  const hf = HyperFormula.buildFromSheets(hfData, { licenseKey: 'gpl-v3' });

  const infoSheetIdx = sheetNames.indexOf(INFO_SHEET);
  for (let qNum = 1; qNum <= 160; qNum++) {
    const ans = answersMap.get(qNum);
    const { col, row } = getAnswerCell(qNum);
    hf.setCellContents({ sheet: infoSheetIdx, row, col }, [[ans === true ? 'V' : 'F']]);
  }

  const rawScores: Record<string, number> = {};
  const baseRates: Record<string, number> = {};
  const finalRates: Record<string, number> = {};
  const resultsSheetIdx = sheetNames.indexOf(RESULTS_SHEET);

  const TB_FINAL_COL = 46;

  for (const scale of SCALES) {
    const pd = hf.getCellValue({ sheet: resultsSheetIdx, row: scale.row, col: PD_COL });
    const tb = hf.getCellValue({ sheet: resultsSheetIdx, row: scale.row, col: TB_COL });
    const tbFinal = hf.getCellValue({ sheet: resultsSheetIdx, row: scale.row, col: TB_FINAL_COL });

    rawScores[scale.key] = typeof pd === 'number' ? Math.round(pd) : parseFloat(String(pd)) || 0;
    baseRates[scale.key] = typeof tb === 'number' ? Math.round(tb) : parseFloat(String(tb)) || 0;
    finalRates[scale.key] = typeof tbFinal === 'number' ? Math.round(tbFinal) : parseFloat(String(tbFinal)) || 0;
  }

  hf.destroy();

  const transparencia = rawScores['X'] || 0;
  const deseabilidad = rawScores['Y'] || 0;
  const alteracion = rawScores['Z'] || 0;
  const warnings: string[] = [];
  if (transparencia < 150) warnings.push('Baja transparencia en las respuestas');
  if (deseabilidad > 20) warnings.push('Alta deseabilidad social');
  if (alteracion > 15) warnings.push('Posible exageración o distorsión de síntomas');
  const protocoloValido = warnings.length === 0;

  return { client, rawScores, baseRates, finalRates, validity: { protocoloValido, transparencia, deseabilidad, alteracion, warnings } };
}

const VALIDITY_KEYS = new Set(['X', 'Y', 'Z']);

const getInterp = (key: string, br: number): string => {
  if (VALIDITY_KEYS.has(key)) return '';
  if (br >= 85) return 'Área principal de preocupación';
  if (br >= 75) return 'Área problemática';
  if (br >= 60) return 'Tema ligeramente problemático';
  return 'Indicador nulo';
};

function drawProfileChart(
  doc: any,
  title: string,
  scales: { label: string; key: string }[],
  finalRates: Record<string, number>,
  startY: number
): number {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 14;
  const marginR = 14;
  const labelW = 52;
  const chartX = marginL + labelW;
  const chartW = pageW - marginL - marginR - labelW;
  const maxVal = 115;
  const barH = 7;
  const rowH = barH + 3;
  const headerH = 14;
  const totalH = headerH + scales.length * rowH + 10;

  if (startY + totalH > pageH - 20) {
    doc.addPage();
    startY = 20;
  }

  const accentR = PDF_COLORS.accentGreen[0];
  const accentG = PDF_COLORS.accentGreen[1];
  const accentB = PDF_COLORS.accentGreen[2];

  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(marginL, startY, pageW - marginL - marginR, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text(title, marginL + 3, startY + 5.5);
  doc.setFont(undefined, 'normal');
  let y = startY + 10;

  const ticks = [0, 30, 60, 75, 85, 100, 115];
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(6.5);
  for (const tick of ticks) {
    const tx = chartX + (tick / maxVal) * chartW;
    doc.text(String(tick), tx, y, { align: 'center' });
  }
  y += 3;

  for (let i = 0; i < scales.length; i++) {
    const s = scales[i];
    const val = Math.min(finalRates[s.key] ?? 0, maxVal);
    const bw = (val / maxVal) * chartW;
    const ry = y + (rowH - barH) / 2;

    if (i % 2 === 0) {
      doc.setFillColor(246, 248, 246);
      doc.rect(marginL, y, pageW - marginL - marginR, rowH, 'F');
    }

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(7.5);
    doc.text(s.label, marginL + 1, ry + barH * 0.65);

    doc.setFillColor(230, 230, 230);
    doc.roundedRect(chartX, ry, chartW, barH, 1.5, 1.5, 'F');

    const zone60x = chartX + (60 / maxVal) * chartW;
    const zone75x = chartX + (75 / maxVal) * chartW;
    const zone85x = chartX + (85 / maxVal) * chartW;

    doc.setFillColor(255, 243, 205);
    doc.rect(zone60x, ry, zone75x - zone60x, barH, 'F');
    doc.setFillColor(255, 218, 185);
    doc.rect(zone75x, ry, zone85x - zone75x, barH, 'F');
    doc.setFillColor(255, 200, 200);
    doc.rect(zone85x, ry, chartX + chartW - zone85x, barH, 'F');

    let barR = accentR, barG = accentG, barB = accentB;
    if (val >= 85) { barR = 220; barG = 53; barB = 53; }
    else if (val >= 75) { barR = 230; barG = 130; barB = 30; }
    else if (val >= 60) { barR = 200; barG = 170; barB = 20; }
    doc.setFillColor(barR, barG, barB);
    if (bw > 0) doc.roundedRect(chartX, ry, bw, barH, 1.5, 1.5, 'F');

    doc.setTextColor(val >= 20 ? 255 : 60, val >= 20 ? 255 : 60, val >= 20 ? 255 : 60);
    doc.setFontSize(6.5);
    if (val > 10) {
      doc.text(String(val), chartX + bw - 2, ry + barH * 0.7, { align: 'right' });
    } else {
      doc.setTextColor(80, 80, 80);
      doc.text(String(val), chartX + bw + 2, ry + barH * 0.7);
    }

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

export async function downloadMaciReportPDF(client_id: number, attemptId: string = 'active'): Promise<void> {
  const score = await computeMaciWithExcel(client_id, attemptId);
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

  const perfilI = SCALES.filter(s => ['1', '2A', '2B', '3', '4', '5', '6A', '6B', '7', '8A', '8B', '9'].includes(s.key));
  y = drawProfileChart(doc, 'Perfil I — Prototipos de Personalidad', perfilI, score.finalRates, y);

  const perfilII = SCALES.filter(s => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(s.key));
  y = drawProfileChart(doc, 'Perfil II — Preocupaciones Expresadas', perfilII, score.finalRates, y);

  const perfilIII = SCALES.filter(s => ['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG'].includes(s.key));
  y = drawProfileChart(doc, 'Perfil III — Síndromes Clínicos', perfilIII, score.finalRates, y);

  doc.addPage();
  let yc = drawPremiumHeader(doc, 'MACI — Reporte de Interpretación', 'Inventario Clínico de Millon para Adolescentes', now);
  yc = drawSectionHeading(doc, yc, 'Perfil por Escalas');

  const interpColor = (key: string, tb: number): [number, number, number] | null => {
    if (VALIDITY_KEYS.has(key)) return null;
    if (tb >= 85) return [255, 220, 220];
    if (tb >= 75) return [255, 234, 205];
    if (tb >= 60) return [255, 250, 210];
    return null;
  };

  const p1Rows = perfilI.map(s => {
    const tb = score.finalRates[s.key] ?? 0;
    return [s.label, tb, getInterp(s.key, tb)];
  });

  const p23Rows = [...perfilII, ...perfilIII].map(s => {
    const tb = score.finalRates[s.key] ?? 0;
    return [s.label, tb, getInterp(s.key, tb)];
  });

  const allP1Scales = perfilI;
  const allP23Scales = [...perfilII, ...perfilIII];

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


