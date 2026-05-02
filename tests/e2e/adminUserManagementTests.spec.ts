import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import dotenv from 'dotenv';

dotenv.config();

// We run these tests serially because they represent a continuous sequence
// Create -> Edit -> Delete
test.describe.configure({ mode: 'serial' });

test.describe('Admin User Management (CRUD)', () => {
    // Set timeout to 3 minutes for safety
    test.setTimeout(180000); 

    // Generate a unique suffix using only letters to pass the name validation regex
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const uniqueSuffix = Array.from({ length: 6 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
    
    const baseName = 'UsuarioPrueba';
    
    // Test data
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

        // --- LOGIN ---
        console.log('--- Iniciando Sesión como Admin ---');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });

        // --- CREATE USER ---
        console.log('--- Fase 1: Creación de Usuario ---');
        await adminUsers.goto();
        await adminUsers.createUser(originalName, firstName, lastName, username, password);
        
        // Assert the user exists in the table
        await adminUsers.verifyUserExists(originalName);
        console.log(`Usuario creado exitosamente: ${originalName}`);

        // --- DELETE USER ---
        console.log('--- Fase 2: Eliminación de Usuario ---');
        // Delete the user
        await adminUsers.deleteUser(originalName);
        
        // Assert the user is completely gone
        await adminUsers.verifyUserNotExists(originalName);
        console.log(`Usuario eliminado exitosamente: ${originalName}`);

        console.log('--- TEST COMPLETADO CON ÉXITO ---');
    });

    test('Should execute user creation, edit, and deletion', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const adminUsers = new AdminUsersPage(page);

        const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
        const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';

        // --- LOGIN ---
        console.log('--- Iniciando Sesión como Admin (Test 2) ---');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });

        // --- CREATE USER ---
        console.log('--- Fase 1: Creación de Usuario ---');
        await adminUsers.goto();
        
        // We'll use a slightly different username for this second test to be perfectly safe
        const altUsername = `edit.${username}`;
        await adminUsers.createUser(originalName, firstName, lastName, altUsername, password);
        
        await adminUsers.verifyUserExists(originalName);
        console.log(`Usuario creado exitosamente: ${originalName}`);

        // --- EDIT USER ---
        console.log('--- Fase 2: Edición de Usuario ---');
        await adminUsers.editUser(originalName, editedName);
        
        // Assert the new name exists and the old one is gone
        await adminUsers.verifyUserExists(editedName);
        await adminUsers.verifyUserNotExists(originalName);
        console.log(`Usuario editado exitosamente a: ${editedName}`);

        // --- DELETE USER ---
        console.log('--- Fase 3: Eliminación de Usuario ---');
        await adminUsers.deleteUser(editedName);
        
        await adminUsers.verifyUserNotExists(editedName);
        console.log(`Usuario eliminado exitosamente: ${editedName}`);

        console.log('--- TEST DE EDICIÓN COMPLETADO CON ÉXITO ---');
    });
});
