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

        // --- STEP 1: ADMIN CREATES A CLEAN CLIENT ---
        console.log('Creando usuario de prueba para RBAC...');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 }); // CRITICAL WAIT
        await adminUsers.goto();
        await adminUsers.createUser(clientName, clientFirstName, clientLastName, clientUser, clientPass);
        await adminDashboard.goto();
        await adminDashboard.logout();
        await expect(page).toHaveURL(new RegExp(host + '/?$'), { timeout: 10000 });

        // --- STEP 2: CLIENT LOGIN ---
        console.log('Logueando con el cliente nuevo...');
        await loginPage.login(clientUser, clientPass);
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        // --- STEP 3: ATTEMPT UNAUTHORIZED ACCESS (NO INTRO COMPLETED) ---
        console.log('Intentando acceder a tests bloqueados (sin Introducción)...');
        
        const testRoutes = ['/entrevista', '/ippr', '/chaside', '/maci', '/dat/verbal'];
        for (const route of testRoutes) {
            await page.goto(`${host}${route}`);
            // App logic: if no intro, it usually redirects to /introduccion
            // Let's just verify it DOES NOT stay on the test route
            await page.waitForTimeout(1000); // Give React Router time to process
            const currentUrl = page.url();
            expect(currentUrl).not.toContain(route);
            console.log(`Bloqueo correcto en ${route}. Redirigido a: ${new URL(currentUrl).pathname}`);
        }

        // --- STEP 4: COMPLETE INTRODUCCIÓN ---
        console.log('Completando Introducción para desbloquear Entrevista...');
        const introPage = new IntroduccionPage(page);
        await page.goto(`${host}/introduccion`);
        await introPage.fillOutForm();
        await introPage.submit();
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        // --- STEP 5: ATTEMPT UNAUTHORIZED ACCESS (ONLY INTRO COMPLETED) ---
        console.log('Intentando acceder a tests posteriores a Entrevista...');
        const lockedRoutes = ['/ippr', '/chaside', '/maci', '/dat/verbal'];
        for (const route of lockedRoutes) {
            await page.goto(`${host}${route}`);
            // App logic: if previous test not complete, redirects to /client
            await page.waitForTimeout(1000); 
            const currentUrl = page.url();
            expect(currentUrl).not.toContain(route);
            expect(currentUrl).toContain('/client');
            console.log(`Bloqueo correcto en ${route}. Redirigido a: /client`);
        }

        // --- STEP 6: VERIFY AUTHORIZED ACCESS (ENTREVISTA) ---
        console.log('Verificando acceso permitido a Entrevista...');
        await page.goto(`${host}/entrevista`);
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('/entrevista');
        console.log('Acceso permitido a /entrevista');

        // Cleanup: logout
        await clientDashboard.goto();
        await clientDashboard.logout();
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.waitForTimeout(1000);

        // --- STEP 7: ADMIN DELETES USER ---
        console.log('Limpiando usuario de prueba...');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 }); // CRITICAL WAIT
        await adminUsers.goto();
        await adminUsers.deleteUser(clientName);
        await adminUsers.verifyUserNotExists(clientName);

        console.log('--- TEST RBAC FINALIZADO CON ÉXITO ---');
    });
});
