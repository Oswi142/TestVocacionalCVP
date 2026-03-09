import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import IpprPage from '../pages/IpprPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Automated Test Submission - IPPR', () => {
    test.setTimeout(180000);

    test('Fill out test dynamically', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const testPage = new IpprPage(page);

        await loginPage.goto();
        await loginPage.login(
            process.env.CLIENT_USERNAME || '',
            process.env.CLIENT_PASSWORD || ''
        );
        await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });

        await testPage.goto();
        await testPage.fillOutTest();

        await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
        console.log('Éxito. IPPR completado.');
    });
});
