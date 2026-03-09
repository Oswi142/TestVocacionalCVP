import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import IntroduccionPage from '../pages/IntroduccionPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Automated Test Submission - Introducción', () => {
    test.setTimeout(120000);

    test('Fill out test dynamically', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const testPage = new IntroduccionPage(page);

        await loginPage.goto();
        await loginPage.login(
            process.env.CLIENT_USERNAME || '',
            process.env.CLIENT_PASSWORD || ''
        );
        await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });

        await testPage.goto();
        await testPage.fillOutForm();
        await testPage.submit();

        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
        console.log('Éxito. Introducción completada.');
    });
});
