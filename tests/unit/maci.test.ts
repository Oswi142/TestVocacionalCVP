import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeMaciWithExcel, downloadMaciReportPDF } from '../../src/domain/rules/maciExcel';

// Mock Supabase
vi.mock('../../src/infrastructure/config/supabaseClient', () => {
    const chainable = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 1, name: 'Test', birthday: '2000-01-01', gender: 'MASCULINO' }, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null }))
    };
    return { supabase: { from: vi.fn(() => chainable) } };
});

// Mock fetch for the excel file
global.fetch = vi.fn(() =>
    Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    })
) as any;

// Mock XLSX
vi.mock('xlsx', () => ({
    read: vi.fn(() => ({
        SheetNames: ['DATOS Y RESPUESTAS', 'RESULTADOS'],
        Sheets: {
            'DATOS Y RESPUESTAS': { '!ref': 'A1:O160' },
            'RESULTADOS': { '!ref': 'A1:AZ100' }
        }
    })),
    utils: {
        encode_cell: vi.fn((cell) => `R${cell.r}C${cell.c}`),
        decode_range: vi.fn(() => ({ e: { r: 100, c: 50 } }))
    }
}));

// Mock Hyperformula
vi.mock('hyperformula', () => ({
    HyperFormula: {
        buildFromSheets: vi.fn(() => ({
            setCellContents: vi.fn(),
            getCellValue: vi.fn(({ col }) => {
                if (col === 13) return 20; // PD
                if (col === 14) return 60; // TB
                if (col === 46) return 85; // TB FINAL
                return 0;
            }),
            destroy: vi.fn()
        }))
    }
}));

// Mock jsPDF
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
        setFillColor = vi.fn();
        roundedRect = vi.fn();
        setLineDash = vi.fn();
        setPage = vi.fn();
        lastAutoTable = { finalY: 50 };
        internal = { getNumberOfPages: () => 1, pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    }
}));

vi.mock('jspdf-autotable', () => ({
    default: vi.fn()
}));

describe('MACI Excel Scoring Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('computeMaciWithExcel', () => {
        it('should fetch user data, process hyperformula, and return base rates', async () => {
            const result = await computeMaciWithExcel(1, 'active');

            // Verify client info
            expect(result.client.name).toBe('Test');
            
            // Verify scale values (based on our mock of HyperFormula)
            expect(result.rawScores['1']).toBe(20);
            expect(result.baseRates['2A']).toBe(60);
            expect(result.finalRates['X']).toBe(85);

            // Verify validity checks
            // Transparencia (X) raw score = 20 < 150 -> warning
            // Deseabilidad (Y) raw score = 20 -> no warning (>20)
            // Alteracion (Z) raw score = 20 > 15 -> warning
            expect(result.validity.protocoloValido).toBe(false);
            expect(result.validity.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('downloadMaciReportPDF', () => {
        it('should generate PDF report without errors', async () => {
            // Since we mocked jsPDF and all dependencies, this should just execute the rendering logic
            await expect(downloadMaciReportPDF(1, 'active')).resolves.not.toThrow();
        });
    });
});
