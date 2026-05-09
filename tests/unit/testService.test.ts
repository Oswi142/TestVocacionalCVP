import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testService } from '../../src/infrastructure/services/testService';

const mocks = vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockSelect: vi.fn(),
    mockEq: vi.fn(),
    mockGte: vi.fn(),
    mockOrder: vi.fn(),
    mockIn: vi.fn(),
    mockInsert: vi.fn(),
    mockSingle: vi.fn(),
    mockMaybeSingle: vi.fn(),
    mockThen: vi.fn(),
    mockQuery: {} as any
}));

mocks.mockQuery.select = mocks.mockSelect;
mocks.mockQuery.eq = mocks.mockEq;
mocks.mockQuery.gte = mocks.mockGte;
mocks.mockQuery.order = mocks.mockOrder;
mocks.mockQuery.in = mocks.mockIn;
mocks.mockQuery.insert = mocks.mockInsert;
mocks.mockQuery.single = mocks.mockSingle;
mocks.mockQuery.maybeSingle = mocks.mockMaybeSingle;
mocks.mockQuery.then = mocks.mockThen;

mocks.mockSelect.mockReturnValue(mocks.mockQuery);
mocks.mockEq.mockReturnValue(mocks.mockQuery);
mocks.mockGte.mockReturnValue(mocks.mockQuery);
mocks.mockOrder.mockReturnValue(mocks.mockQuery);
mocks.mockIn.mockReturnValue(mocks.mockQuery);
mocks.mockInsert.mockReturnValue(mocks.mockQuery);
mocks.mockSingle.mockReturnValue(mocks.mockQuery);
mocks.mockMaybeSingle.mockReturnValue(mocks.mockQuery);
mocks.mockFrom.mockReturnValue(mocks.mockQuery);

vi.mock('../../src/infrastructure/config/supabaseClient', () => ({
    supabase: { from: mocks.mockFrom }
}));

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
        clear: vi.fn(() => { store = {}; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
    };
})();
(global as any).localStorage = localStorageMock;

const mockNavigator = { onLine: true };
Object.defineProperty(global, 'navigator', { value: mockNavigator, writable: true, configurable: true });

describe('TestService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        mockNavigator.onLine = true;
        mocks.mockThen.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
        mocks.mockSingle.mockResolvedValue({ data: {}, error: null });
        mocks.mockInsert.mockResolvedValue({ error: null });
    });

    it('should handle getQuestions coverage', async () => {
        mocks.mockThen.mockImplementationOnce((r: any) => r({ data: [{ id: 1 }], error: null }));
        await testService.getQuestions(1);
        mockNavigator.onLine = false;
        localStorage.setItem('cache_questions_1_all', JSON.stringify([{ id: 1 }]));
        await testService.getQuestions(1);
    });

    it('should handle getanswer_options coverage', async () => {
        mocks.mockThen.mockImplementationOnce((r: any) => r({ data: [{ id: 1 }], error: null }));
        await testService.getanswer_options([1]);
    });

    it('should handle detailed progress coverage (all branches)', async () => {
        mocks.mockThen.mockImplementationOnce((r: any) => r({ data: [{ test_id: 1, question_id: 101 }], error: null }));
        mocks.mockSingle.mockResolvedValue({ data: { user_id: 1 }, error: null });
        await testService.getDetailedProgress(1);

        localStorage.setItem('cache_progress_1', JSON.stringify({ hasCompletedIntro: true, completedMaintest_ids: [2] }));
        mocks.mockThen.mockImplementationOnce((r: any) => r({ data: null, error: new Error('DB Crash') }));
        const res = await testService.getDetailedProgress(1);
        expect(res.completedMaintest_ids).toContain(2);
        localStorage.setItem('pending_clients_info', JSON.stringify([{ user_id: 1 }]));
        const res2 = await testService.getDetailedProgress(1);
        expect(res2.hasCompletedIntro).toBe(true);
    });

    it('should handle prefetch coverage (success/error)', async () => {
        mocks.mockThen.mockImplementation((r: any) => r({ data: [{ id: 1 }], error: null }));
        await testService.prefetchAllTests();
        mockNavigator.onLine = false;
        await expect(testService.prefetchAllTests()).rejects.toThrow();
        localStorageMock.clear(); 
        mockNavigator.onLine = true;
        mocks.mockThen.mockImplementationOnce((r: any) => r({ data: null, error: new Error('Network') }));
        await expect(testService.prefetchAllTests()).rejects.toThrow();
    });

    it('should handle submitAnswers and completedIds', async () => {
        await testService.submitAnswers([]);
        await testService.getCompletedtest_ids(1);
    });
});
