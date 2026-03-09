import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import EntrevistaPage from '../pages/EntrevistaPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Automated Test Submission - Entrevista', () => {
    test.setTimeout(120000);

    test('Fill out test dynamically', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const entrevistaPage = new EntrevistaPage(page);

        await loginPage.goto();
        await loginPage.login(
            process.env.CLIENT_USERNAME || '',
            process.env.CLIENT_PASSWORD || ''
        );
        await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });

        await entrevistaPage.goto();
        await entrevistaPage.fillOutTest();

        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
        console.log('Éxito. Entrevista completada.');
    });
});
