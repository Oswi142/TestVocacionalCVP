import { test, expect } from '@playwright/test';
import LoginPage from './testPages/LoginPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Automated Test Submission - IPPR', () => {
    test.setTimeout(180000); // 3 minutos de timeout para IPPR que podría ser más largo

    test('Fill out test dynamically', async ({ page }) => {
        console.log('Iniciando test automatizado de IPPR...');
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        const username = process.env.CLIENT_USERNAME || '';
        const password = process.env.CLIENT_PASSWORD || '';

        console.log(`Iniciando sesión con el usuario: ${username}`);
        await loginPage.login(username, password);

        await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });
        console.log('Sesión iniciada correctamente. Dashboard cargado.');

        console.log('Navegando hacia /ippr...');
        await page.goto('http://localhost:5173/ippr');
        await page.waitForTimeout(3000);

        let isFinished = false;
        let loopCount = 0;
        let currentSectionIdx = 1;

        console.log('Iniciando el ciclo de escaneo y respuestas para IPPR...');
        while (!isFinished && loopCount < 100) {
            loopCount++;
            await page.waitForTimeout(500);

            // Respondemos las preguntas con radio buttons
            const radioGroups = await page.locator('div[role="radiogroup"], .MuiRadio-root').all();
            if (radioGroups.length > 0) {
                const groups = await page.locator('div[role="radiogroup"]').all();
                for (const group of groups) {
                    if (await group.isVisible()) {
                        const firstRadio = group.locator('input[type="radio"]').first();
                        try {
                            if (await firstRadio.isVisible() && !(await firstRadio.isChecked())) {
                                await firstRadio.check({ force: true });
                            }
                        } catch (e) { }
                    }
                }
            }

            // Respondemos si hay campos de texto abiertos en IPPR
            const textInputs = await page.locator('input[type="text"]:visible, textarea:visible').all();
            for (const input of textInputs) {
                try {
                    const val = await input.inputValue();
                    if (!val || val.trim() === '') {
                        await input.fill('Respuesta automática IPPR Playwright');
                    }
                } catch (e) { }
            }

            // Verificamos si logramos habilitar el botón de submit general o submit de sección
            const submitButton = page.locator('button:has(svg[data-testid="CheckIcon"])').first();
            let canSubmit = false;

            try {
                if (await submitButton.isVisible()) {
                    canSubmit = await submitButton.isEnabled();
                }
            } catch (e) { }

            if (canSubmit) {
                console.log('¡Todas las secciones se han respondido! Presionando el botón finalizador...');
                await submitButton.click();

                console.log('Esperando cuadro de diálogo de confirmación...');
                const confirmButton = page.locator('button', { hasText: /Confirmar/i }).first();
                try {
                    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
                    await confirmButton.click();
                    console.log('Confirmado exitosamente.');
                } catch (e) { console.log('No se encontró el cuadro de diálogo de confirmación final'); }

                await page.waitForTimeout(2000);
                if (page.url().includes('client')) {
                    isFinished = true;
                    console.log('Redireccionado al inicio. TEST IPPR TERMINADO.');
                    break;
                } else {
                    console.log('Seguimos dentro del form tras enviar una sección, buscando la próxima fase...');
                    // reseteamos index a 1 en caso de que cambie el DOM de secciones
                    currentSectionIdx = 1;
                }
            } else {
                // Buscamos cambiar de página/sección si la de ahora ya fue completada
                currentSectionIdx++;
                const sectionButton = page.locator(`button:has-text("${currentSectionIdx}")`).first();

                try {
                    if (await sectionButton.isVisible()) {
                        console.log(`Cambiando a la sección nro ${currentSectionIdx}`);
                        await sectionButton.click();
                        await page.waitForTimeout(500);
                    } else {
                        if (loopCount > 30) {
                            console.log('Alcanzado número límite de iteraciones sin encontrar más secciones.');
                            break;
                        }
                    }
                } catch (e) { }
            }
        }

        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
        console.log('Éxito completo. El test de IPPR regresó exitosamente al panel Cliente.');
    });
});
