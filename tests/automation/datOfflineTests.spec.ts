import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('DAT Offline Protection Tests', () => {

    test('Offline pause and reconnect flow in DAT', async ({ page, context }) => {
        const loginPage = new LoginPage(page);

        // Interceptar consultas de progreso de Supabase para simular que todos los tests previos están completados
        await page.route('**/rest/v1/test_answers*', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { test_id: 1, question_id: 1001 },
                        { test_id: 2, question_id: 2001 },
                        { test_id: 3, question_id: 3001 },
                        { test_id: 4, question_id: 4001 }
                    ])
                });
            } else {
                await route.continue();
            }
        });

        await page.route('**/rest/v1/clients_info*', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ user_id: 15 }) // ID simulado
                });
            } else {
                await route.continue();
            }
        });
        
        // 1. Iniciar sesión como cliente
        await loginPage.goto();
        await loginPage.login(process.env.CLIENT_USERNAME || 'client', process.env.CLIENT_PASSWORD || 'client');
        await expect(page).toHaveURL('http://localhost:5173/client');

        // 2. Navegar a la sección del test DAT
        await page.goto('http://localhost:5173/dat');
        await page.waitForSelector('text=Selecciona un apartado', { timeout: 15000 });

        // 3. Seleccionar e iniciar el primer subtest (Razonamiento Verbal)
        await page.click('button:has-text("Razonamiento Verbal")');
        await page.waitForSelector('text=¿Deseas comenzar', { timeout: 5000 });
        await page.click('button:has-text("Empezar")');

        // 4. Esperar a que cargue el cuestionario (esperar que cargue el primer radiogroup de preguntas)
        await page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });

        // 5. Simular desconexión a internet
        await context.setOffline(true);

        // 6. Verificar que aparece el diálogo de advertencia de conexión perdida
        const warningDialog = page.locator('text=Conexión Perdida');
        await expect(warningDialog).toBeVisible({ timeout: 5000 });
        
        const dialogText = page.locator('text=Para continuar con este test debes estar conectado a internet');
        await expect(dialogText).toBeVisible();

        // 7. Simular reconexión a internet
        await context.setOffline(false);

        // 8. Verificar que el diálogo de conexión perdida desaparece automáticamente
        await expect(warningDialog).not.toBeVisible({ timeout: 5000 });

        // 9. Volver a simular desconexión
        await context.setOffline(true);
        await expect(warningDialog).toBeVisible({ timeout: 5000 });

        // 10. Hacer clic en "Ir al Dashboard"
        const dashboardBtn = page.locator('button:has-text("Ir al Dashboard")');
        await dashboardBtn.click();

        // 11. Verificar la redirección al dashboard del cliente
        await expect(page).toHaveURL('http://localhost:5173/client', { timeout: 8000 });

        // Limpiar el estado offline al finalizar
        await context.setOffline(false);
    });

});
