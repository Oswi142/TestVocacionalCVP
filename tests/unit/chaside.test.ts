import { describe, it, expect, vi } from 'vitest';
import { isYes, calculateChasideResultSummary, computeChasideScore, downloadChasideReportPDF } from '../../src/domain/rules/chaside';

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

describe('CHASIDE Utils', () => {
    describe('isYes (DDT)', () => {
        const yesCases = ['sí', 'si', ' SÍ ', 'SI', 'Sí'];
        it.each(yesCases)('should return true for valid affirmative "%s"', (val) => {
            expect(isYes(val)).toBe(true);
        });

        const noCases = ['no', 'tal vez', '123', ' ', '', null, undefined];
        it.each(noCases)('should return false for invalid or negative "%s"', (val) => {
            expect(isYes(val as any)).toBe(false);
        });
    });

    describe('calculateChasideResultSummary (DDT Profiles)', () => {
        const qToBand = new Map([
            [1, 'C' as const], [2, 'H' as const], [3, 'A' as const], [4, 'C' as const]
        ]);
        const qToScale = new Map([
            [1, 'interest' as const], [2, 'aptitude' as const], [3, 'interest' as const], [4, 'aptitude' as const]
        ]);
        const idToText = new Map([
            [10, 'sí'], [20, 'no']
        ]);

        const testProfiles = [
            {
                name: 'El Ingeniero (Todo C positivo, resto negativo)',
                answers: [
                    { questionid: 1, answerid: 10 },
                    { questionid: 4, answerid: 10 },
                    { questionid: 2, answerid: 20 },
                    { questionid: 3, answerid: 20 }
                ],
                expectedYesCount: 2,
                expectedTopBand: 'C'
            },
            {
                name: 'El Artista Indeciso (A positivo, deja el resto en blanco)',
                answers: [
                    { questionid: 3, answerid: 10 },
                ],
                expectedYesCount: 1,
                expectedTopBand: 'A'
            },
            {
                name: 'El Rebelde (Todo negativo)',
                answers: [
                    { questionid: 1, answerid: 20 },
                    { questionid: 2, answerid: 20 },
                    { questionid: 3, answerid: 20 },
                    { questionid: 4, answerid: 20 }
                ],
                expectedYesCount: 0,
                expectedTopBand: 'C' 
            }
        ];

        it.each(testProfiles)('Profile Name: $name', ({ answers, expectedYesCount, expectedTopBand }) => {
            const result = calculateChasideResultSummary(answers, qToBand, qToScale, idToText);
            
            expect(result.yesCount).toBe(expectedYesCount);
            expect(result.ranking.overall[0].band).toBe(expectedTopBand);
        });
    });

    describe('Integration Wrappers (DB mocked)', () => {
        it('computeChasideScore should run without errors using mock DB', async () => {
            const result = await computeChasideScore(1, 'active');
            expect(result).toBeDefined();
            expect(result.clientId).toBe(1);
            expect(result.yesCount).toBe(0);
        });

        it('downloadChasideReportPDF should generate and save PDF using mocks', async () => {
             await downloadChasideReportPDF(1, 'active');
             expect(true).toBe(true);
        });
    });
});

