import { supabase } from '@/infrastructure/config/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type DatType =
    | 'razonamiento_verbal'
    | 'razonamiento_numerico'
    | 'razonamiento_abstracto'
    | 'razonamiento_mecanico'
    | 'razonamiento_espacial'
    | 'ortografia';

export const DAT_LABELS: Record<DatType, string> = {
    razonamiento_verbal: 'Razonamiento Verbal',
    razonamiento_numerico: 'Razonamiento Numérico',
    razonamiento_abstracto: 'Razonamiento Abstracto',
    razonamiento_mecanico: 'Razonamiento Mecánico',
    razonamiento_espacial: 'Relaciones Espaciales',
    ortografia: 'Ortografía',
};

export type DatResult = {
    client_id: number;
    client: import('@/infrastructure/utils/pdfUtils').ClientPdfData;
    scores: Record<DatType, { correct: number; answered: number; total: number }>;
    overallCorrect: number;
    totalAnswered: number;
};

export async function getDattest_id(): Promise<number> {
    const { data, error } = await supabase
        .from('tests')
        .select('id')
        .ilike('test_name', '%dat%')
        .maybeSingle();

    if (error || !data) {
        return 5;
    }
    return data.id;
}

export async function computeDatScore(client_id: number, attemptId: string = 'active'): Promise<DatResult> {
    const test_id = await getDattest_id();

    const { data: urows } = await supabase
        .from('users')
        .select('name, first_last_name, second_last_name')
        .eq('id', client_id)
        .limit(1);
    const urow = urows?.[0];
    const { data: cirows } = await supabase
        .from('clients_info')
        .select('school, grade, birthday, birthplace, gender')
        .eq('user_id', client_id)
        .limit(1);
    const ci = cirows?.[0];
    const clientData: import('@/infrastructure/utils/pdfUtils').ClientPdfData = {
        name: urow?.name ?? null,
        first_last_name: urow?.first_last_name ?? null,
        second_last_name: urow?.second_last_name ?? null,
        school: ci?.school ?? null,
        grade: ci?.grade ?? null,
        birthday: ci?.birthday ?? null,
        birthplace: ci?.birthplace ?? null,
        gender: ci?.gender ?? null,
    };

    const { data: qrows, error: qErr } = await supabase
        .from('questions')
        .select('id, dat_type')
        .eq('test_id', test_id)
        .range(0, 9999);
    if (qErr) throw qErr;

    const qToType = new Map<number, DatType>();
    const typeTotalCount: Record<string, number> = {};

    (qrows || []).forEach(q => {
        const type = q.dat_type as DatType;
        if (type) {
            qToType.set(q.id, type);
            typeTotalCount[type] = (typeTotalCount[type] || 0) + 1;
        }
    });

    const { data: arows, error: aErr } = await supabase
        .from('test_answers')
        .select('question_id, answer_id, details')
        .eq('client_id', client_id)
        .eq('test_id', test_id)
        .range(0, 9999);
    if (aErr) throw aErr;

    const filteredArows = (arows || []).filter(r => {
        const d = r.details || '';
        if (attemptId === 'active') return !d.startsWith('[HIST_');
        return d.startsWith(attemptId);
    });

    const answer_ids = (filteredArows || []).map(r => r.answer_id).filter(Boolean).filter(id => !isNaN(Number(id)));
    let correctSet = new Set<number>();

    if (answer_ids.length > 0) {
        const { data: orows, error: oErr } = await supabase
            .from('answer_options')
            .select('id, dat_info')
            .in('id', answer_ids)
            .eq('dat_info', 'correcta')
            .range(0, 9999);

        if (!oErr && orows) {
            correctSet = new Set(orows.map(o => o.id));
        }
    }

    const { scores, overallCorrect, totalAnswered } = calculateDatResultSummary(
        filteredArows,
        qToType,
        typeTotalCount,
        correctSet
    );

    return {
        client_id,
        client: clientData,
        scores,
        overallCorrect,
        totalAnswered,
    };
}

export function calculateDatResultSummary(
    filteredArows: Array<{ question_id: number; answer_id?: number | null; details?: string | null }>,
    qToType: Map<number, DatType>,
    typeTotalCount: Record<string, number>,
    correctSet: Set<number>
) {
    const scores: Record<DatType, { correct: number; answered: number; total: number }> = {
        razonamiento_verbal: { correct: 0, answered: 0, total: typeTotalCount['razonamiento_verbal'] || 0 },
        razonamiento_numerico: { correct: 0, answered: 0, total: typeTotalCount['razonamiento_numerico'] || 0 },
        razonamiento_abstracto: { correct: 0, answered: 0, total: typeTotalCount['razonamiento_abstracto'] || 0 },
        razonamiento_mecanico: { correct: 0, answered: 0, total: typeTotalCount['razonamiento_mecanico'] || 0 },
        razonamiento_espacial: { correct: 0, answered: 0, total: typeTotalCount['razonamiento_espacial'] || 0 },
        ortografia: { correct: 0, answered: 0, total: typeTotalCount['ortografia'] || 0 },
    };

    let overallCorrect = 0;
    let totalAnswered = 0;

    filteredArows.forEach(r => {
        const type = qToType.get(r.question_id);
        if (type) {
            totalAnswered++;
            scores[type].answered += 1;
            if (r.answer_id && correctSet.has(Number(r.answer_id))) {
                scores[type].correct += 1;
                overallCorrect += 1;
            }
        }
    });

    return { scores, overallCorrect, totalAnswered };
}

