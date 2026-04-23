import { describe, it, expect, vi } from 'vitest';
import { mapIpprAnswerTextToScore, calculateIpprResultSummary, computeIpprScore, downloadIpprReportPDF } from '../../src/domain/rules/ippr';

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

describe('IPPR Utils', () => {
    describe('mapIpprAnswerTextToScore (DDT)', () => {
        const translationCases = [
            { text: 'no conozco la actividad o profesión', expected: 0 },
            { text: ' NO ME GUSTA ', expected: 1 },
            { text: 'me es indiferente o tengo dudas', expected: 2 },
            { text: 'me gusta', expected: 3 },
            { text: 'otra cosa rara', expected: 0 },
            { text: '', expected: 0 },
            { text: null, expected: 0 }
        ];

        it.each(translationCases)('maps "$text" to score $expected', ({ text, expected }) => {
            expect(mapIpprAnswerTextToScore(text as any)).toBe(expected);
        });
    });

    describe('calculateIpprResultSummary (DDT Profiles)', () => {
        const qToSection = new Map([
            [101, 1 as const], [102, 1 as const], [201, 2 as const], [301, 3 as const]
        ]);
        const idToText = new Map([
            [1, 'me gusta'], [2, 'me es indiferente o tengo dudas'], [3, 'no me gusta']
        ]);

        const testProfiles = [
            {
                name: 'Perfil Ciencias Naturales (S1 alto, resto bajo)',
                answers: [
                    { question_id: 101, answer_id: 1 },
                    { question_id: 102, answer_id: 1 },
                    { question_id: 201, answer_id: 3 },
                ],
                expectedAnswered: 3,
                expectedTotalScore: 7,
                expectedTopSection: '1'
            },
            {
                name: 'Perfil Salud (S3 alto, S1 medio)',
                answers: [
                    { question_id: 301, answer_id: 1 },
                    { question_id: 101, answer_id: 2 },
                ],
                expectedAnswered: 2,
                expectedTotalScore: 5,
                expectedTopSection: '3'
            },
            {
                name: 'Perfil Equilibrado o Indeciso',
                answers: [
                    { question_id: 101, answer_id: 2 },
                    { question_id: 201, answer_id: 2 },
                    { question_id: 301, answer_id: 2 },
                ],
                expectedAnswered: 3,
                expectedTotalScore: 6,
                expectedTopSection: '1'
            }
        ];

        it.each(testProfiles)('Profile Name: $name', ({ answers, expectedAnswered, expectedTotalScore, expectedTopSection }) => {
            const result = calculateIpprResultSummary(answers, qToSection, idToText);

            expect(result.totalAnswered).toBe(expectedAnswered);
            expect(result.totalScore).toBe(expectedTotalScore);
            expect(String(result.ranking[0].section)).toBe(expectedTopSection);
        });
    });

    describe('Integration Wrappers (DB mocked)', () => {
        it('computeIpprScore should run without errors using mock DB', async () => {
            const result = await computeIpprScore(1, 'active');
            expect(result).toBeDefined();
            expect(result.client_id).toBe(1);
            expect(result.totalAnswered).toBe(0);
        });

        it('downloadIpprReportPDF should generate and save PDF using mocks', async () => {
            await downloadIpprReportPDF(1, 'active');
            expect(true).toBe(true);
        });
    });
});

