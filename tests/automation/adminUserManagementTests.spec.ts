import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe.configure({ mode: 'serial' });

test.describe('Admin User Management (CRUD)', () => {
    test.setTimeout(180000); 

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const uniqueSuffix = Array.from({ length: 6 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
    
    const baseName = 'UsuarioPrueba';
    
    const originalName = `${baseName} ${uniqueSuffix}`;
    const editedName = `${baseName} Editado ${uniqueSuffix}`;
    const firstName = 'Test';
    const lastName = 'Automation';
    const username = `test.user.${uniqueSuffix}`;
    const password = 'TestPassword123!';

    test('Should execute user creation and deletion', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const adminUsers = new AdminUsersPage(page);

        const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
        const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';

        console.log('--- Iniciando Sesión como Admin ---');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });
        console.log('--- Fase 1: Creación de Usuario ---');
        await adminUsers.goto();
        await adminUsers.createUser(originalName, firstName, lastName, username, password);
        
        await adminUsers.verifyUserExists(originalName);
        console.log(`Usuario creado exitosamente: ${originalName}`);

        console.log('--- Fase 2: Eliminación de Usuario ---');
        await adminUsers.deleteUser(originalName);
        
        await adminUsers.verifyUserNotExists(originalName);
        console.log(`Usuario eliminado exitosamente: ${originalName}`);

        console.log('--- TEST COMPLETADO CON ÉXITO ---');
    });

    test('Should execute user creation, edit, and deletion', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const adminUsers = new AdminUsersPage(page);

        const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
        const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';

        console.log('--- Iniciando Sesión como Admin (Test 2) ---');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });
        console.log('--- Fase 1: Creación de Usuario ---');
        await adminUsers.goto();
        
        const altUsername = `edit.${username}`;
        await adminUsers.createUser(originalName, firstName, lastName, altUsername, password);
        
        await adminUsers.verifyUserExists(originalName);
        console.log(`Usuario creado exitosamente: ${originalName}`);

        console.log('--- Fase 2: Edición de Usuario ---');
        await adminUsers.editUser(originalName, editedName);
        
        await adminUsers.verifyUserExists(editedName);
        await adminUsers.verifyUserNotExists(originalName);
        console.log(`Usuario editado exitosamente a: ${editedName}`);

        console.log('--- Fase 3: Eliminación de Usuario ---');
        await adminUsers.deleteUser(editedName);
        
        await adminUsers.verifyUserNotExists(editedName);
        console.log(`Usuario eliminado exitosamente: ${editedName}`);

        console.log('--- TEST DE EDICIÓN COMPLETADO CON ÉXITO ---');
    });
});
