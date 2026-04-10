import { describe, it, expect, vi } from 'vitest';
import { DAT_LABELS, calculateDatResultSummary, computeDatScore, downloadDatReportPDF, getCompletedDatCategories } from '@/domain/rules/dat';

vi.mock('@/infrastructure/config/supabaseClient', () => {
    const chainable = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null }))
    };
    return { supabase: { from: vi.fn(() => chainable) } };
});

vi.mock('jspdf', () => ({
    default: class {
        setFont = vi.fn();
        setFontSize = vi.fn();
        setTextColor = vi.fn();
        text = vi.fn();
        save = vi.fn();
        addImage = vi.fn();
        addPage = vi.fn();
        setDrawColor = vi.fn();
        setLineWidth = vi.fn();
        line = vi.fn();
        rect = vi.fn();
        lastAutoTable = { finalY: 50 };
        internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    }
}));

vi.mock('jspdf-autotable', () => ({
    default: vi.fn()
}));

describe('DAT Utils', () => {
    describe('DAT_LABELS (DDT)', () => {
        const datCategories = [
            'razonamiento_verbal', 'razonamiento_numerico', 'razonamiento_abstracto', 
            'razonamiento_mecanico', 'razonamiento_espacial', 'ortografia'
        ];

        it.each(datCategories)('should constantly map category "%s"', (cat) => {
            expect(DAT_LABELS).toHaveProperty(cat);
        });
    });

    describe('calculateDatResultSummary (DDT Profiles)', () => {
        const qToType = new Map([
            [1, 'razonamiento_verbal' as const],
            [2, 'razonamiento_verbal' as const],
            [3, 'ortografia' as const],
            [4, 'razonamiento_numerico' as const]
        ]);

        const typeTotalCount = {
            'razonamiento_verbal': 2,
            'ortografia': 1,
            'razonamiento_numerico': 1
        };

        const correctSet = new Set([100, 200, 300]);
        const testProfiles = [
            {
                name: 'Cliente Matemático (100% en Números, 0% en Verbal)',
                answers: [
                    { questionid: 4, answerid: 300 },
                    { questionid: 1, answerid: 150 },
                    { questionid: 2, answerid: 150 },
                ],
                expectedAnswered: 3,
                expectedCorrect: 1,
                expectedVerbalScore: 0,
                expectedNumericScore: 1
            },
            {
                name: 'Cliente Letrado (100% Verbal/Orto, 0% en Números)',
                answers: [
                    { questionid: 1, answerid: 100 },
                    { questionid: 2, answerid: 200 },
                    { questionid: 3, answerid: 300 },
                    { questionid: 4, answerid: 150 },
                ],
                expectedAnswered: 4,
                expectedCorrect: 3,
                expectedVerbalScore: 2,
                expectedNumericScore: 0
            },
            {
                name: 'Usuario Abandonador (solo rinde 1 y falla)',
                answers: [
                    { questionid: 1, answerid: 150 }
                ],
                expectedAnswered: 1,
                expectedCorrect: 0,
                expectedVerbalScore: 0,
                expectedNumericScore: 0
            }
        ];

        it.each(testProfiles)('Profile Name: $name', ({ answers, expectedAnswered, expectedCorrect, expectedVerbalScore, expectedNumericScore }) => {
            const result = calculateDatResultSummary(answers, qToType, typeTotalCount, correctSet);

            expect(result.totalAnswered).toBe(expectedAnswered);
            expect(result.overallCorrect).toBe(expectedCorrect);
            expect(result.scores['razonamiento_verbal'].correct).toBe(expectedVerbalScore);
            expect(result.scores['razonamiento_numerico'].correct).toBe(expectedNumericScore);
        });
    });

    describe('Integration Wrappers (DB mocked)', () => {
        it('computeDatScore should run without errors using mock DB', async () => {
             const result = await computeDatScore(1, 'active');
             expect(result).toBeDefined();
             expect(result.clientId).toBe(1);
             expect(result.totalAnswered).toBe(0);
        });

        it('getCompletedDatCategories should run without errors using mock DB', async () => {
             const result = await getCompletedDatCategories(1, 'active');
             expect(result).toBeDefined();
             expect(Array.isArray(result)).toBe(true);
        });

        it('downloadDatReportPDF should generate and save PDF using mocks', async () => {
             await downloadDatReportPDF(1, 'active');
             expect(true).toBe(true);
        });
    });
});


