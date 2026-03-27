import jsPDF from 'jspdf';
import logoUrl from '../assets/logo-cvp.png';

// ─── Brand colors ──────────────────────────────────────────────────────────
export const PDF_COLORS = {
  headerBg:   [15, 23, 42]   as [number, number, number],  // slate-900
  accentGreen:[32, 130, 80]  as [number, number, number],  // CVP green
  accentAmber:[200, 130, 30] as [number, number, number],  // CVP amber
  bodyText:   [30, 41, 59]   as [number, number, number],  // slate-800
  mutedText:  [100, 116, 139]as [number, number, number],  // slate-500
  lightBg:    [248, 250, 252]as [number, number, number],  // slate-50
  divider:    [226, 232, 240]as [number, number, number],  // slate-200
  white:      [255, 255, 255]as [number, number, number],
};

/** Distinct palette used for bar charts — one color per bar */
export const CHART_PALETTE: [number, number, number][] = [
  [32,  130,  80],  // CVP green
  [245, 158,  11],  // amber
  [99,  102, 241],  // indigo
  [239,  68,  68],  // red
  [20,  184, 166],  // teal
  [168,  85, 247],  // violet
  [59,  130, 246],  // blue
  [249, 115,  22],  // orange
  [16,  185, 129],  // emerald
  [236,  72, 153],  // pink
  [234, 179,   8],  // yellow
  [6,   182, 212],  // cyan
  [139,  92,  46],  // brown
  [107, 114, 128],  // slate
  [52,  211, 153],  // mint
];

/** Shared client data bag used by all PDF generators */
export interface ClientPdfData {
  name:            string | null;
  firstlastname:   string | null;
  secondlastname:  string | null;
  school:          string | null;
  grade:           string | null;
  birthday:        string | null;
  birthplace:      string | null;
  gender:          string | null;
}

/** Format a raw ISO/YYYY-MM-DD birthday to DD/MM/YYYY */
export function formatBirthday(raw: string | null | undefined): string {
  if (!raw) return 'No registrado';
  const [year, month, day] = raw.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return raw;
}

/** Build the standard field list for drawClientCard */
export function buildClientCardFields(c: ClientPdfData): { label: string; value: string }[] {
  return [
    { label: 'Nombre(s)',       value: c.name           || 'No registrado' },
    { label: 'Primer apellido', value: c.firstlastname  || 'No registrado' },
    { label: 'Segundo apellido',value: c.secondlastname || 'No registrado' },
    { label: 'Colegio',        value: c.school          || 'No registrado' },
    { label: 'Grado',          value: c.grade           || 'No registrado' },
    { label: 'F. Nacimiento',  value: formatBirthday(c.birthday) },
    { label: 'Lugar Nac.',     value: c.birthplace      || 'No registrado' },
    { label: 'Género',         value: c.gender          || 'No registrado' },
  ];
}

// ─── Page dimensions (A4 portrait) ─────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;

/** Standard body font size used throughout all PDFs (excluding the header). */
export const PDF_FONT_SIZE = 9;

/**
 * Draws a premium branded header at the top of the current page.
 * Returns the Y position right after the header so you can start your content.
 *
 * @param doc         - the jsPDF instance
 * @param testLabel   - short test name, e.g. "CHASIDE", "IPP-R", "DAT"
 * @param subtitle    - descriptive subtitle line
 * @param dateStr     - formatted date string for the report
 * @returns yAfterHeader - the Y coordinate where body content can start
 */
export function drawPremiumHeader(
  doc: jsPDF,
  testLabel: string,
  subtitle: string,
  dateStr: string
): number {
  const HEADER_H = 34;

  // ── Dark background bar ───────────────────────────────────────────────────
  doc.setFillColor(...PDF_COLORS.headerBg);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');

  // ── Logo (slightly smaller, ~3:4 aspect) ───────────────────────────────────
  const logoH = HEADER_H - 10;  // smaller vertical size
  const logoW = logoH * 1.1;    // slightly wider than tall (natural aspect)
  try {
    doc.addImage(logoUrl, 'PNG', MARGIN - 2, 5, logoW, logoH);
  } catch (e) {
    // logo load failure is non-fatal
  }

  // ── Test label (title) ────────────────────────────────────────────────────
  const textX = MARGIN + logoW + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(testLabel, textX, 13);

  // ── Subtitle ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 190, 200);
  doc.text(subtitle, textX, 20.5);

  // ── Date (right-aligned) ──────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(150, 160, 175);
  doc.text(`Generado: ${dateStr}`, PAGE_W - MARGIN, 20.5, { align: 'right' });

  // ── Thin accent line under header ─────────────────────────────────────────
  doc.setDrawColor(...PDF_COLORS.accentGreen);
  doc.setLineWidth(0.8);
  doc.line(0, HEADER_H, PAGE_W, HEADER_H);

  return HEADER_H + 6;
}

