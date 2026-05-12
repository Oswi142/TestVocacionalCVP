import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import ClientDashboardPage from '../pages/ClientDashboardPage';
import IntroduccionPage from '../pages/IntroduccionPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Route Protection & RBAC - E2E', () => {
    test.setTimeout(120000); 

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomSuffix = Array.from({ length: 4 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
    
    const clientName = `RBAC Test User ${randomSuffix}`;
    const clientFirstName = `RBAC${randomSuffix}`;
    const clientLastName = `Protect${randomSuffix}`;
    const clientUser = `rbac.client.${randomSuffix.toLowerCase()}`;
    const clientPass = 'Pass123!Test';

    test('Should prevent access to tests if prerequisites are not met', async ({ page, baseURL }) => {
        const loginPage = new LoginPage(page);
        const adminDashboard = new AdminDashboardPage(page);
        const adminUsers = new AdminUsersPage(page);
        const clientDashboard = new ClientDashboardPage(page);

        const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
        const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';
        const host = baseURL || 'http://localhost:5173';

        console.log('Creando usuario de prueba para RBAC...');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });
        await adminUsers.goto();
        await adminUsers.createUser(clientName, clientFirstName, clientLastName, clientUser, clientPass);
        await adminDashboard.goto();
        await adminDashboard.logout();
        await expect(page).toHaveURL(new RegExp(host + '/?$'), { timeout: 10000 });

        console.log('Logueando con el cliente nuevo...');
        await loginPage.login(clientUser, clientPass);
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
        console.log('Intentando acceder a tests bloqueados (sin Introducción)...');
        
        const testRoutes = ['/entrevista', '/ippr', '/chaside', '/maci', '/dat/verbal'];
        for (const route of testRoutes) {
            await page.goto(`${host}${route}`);
            await page.waitForTimeout(1000);
            const currentUrl = page.url();
            expect(currentUrl).not.toContain(route);
            console.log(`Bloqueo correcto en ${route}. Redirigido a: ${new URL(currentUrl).pathname}`);
        }

        console.log('Completando Introducción para desbloquear Entrevista...');
        const introPage = new IntroduccionPage(page);
        await page.goto(`${host}/introduccion`);
        await introPage.fillOutForm();
        await introPage.submit();
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        console.log('Intentando acceder a tests posteriores a Entrevista...');
        const lockedRoutes = ['/ippr', '/chaside', '/maci', '/dat/verbal'];
        for (const route of lockedRoutes) {
            await page.goto(`${host}${route}`);
            await page.waitForTimeout(1000); 
            const currentUrl = page.url();
            expect(currentUrl).not.toContain(route);
            expect(currentUrl).toContain('/client');
            console.log(`Bloqueo correcto en ${route}. Redirigido a: /client`);
        }

        console.log('Verificando acceso permitido a Entrevista...');
        await page.goto(`${host}/entrevista`);
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('/entrevista');
        console.log('Acceso permitido a /entrevista');

        await clientDashboard.goto();
        await clientDashboard.logout();
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.waitForTimeout(1000);

        console.log('Limpiando usuario de prueba...');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });
        await adminUsers.goto();
        await adminUsers.deleteUser(clientName);
        await adminUsers.verifyUserNotExists(clientName);

        console.log('--- TEST RBAC FINALIZADO CON ÉXITO ---');
    });
});
