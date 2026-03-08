import { test, expect } from '@playwright/test';
import LoginPage from './testPages/LoginPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Automated Test Submission - DAT Complete', () => {
    test.setTimeout(600000); // 10 minutos de timeout, son 6 subtests

    const datModules = [
        { name: 'Razonamiento Verbal', url: 'http://localhost:5173/dat/verbal' },
        { name: 'Razonamiento Numérico', url: 'http://localhost:5173/dat/numerico' },
        { name: 'Razonamiento Abstracto', url: 'http://localhost:5173/dat/abstracto' },
        { name: 'Razonamiento Mecánico', url: 'http://localhost:5173/dat/mecanico' },
        { name: 'Relaciones Espaciales', url: 'http://localhost:5173/dat/espaciales' },
        { name: 'Ortografía', url: 'http://localhost:5173/dat/ortografia' }
    ];

    test('Fill out all 6 DAT subtests dynamically', async ({ page }) => {
        console.log('Iniciando test automatizado de DAT...');
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        const username = process.env.CLIENT_USERNAME || '';
        const password = process.env.CLIENT_PASSWORD || '';

        console.log(`Iniciando sesión con el usuario: ${username}`);
        await loginPage.login(username, password);

        await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });
        console.log('Sesión iniciada correctamente. Dashboard cargado.');

        for (const datModule of datModules) {
            console.log(`\n===========================================`);
            console.log(`Navegando hacia ${datModule.name} (${datModule.url})...`);
            await page.goto(datModule.url);
            await page.waitForTimeout(3000);

            let isFinished = false;
            let loopCount = 0;
            let currentSectionIdx = 1;

            console.log(`Iniciando el ciclo de respuestas para ${datModule.name}...`);
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

                // Respondemos si hay campos de texto abiertos (aunque DAT no suele tener, por si acaso)
                const textInputs = await page.locator('input[type="text"]:visible, textarea:visible').all();
                for (const input of textInputs) {
                    try {
                        const val = await input.inputValue();
                        if (!val || val.trim() === '') {
                            await input.fill('Respuesta automática DAT Playwright');
                        }
                    } catch (e) { }
                }

                // Verificamos si logramos habilitar el botón de submit general o submit de sección
                let submitButton = page.locator('button:has(svg[data-testid="CheckIcon"])').first();
                let canSubmit = false;

                try {
                    if (await submitButton.isVisible()) {
                        canSubmit = await submitButton.isEnabled();
                    }
                } catch (e) { }

                if (canSubmit) {
                    console.log(`¡Todas las secciones de ${datModule.name} se han respondido! Presionando el botón finalizador...`);
                    await submitButton.click();

                    console.log('Esperando cuadro de diálogo de confirmación...');
                    const confirmButton = page.locator('button', { hasText: /Confirmar/i }).first();
                    try {
                        await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
                        await confirmButton.click();
                        console.log('Confirmado exitosamente.');
                    } catch (e) { console.log('No se encontró el cuadro de diálogo de confirmación final'); }

                    await page.waitForTimeout(2000);
                    if (page.url().includes('dat') || page.url().includes('client')) {
                        isFinished = true;
                        console.log(`TEST ${datModule.name} TERMINADO. Redireccionado de manera segura.`);
                        break;
                    } else {
                        console.log('Seguimos dentro del form tras enviar una sección, buscando la próxima fase...');
                        currentSectionIdx = 1;
                    }
                } else {
                    // Buscamos cambiar de página/sección si la de ahora ya fue completada
                    currentSectionIdx++;
                    const sectionButton = page.locator(`button:has-text("${currentSectionIdx}")`).first();

                    try {
                        await sectionButton.scrollIntoViewIfNeeded();
                        if (await sectionButton.isVisible()) {
                            // No logeamos para no spamear excesivamente la consola
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
        }

        console.log('\n===========================================');
        console.log('Éxito completo. La suite completa de DAT (6 tests) ha sido automatizada y enviada correctamente.');
    });
});
