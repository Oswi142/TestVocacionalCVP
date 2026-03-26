import { supabase } from '../supabaseClient';
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
    clientId: number;
    userName: string | null;
    schoolName: string | null;
    scores: Record<DatType, { correct: number; answered: number; total: number }>;
    overallCorrect: number;
    totalAnswered: number;
};

export async function getDatTestId(): Promise<number> {
    const { data, error } = await supabase
        .from('tests')
        .select('id')
        .ilike('testname', '%dat%')
        .maybeSingle();

    if (error || !data) {
        return 5;
    }
    return data.id;
}

export async function computeDatScore(clientId: number, attemptId: string = 'active'): Promise<DatResult> {
    const testId = await getDatTestId();

    const { data: urows } = await supabase
        .from('users')
        .select('name')
        .eq('id', clientId)
        .limit(1);
    const userName = (urows && urows[0]?.name) || null;
    const { data: cirows } = await supabase
        .from('clientsinfo')
        .select('school')
        .eq('userid', clientId)
        .limit(1);
    const schoolName = (cirows && cirows[0]?.school) || null;

    const { data: qrows, error: qErr } = await supabase
        .from('questions')
        .select('id, dat_type')
        .eq('testid', testId)
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
        .from('testsanswers')
        .select('questionid, answerid, details')
        .eq('clientid', clientId)
        .eq('testid', testId)
        .range(0, 9999);
    if (aErr) throw aErr;

    const filteredArows = (arows || []).filter(r => {
        const d = r.details || '';
        if (attemptId === 'active') return !d.startsWith('[HIST_');
        return d.startsWith(attemptId);
    });

    const answerIds = (filteredArows || []).map(r => r.answerid).filter(Boolean).filter(id => !isNaN(Number(id)));
    let correctSet = new Set<number>();

    if (answerIds.length > 0) {
        const { data: orows, error: oErr } = await supabase
            .from('answeroptions')
            .select('id, dat_info')
            .in('id', answerIds)
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
        clientId,
        userName,
        schoolName,
        scores,
        overallCorrect,
        totalAnswered,
    };
}

export function calculateDatResultSummary(
  filteredArows: Array<{ questionid: number; answerid?: number | null; details?: string | null }>,
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
        const type = qToType.get(r.questionid);
        if (type) {
            totalAnswered++;
            scores[type].answered += 1;
            if (r.answerid && correctSet.has(Number(r.answerid))) {
                scores[type].correct += 1;
                overallCorrect += 1;
            }
        }
    });

    return { scores, overallCorrect, totalAnswered };
}

export async function getCompletedDatCategories(clientId: number, attemptId: string = 'active'): Promise<DatType[]> {
    const testId = await getDatTestId();

    const { data: qrows } = await supabase
        .from('questions')
        .select('id, dat_type')
        .eq('testid', testId)
        .range(0, 9999);

    const qToType = new Map<number, DatType>();
    (qrows || []).forEach(q => {
        if (q.dat_type) qToType.set(q.id, q.dat_type as DatType);
    });

    const { data: arows } = await supabase
        .from('testsanswers')
        .select('questionid, details')
        .eq('clientid', clientId)
        .eq('testid', testId)
        .range(0, 9999);

    const filteredArows = (arows || []).filter(r => {
        const d = r.details || '';
        if (attemptId === 'active') return !d.startsWith('[HIST_');
        return d.startsWith(attemptId);
    });

    const completedTypes = new Set<DatType>();
    filteredArows.forEach(r => {
        const type = qToType.get(r.questionid);
        if (type) completedTypes.add(type);
    });

    return Array.from(completedTypes);
}

export async function downloadDatReportPDF(clientId: number, attemptId: string = 'active'): Promise<void> {
    const res = await computeDatScore(clientId, attemptId);

    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('es-ES');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('DAT — Informe de Resultados', 14, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${now}`, 14, 28);
    if (res.schoolName) {
        doc.text(`Nombre: ${res.userName ?? clientId}`, 14, 34);
        doc.text(`Colegio: ${res.schoolName}`, 14, 40);
        doc.setLineWidth(0.5);
        doc.line(14, 44, 196, 44);
    } else {
        doc.text(`Nombre: ${res.userName ?? clientId}`, 14, 34);
        doc.setLineWidth(0.5);
        doc.line(14, 38, 196, 38);
    }

    const categories = Object.keys(DAT_LABELS) as DatType[];

    const tableData = categories.map(type => {
        const isCompleted = res.scores[type].answered > 0;
        const label = DAT_LABELS[type];

        return [
            label,
            isCompleted ? `${res.scores[type].correct} / ${res.scores[type].total}` : 'Pendiente',
            isCompleted
                ? `${Math.round((res.scores[type].correct / res.scores[type].total) * 100)}%`
                : '0%'
        ];
    });

    autoTable(doc, {
        startY: res.schoolName ? 50 : 45,
        head: [['Aptitud / Categoría', 'Resultado (Aciertos)', 'Porcentaje']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [46, 125, 50], textColor: 255 },
        styles: { fontSize: 11, cellPadding: 4 },
        margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFont('helvetica', 'bold');
    doc.text('Progreso de Evaluación:', 14, finalY);
    doc.setFont('helvetica', 'normal');

    const completedCount = categories.filter(c => res.scores[c].answered > 0).length;
    doc.text(`El cliente ha completado ${completedCount} de 6 sub-tests.`, 14, finalY + 7);
    doc.text(`Total de aciertos globales: ${res.overallCorrect} de ${res.totalAnswered} respondidas.`, 14, finalY + 14);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const footerText = 'Este informe es evolutivo y se actualiza a medida que el cliente completa más categorías.';
    doc.text(footerText, 14, 280);

    const filename = `DAT_Resultados_${res.userName?.replace(/\s+/g, '_') ?? clientId}.pdf`;
    doc.save(filename);
}
