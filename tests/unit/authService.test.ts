import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login } from '../../src/infrastructure/services/authService';
import bcrypt from 'bcryptjs';

const mocks = vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockSelect: vi.fn(),
    mockIlike: vi.fn(),
    mockLimit: vi.fn(),
    mockQuery: {} as any
}));

mocks.mockQuery.select = mocks.mockSelect;
mocks.mockQuery.ilike = mocks.mockIlike;
mocks.mockQuery.limit = mocks.mockLimit;

mocks.mockSelect.mockReturnValue(mocks.mockQuery);
mocks.mockIlike.mockReturnValue(mocks.mockQuery);
mocks.mockLimit.mockReturnValue(mocks.mockQuery);
mocks.mockFrom.mockReturnValue(mocks.mockQuery);

vi.mock('../../src/infrastructure/config/supabaseClient', () => ({
    supabase: {
        from: mocks.mockFrom
    }
}));

vi.mock('bcryptjs', () => ({
    default: {
        compare: vi.fn()
    },
    compare: vi.fn()
}));

describe('AuthService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('login', () => {
        it('should successfully log in a user with correct credentials', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                password: 'hashedpassword',
                role: 'client',
                name: 'Test User'
            };

            mocks.mockLimit.mockResolvedValue({ data: [mockUser], error: null });
            (bcrypt.compare as any).mockResolvedValue(true);

            const result = await login('testuser', 'password123');

            expect(mocks.mockFrom).toHaveBeenCalledWith('users');
            expect(mocks.mockIlike).toHaveBeenCalledWith('username', 'testuser');
            expect(result).toEqual({
                id: 1,
                username: 'testuser',
                role: 'client',
                name: 'Test User'
            });
        });

        it('should throw "Usuario no encontrado" if user does not exist', async () => {
            mocks.mockLimit.mockResolvedValue({ data: [], error: null });

            await expect(login('unknown', 'any')).rejects.toThrow('Usuario no encontrado');
        });

        it('should throw "Contraseña incorrecta" if password is wrong', async () => {
            const mockUser = { id: 1, password: 'hashed' };
            mocks.mockLimit.mockResolvedValue({ data: [mockUser], error: null });
            (bcrypt.compare as any).mockResolvedValue(false);

            await expect(login('user', 'wrong')).rejects.toThrow('Contraseña incorrecta');
        });

        it('should trim username before searching', async () => {
            mocks.mockLimit.mockResolvedValue({ data: [], error: null });
            
            try { await login('  spaced_user  ', 'pwd'); } catch(e) {}
            
            expect(mocks.mockIlike).toHaveBeenCalledWith('username', 'spaced_user');
        });
    });
});
