import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminReportsPage from '../pages/AdminReportsPage';
import AdminAnswersPage from '../pages/AdminAnswersPage';
import ClientDashboardPage from '../pages/ClientDashboardPage';
import IntroduccionPage from '../pages/IntroduccionPage';
import EntrevistaPage from '../pages/EntrevistaPage';
import IpprPage from '../pages/IpprPage';
import ChasidePage from '../pages/ChasidePage';
import MaciPage from '../pages/MaciPage';
import DatPage from '../pages/DatPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Automated System Lifecycle - E2E', () => {
    // Set timeout to 30 minutes (1800s) for headed mode
    test.setTimeout(1800000); 

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomSuffix = Array.from({ length: 6 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
    
    const clientName = `Auto Test User ${randomSuffix}`;
    const clientFirstName = `Automated${randomSuffix}`;
    const clientLastName = `Testing${randomSuffix}`;
    // Usernames usually allow numbers, but let's keep it safe or use letters too
    const clientUser = `auto.client.${randomSuffix.toLowerCase()}`;
    const clientPass = 'Pass123!Test';

    test('Should execute the complete lifecycle from account creation to report verification', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const adminDashboard = new AdminDashboardPage(page);
        const adminUsers = new AdminUsersPage(page);
        const adminReports = new AdminReportsPage(page);
        const clientDashboard = new ClientDashboardPage(page);

        const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
        const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';

        // --- STEP 1: ADMIN LOGIN & CLIENT CREATION ---
        console.log('--- Iniciando Fase 1: Creación de Cliente por Admin ---');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/);

        await adminUsers.goto();
        await adminUsers.createUser(clientName, clientFirstName, clientLastName, clientUser, clientPass);
        
        await adminDashboard.goto(); // Go back to dashboard to logout
        await adminDashboard.logout();
        console.log(`Cliente creado: ${clientUser}`);

        // --- STEP 2: CLIENT LOGIN & TEST COMPLETION ---
        console.log('--- Iniciando Fase 2: Llenado de pruebas por el Cliente ---');
        await loginPage.login(clientUser, clientPass);
        await expect(page).toHaveURL(/.*\/client/);

        // A. Introducción
        console.log('Llenando Introducción...');
        const introPage = new IntroduccionPage(page);
        await clientDashboard.startTest('INTRODUCCIÓN');
        await introPage.fillOutForm();
        await introPage.submit();
        console.log('Introducción completada.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        // B. Entrevista
        console.log('Llenando Entrevista...');
        const entrevistaPage = new EntrevistaPage(page);
        await clientDashboard.startTest('ENTREVISTA');
        await entrevistaPage.fillOutTest(); // Note: Entrevista uses fillOutTest
        console.log('Entrevista completado.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        // C. IPPR
        console.log('Llenando IPPR...');
        const ipprPage = new IpprPage(page);
        await clientDashboard.startTest('IPPR');
        await ipprPage.fillOutTest();
        console.log('IPPR completado.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        // D. CHASIDE
        console.log('Llenando CHASIDE...');
        const chasidePage = new ChasidePage(page);
        await clientDashboard.startTest('CHASIDE');
        await chasidePage.fillOutTest();
        console.log('CHASIDE completado.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        // E. MACI
        console.log('Llenando MACI...');
        const maciPage = new MaciPage(page);
        await clientDashboard.startTest('MACI');
        await maciPage.fillOutTest();
        console.log('MACI completado.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        // F. DAT
        console.log('Llenando DAT (Subtests)...');
        const datPage = new DatPage(page);
        await clientDashboard.startTest('DAT');
        await datPage.fillAllSubtests();
        
        // Return to client dashboard explicitly after all DAT modules
        await page.goto('http://localhost:5173/client');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        await clientDashboard.logout();
        console.log('Pruebas completadas y cierre de sesión de cliente exitoso.');
        
        // Clear everything to ensure a fresh login screen
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.waitForTimeout(2000); 

        // --- STEP 3: ADMIN VERIFICATION ---
        console.log('--- Iniciando Fase 3: Verificación de Reportes por Admin ---');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });
        
        // A. Verify Reports
        console.log('Verificando sección de Reportes...');
        await adminReports.goto();
        await adminReports.verifyClientResults(clientName, [
            'ippr', 'chaside', 'maci', 'dat'
        ]);

        // B. Verify Answers
        console.log('Verificando sección de Respuestas...');
        const adminAnswers = new AdminAnswersPage(page);
        await adminAnswers.goto();
        await adminAnswers.verifyClientAnswers(clientName, [
            'entrevista', 'ippr', 'chaside', 'maci', 'dat'
        ]);

        console.log('--- E2E FLOW FINALIZADO CON ÉXITO ---');
    });
});
