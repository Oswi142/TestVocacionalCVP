import { test, expect } from '@playwright/test';
import LoginPage from './testPages/LoginPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Automated Test Submission - Introducción', () => {
    test.setTimeout(120000);

    test('Fill out test dynamically', async ({ page }) => {
        console.log('Iniciando test automatizado de Introducción...');
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        const username = process.env.CLIENT_USERNAME || '';
        const password = process.env.CLIENT_PASSWORD || '';

        console.log(`Iniciando sesión con el usuario: ${username}`);
        await loginPage.login(username, password);

        await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });
        console.log('Sesión iniciada correctamente. Dashboard cargado.');

        console.log('Navegando hacia /introduccion...');
        await page.goto('http://localhost:5173/introduccion');
        await page.waitForTimeout(3000);

        // 1. Género (Select)
        console.log('Llenando Género...');
        const generoSelect = page.locator('div[role="combobox"]').first();
        if (await generoSelect.isVisible()) {
            await generoSelect.click();
            await page.waitForTimeout(500);
            await page.locator('li[role="option"]:has-text("Masculino")').click();
        }

        // 2. Fecha de Nacimiento (Mediante clic al calendario en lugar de escritura directa)
        console.log('Llenando Fecha de Nacimiento mediante calendario...');
        const calendarIcon = page.locator('svg[data-testid="CalendarIcon"]').first();
        if (await calendarIcon.isVisible()) {
            await calendarIcon.click();
            await page.waitForTimeout(500);
            // Hacer clic en cualquier día visible para asignarlo en el estado DayJs nativo de MUI
            const unDia = page.locator('button[role="gridcell"]:has-text("15")').first();
            if (await unDia.isVisible()) {
                await unDia.click();
            } else {
                // Alternativa si el 15 no es visible, click al centro aproximado del grid
                const anyDay = page.locator('button[role="gridcell"]').nth(15);
                await anyDay.click();
            }
            await page.waitForTimeout(500); // Dar tiempo al popup de cerrarse o a que la UI respire
            // Cerramos manualmente si sigue abierto
            await page.keyboard.press('Escape');
        }

        // 3. Llenar todos los inputs y textareas restantes iterando libremente
        console.log('Llenando campos de texto directamente...');
        const inputs = page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):visible, textarea:visible');
        await page.waitForTimeout(1000);

        const count = await inputs.count();
        console.log(`Se encontraron ${count} campos de texto.`);

        for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);

            const placeholder = await input.getAttribute('placeholder') || '';
            const ariaLabel = await input.getAttribute('aria-label') || '';
            const id = await input.getAttribute('id') || '';
            const allIdentifiers = `${placeholder} ${ariaLabel} ${id}`.toLowerCase();

            let typeval = '';
            if (allIdentifiers.includes('yyyy') || allIdentifiers.includes('fecha')) {
                // Ya se llenó usando el botón de calendario nativo
                continue;
            } else if (allIdentifiers.includes('departamento') || allIdentifiers.includes('ciudad')) {
                typeval = 'Cochabamba';
            } else if (allIdentifiers.includes('colegio')) {
                typeval = 'Colegio San Agustín';
            } else if (allIdentifiers.includes('curso') || allIdentifiers.includes('secundaria')) {
                typeval = '6to de secundaria';
            } else {
                const val = await input.inputValue();
                if (!val || val.trim() === '') {
                    typeval = 'Respuesta Playwright ' + i;
                }
            }

            if (typeval !== '') {
                await input.focus();
                await page.keyboard.press('Control+A');
                await page.keyboard.press('Backspace');

                await input.fill(typeval);
                await input.press('Enter');
                await page.keyboard.press('Tab');
            }
        }

        console.log('Esperando un momento antes de enviar...');
        await page.waitForTimeout(2000);

        console.log('Verificando habilitación de botón...');
        const submitButton = page.locator('button:has(svg[data-testid="CheckIcon"])').first();

        await expect(submitButton).toBeEnabled({ timeout: 5000 });

        console.log('Presionando el botón finalizar...');
        await submitButton.click();

        console.log('Esperando cuadro de diálogo de confirmación...');
        const confirmButton = page.locator('button', { hasText: /Confirmar/i }).first();
        await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
        await confirmButton.click();
        console.log('Confirmado exitosamente.');

        // Verificación final
        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
        console.log('Éxito completo. El test regresó exitosamente al panel Cliente.');
    });
});
