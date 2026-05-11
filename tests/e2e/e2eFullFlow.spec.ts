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
    test.setTimeout(1800000); 

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomSuffix = Array.from({ length: 6 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
    
    const clientName = `Auto Test User ${randomSuffix}`;
    const clientFirstName = `Automated${randomSuffix}`;
    const clientLastName = `Testing${randomSuffix}`;
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

        console.log('--- Iniciando Fase 1: Creación de Cliente por Admin ---');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/);

        await adminUsers.goto();
        await adminUsers.createUser(clientName, clientFirstName, clientLastName, clientUser, clientPass);
        
        await adminDashboard.goto();
        await adminDashboard.logout();
        console.log(`Cliente creado: ${clientUser}`);

        console.log('--- Iniciando Fase 2: Llenado de pruebas por el Cliente ---');
        await loginPage.login(clientUser, clientPass);
        await expect(page).toHaveURL(/.*\/client/);

        console.log('Llenando Introducción...');
        const introPage = new IntroduccionPage(page);
        await clientDashboard.startTest('INTRODUCCIÓN');
        await introPage.fillOutForm();
        await introPage.submit();
        console.log('Introducción completada.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        console.log('Llenando Entrevista...');
        const entrevistaPage = new EntrevistaPage(page);
        await clientDashboard.startTest('ENTREVISTA');
        await entrevistaPage.fillOutTest();
        console.log('Entrevista completado.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        console.log('Llenando IPPR...');
        const ipprPage = new IpprPage(page);
        await clientDashboard.startTest('IPPR');
        await ipprPage.fillOutTest();
        console.log('IPPR completado.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        console.log('Llenando CHASIDE...');
        const chasidePage = new ChasidePage(page);
        await clientDashboard.startTest('CHASIDE');
        await chasidePage.fillOutTest();
        console.log('CHASIDE completado.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        console.log('Llenando MACI...');
        const maciPage = new MaciPage(page);
        await clientDashboard.startTest('MACI');
        await maciPage.fillOutTest();
        console.log('MACI completado.');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        console.log('Llenando DAT (Subtests)...');
        const datPage = new DatPage(page);
        await clientDashboard.startTest('DAT');
        await datPage.fillAllSubtests();
        
        await page.goto('http://localhost:5173/client');
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

        await clientDashboard.logout();
        console.log('Pruebas completadas y cierre de sesión de cliente exitoso.');
        
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.waitForTimeout(2000); 

        console.log('--- Iniciando Fase 3: Verificación de Reportes por Admin ---');
        await loginPage.goto();
        await loginPage.login(ADMIN_USER, ADMIN_PASS);
        await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });
        
        console.log('Verificando sección de Reportes...');
        await adminReports.goto();
        await adminReports.verifyClientResults(clientName, [
            'ippr', 'chaside', 'maci', 'dat'
        ]);

        console.log('Verificando sección de Respuestas...');
        const adminAnswers = new AdminAnswersPage(page);
        await adminAnswers.goto();
        await adminAnswers.verifyClientAnswers(clientName, [
            'entrevista', 'ippr', 'chaside', 'maci', 'dat'
        ]);

        console.log('Fase final: Eliminación del usuario de prueba...');
        await adminUsers.goto();
        await adminUsers.deleteUser(clientName);
        await adminUsers.verifyUserNotExists(clientName);

        console.log('--- E2E FLOW FINALIZADO CON ÉXITO Y USUARIO ELIMINADO ---');
    });
});