/**
 * Draws a client info card below the header.
 * Returns the Y position after the card.
 */
export function drawClientCard(
  doc: jsPDF,
  startY: number,
  fields: { label: string; value: string }[]
): number {
  const cardH = 8 + fields.length * 7 + 2;  // +2mm bottom padding

  // rounded card background
  doc.setFillColor(...PDF_COLORS.lightBg);
  doc.setDrawColor(...PDF_COLORS.divider);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, startY, PAGE_W - MARGIN * 2, cardH, 3, 3, 'FD');

  // "Datos del Participante" heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONT_SIZE);
  doc.setTextColor(...PDF_COLORS.accentGreen);
  doc.text('DATOS DEL PARTICIPANTE', MARGIN + 4, startY + 5.5);

  const lineY = startY + 7.5;
  doc.setDrawColor(...PDF_COLORS.divider);
  doc.setLineWidth(0.2);
  doc.line(MARGIN + 4, lineY, PAGE_W - MARGIN - 4, lineY);

  let y = lineY + 5.5;
  for (const { label, value } of fields) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_FONT_SIZE);
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(`${label}:`, MARGIN + 4, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.bodyText);
    doc.text(value || '—', MARGIN + 38, y);
    y += 7;
  }

  return startY + cardH + 10;
}

/**
 * Draws a section heading line.
 * Returns the Y position after the heading.
 */
export function drawSectionHeading(doc: jsPDF, y: number, title: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONT_SIZE);
  doc.setTextColor(...PDF_COLORS.bodyText);
  doc.text(title, MARGIN, y);

  doc.setDrawColor(...PDF_COLORS.accentGreen);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 1.5, PAGE_W - MARGIN, y + 1.5);

  return y + 7;
}

/**
 * Draws a footer line with page number on every rendered page.
 */
export function drawFooter(doc: jsPDF): void {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_FONT_SIZE);
    doc.setTextColor(...PDF_COLORS.mutedText);
    doc.text(
      'Club Vida Plena — Documento confidencial de uso interno',
      MARGIN,
      PAGE_H - 6
    );
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
    doc.setDrawColor(...PDF_COLORS.divider);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 9, PAGE_W - MARGIN, PAGE_H - 9);
  }
}

/**
 * Draws a horizontal bar chart.
 * @param doc        - jsPDF instance
 * @param startY     - Y position to start drawing
 * @param items      - array of { label, value } objects
 * @param maxValue   - the value that corresponds to a full-width bar
 * @param opts       - optional config
 * @returns Y position after the chart
 */
export function drawHorizontalBarChart(
  doc: jsPDF,
  startY: number,
  items: { label: string; value: number; color?: [number, number, number]; labelText?: string }[],
  maxValue: number,
  opts: {
    labelWidth?: number;
    barMaxWidth?: number;
    barH?: number;
    rowGap?: number;
    defaultColor?: [number, number, number];
  } = {}
): number {
  const {
    labelWidth  = 52,
    barMaxWidth = 108,
    barH        = 5,
    rowGap      = 3,
    defaultColor = PDF_COLORS.accentGreen,
  } = opts;

  const barX = MARGIN + labelWidth;
  let y = startY;

  for (const item of items) {
    const barW = maxValue > 0 ? (item.value / maxValue) * barMaxWidth : 0;
    const color: [number, number, number] = item.color ?? defaultColor;

    // ── Label ──────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_FONT_SIZE);
    doc.setTextColor(...PDF_COLORS.mutedText);
    // Truncate label if it overflows the label column
    const maxChars = Math.floor(labelWidth / 1.9);
    const lbl = item.label.length > maxChars ? item.label.slice(0, maxChars - 1) + '…' : item.label;
    doc.text(lbl, MARGIN, y + barH - 1.2);

    // ── Background track ───────────────────────────────────────────────────
    doc.setFillColor(226, 232, 240);  // slate-200
    doc.roundedRect(barX, y, barMaxWidth, barH, 1.5, 1.5, 'F');

    // ── Filled bar ─────────────────────────────────────────────────────────
    if (barW > 0) {
      doc.setFillColor(...color);
      doc.roundedRect(barX, y, barW, barH, 1.5, 1.5, 'F');
    }

    // ── Value label ────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_FONT_SIZE);
    doc.setTextColor(...PDF_COLORS.bodyText);
    doc.text(item.labelText ?? String(item.value), barX + barMaxWidth + 3, y + barH - 1.2);

    y += barH + rowGap;
  }

  return y + 2;
}