export async function getCompletedDatCategories(client_id: number, attemptId: string = 'active'): Promise<DatType[]> {
    const test_id = await getDattest_id();

    const { data: qrows } = await supabase
        .from('questions')
        .select('id, dat_type')
        .eq('test_id', test_id)
        .range(0, 9999);

    const qToType = new Map<number, DatType>();
    (qrows || []).forEach(q => {
        if (q.dat_type) qToType.set(q.id, q.dat_type as DatType);
    });

    const { data: arows } = await supabase
        .from('test_answers')
        .select('question_id, details')
        .eq('client_id', client_id)
        .eq('test_id', test_id)
        .range(0, 9999);

    const filteredArows = (arows || []).filter(r => {
        const d = r.details || '';
        if (attemptId === 'active') return !d.startsWith('[HIST_');
        return d.startsWith(attemptId);
    });

    const completedTypes = new Set<DatType>();
    filteredArows.forEach(r => {
        const type = qToType.get(r.question_id);
        if (type) completedTypes.add(type);
    });

    return Array.from(completedTypes);
}

export async function downloadDatReportPDF(client_id: number, attemptId: string = 'active'): Promise<void> {
    const res = await computeDatScore(client_id, attemptId);
    const { drawPremiumHeader, drawClientCard, drawSectionHeading, drawFooter, PDF_COLORS, PDF_FONT_SIZE } = await import('@/infrastructure/utils/pdfUtils');

    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('es-ES');

    // Header
    let y = drawPremiumHeader(doc, 'DAT — Informe de Resultados', 'Differential Aptitude Tests (Puntajes por Categoría)', now);

    // Client info card
    const { buildClientCardFields } = await import('@/infrastructure/utils/pdfUtils');
    y = drawClientCard(doc, y, buildClientCardFields(res.client));

    // Scores table
    y = drawSectionHeading(doc, y, 'Resultados por Aptitud');

    const categories = Object.keys(DAT_LABELS) as DatType[];
    const tableData = categories.map(type => {
        const isCompleted = res.scores[type].answered > 0;
        const label = DAT_LABELS[type];
        const result = isCompleted
            ? `${res.scores[type].correct} / ${res.scores[type].total}`
            : 'Pendiente';
        const pct = isCompleted
            ? `${Math.round((res.scores[type].correct / res.scores[type].total) * 100)}%`
            : '—';
        return [label, result, pct];
    });

    autoTable(doc, {
        startY: y,
        head: [['Aptitud / Categoría', 'Resultado (Aciertos)', 'Porcentaje']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: PDF_COLORS.accentGreen, textColor: 255, fontStyle: 'bold' },
        bodyStyles: { textColor: PDF_COLORS.bodyText, fontSize: PDF_FONT_SIZE },
        alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
        styles: { cellPadding: 3.5, font: 'helvetica' },
        columnStyles: {
            1: { halign: 'center' as const, cellWidth: 48 },
            2: { halign: 'center' as const, cellWidth: 30 },
        },
        margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // Progress summary
    y = drawSectionHeading(doc, y, 'Progreso de Evaluación');

    const completedCount = categories.filter(c => res.scores[c].answered > 0).length;
    const summaryRows = [
        ['Sub-tests completados', `${completedCount} de 6`],
        ['Total de aciertos', `${res.overallCorrect} de ${res.totalAnswered} respondidas`],
    ];
    autoTable(doc, {
        startY: y,
        body: summaryRows,
        styles: { fontSize: PDF_FONT_SIZE, cellPadding: 3, font: 'helvetica' },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: PDF_COLORS.accentGreen, cellWidth: 60 },
            1: { textColor: PDF_COLORS.bodyText },
        },
        theme: 'plain',
        margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // Bar chart — page 2, no extra header, use labelText for correct/total
    const { drawHorizontalBarChart, CHART_PALETTE } = await import('@/infrastructure/utils/pdfUtils');
    doc.addPage();
    y = 20;  // Start near top of page 2 without a branded header

    y = drawSectionHeading(doc, y, 'Aciertos por Sub-test');

    const maxTotal = Math.max(...categories.map(t => res.scores[t].total), 1);

    const chartItems = categories.map((type, i) => {
        const isCompleted = res.scores[type].answered > 0;
        const correct = isCompleted ? res.scores[type].correct : 0;
        const total = res.scores[type].total;
        return {
            label: DAT_LABELS[type],
            value: correct,
            labelText: `${correct}/${total}`,
            color: CHART_PALETTE[i % CHART_PALETTE.length] as [number, number, number],
        };
    });

    y = drawHorizontalBarChart(doc, y,
        chartItems,
        maxTotal,
        { labelWidth: 58, barMaxWidth: 100, barH: 5.5, rowGap: 2.5 }
    );

    drawFooter(doc);
    const filename = `DAT_Resultados_${res.client.name?.replace(/\s+/g, '_') ?? client_id}.pdf`;
    doc.save(filename);
}
