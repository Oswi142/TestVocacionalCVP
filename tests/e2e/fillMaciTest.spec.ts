import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import MaciPage from '../pages/MaciPage';
import dotenv from 'dotenv';
import maciTestData from '../data/maci_answers.json' assert { type: 'json' };

dotenv.config();

test.describe('Automated Test Submission - MACI (DDT)', () => {
    test.setTimeout(180000);

    for (const testCase of maciTestData.testCases) {
        test(`Fill out test dynamically to match: ${testCase.name}`, async ({ page }) => {
            const loginPage = new LoginPage(page);
            const testPage = new MaciPage(page);

            await loginPage.goto();
            await loginPage.login(
                process.env.CLIENT_USERNAME || '',
                process.env.CLIENT_PASSWORD || ''
            );
            await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });

            await testPage.goto();

            let isFinished = false;
            let loopCount = 0;
            let currentSectionIdx = 1;
            let answeredCount = 0;

            while (!isFinished && loopCount < 100) {
                loopCount++;
                await page.waitForTimeout(500);

                // Fetch all visible radio groups on the current page
                const groups = await page.locator('div[role="radiogroup"]:visible').all();
                for (let i = 0; i < groups.length; i++) {
                    // Check if the current group is already answered
                    const isChecked = await groups[i].locator('input:checked').count() > 0;
                    if (!isChecked) {
                        // Get expected answer for this question index from DDT JSON
                        const expectedAnswer = testCase.answers[answeredCount];
                        // In MACI, true -> Verdadero, false -> Falso
                        const labelRegex = expectedAnswer ? /^Verdadero$/i : /^Falso$/i;

                        // Find and click the specific label
                        const targetLabel = groups[i].locator('label').filter({ hasText: labelRegex }).first();
                        if (await targetLabel.count() > 0) {
                            await targetLabel.click({ force: true });
                            await page.waitForTimeout(50); // slight delay for state to update
                        } else {
                            // Fallback just in case labels are different
                            const fallbackLabel = groups[i].locator('input[type="radio"]').nth(expectedAnswer ? 0 : 1);
                            await fallbackLabel.click({ force: true });
                        }
                        answeredCount++;
                    }
                }

                await page.waitForTimeout(500);

                const submitButton = page.locator('button:has(svg[data-testid="CheckIcon"])').first();
                let canSubmit = false;
                try {
                    if (await submitButton.isVisible()) canSubmit = await submitButton.isEnabled();
                } catch (e) { }

                if (canSubmit) {
                    await submitButton.click();
                    const confirmButton = page.locator('button', { hasText: /Confirmar/i }).first();
                    try {
                        await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
                        await confirmButton.click();
                    } catch (e) { }

                    await page.waitForTimeout(2000);
                    if (page.url().includes('client') || page.url().includes('dashboard')) {
                        isFinished = true;
                        break;
                    } else {
                        currentSectionIdx = 1;
                    }
                } else {
                    currentSectionIdx++;
                    const sectionButton = page.locator(`button:has-text("${currentSectionIdx}")`).first();
                    try {
                        await sectionButton.scrollIntoViewIfNeeded();
                        if (await sectionButton.isVisible()) {
                            await sectionButton.click();
                            await page.waitForTimeout(500);
                        } else {
                            if (loopCount > 40) break;
                        }
                    } catch (e) { }
                }
            }

            await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
            console.log(`Éxito. MACI completado ("${testCase.name}").`);
        });
    }
});
