import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import DatPage from '../pages/DatPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Automated Test Submission - DAT Complete', () => {
    test.setTimeout(600000); // 10 min for all 6 subtests

    test('Fill out all 6 DAT subtests dynamically', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const datPage = new DatPage(page);

        await loginPage.goto();
        await loginPage.login(
            process.env.CLIENT_USERNAME || '',
            process.env.CLIENT_PASSWORD || ''
        );
        await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });

        await datPage.fillAllSubtests();

        console.log('Éxito. Suite completa de DAT (6 subtests) terminada.');
    });
});
