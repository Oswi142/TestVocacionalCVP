import { Page } from '@playwright/test';

/**
 * Shared helper: fills all visible radio groups and visible text inputs on the current screen.
 * Returns true only if ALL visible inputs ended up filled (allFilled gate).
 */
async function fillVisibleInputs(page: Page, textFillValue: string): Promise<boolean> {
    const groups = await page.locator('div[role="radiogroup"]').all();
    for (const group of groups) {
        if (await group.isVisible()) {
            const firstRadio = group.locator('input[type="radio"]').first();
            try {
                if (await firstRadio.isVisible() && !(await firstRadio.isChecked())) {
                    await firstRadio.check({ force: true });
                    await page.waitForTimeout(200);
                }
            } catch (e) { }
        }
    }

    const textInputs = await page.locator('input[type="text"]:visible, textarea:visible').all();
    for (const input of textInputs) {
        try {
            const val = await input.inputValue();
            if (!val || val.trim() === '') {
                await input.fill(textFillValue);
                await page.waitForTimeout(200);
            }
        } catch (e) { }
    }

    // Verify all visible text inputs are now filled
    let allFilled = true;
    const textCheck = await page.locator('input[type="text"]:visible, textarea:visible').all();
    for (const input of textCheck) {
        try {
            const val = await input.inputValue();
            if (!val || val.trim() === '') { allFilled = false; break; }
        } catch (e) { }
    }

    // Verify all visible radio groups have a selection
    if (allFilled) {
        const groupsCheck = await page.locator('div[role="radiogroup"]').all();
        for (const group of groupsCheck) {
            try {
                if (await group.isVisible()) {
                    const checked = group.locator('input[type="radio"]:checked');
                    if (await checked.count() === 0) { allFilled = false; break; }
                }
            } catch (e) { }
        }
    }

    return allFilled;
}

/**
 * Runs the main fill + paginate loop for any paginated test (CHASIDE, MACI, IPPR, DAT).
 * Only advances to the next section if allFilled is true — no section skipping.
 */
export async function runPaginatedTest(page: Page, textFillValue: string, loopMax = 100): Promise<void> {
    let isFinished = false;
    let loopCount = 0;
    let currentSectionIdx = 1;

    while (!isFinished && loopCount < loopMax) {
        loopCount++;

        const allFilled = await fillVisibleInputs(page, textFillValue);

        if (!allFilled) {
            // Not all filled — wait and retry without advancing the index
            await page.waitForTimeout(500);
            continue;
        }

        // Check for submit (CheckIcon) button
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
            if (page.url().includes('client') || page.url().includes('dat')) {
                isFinished = true;
                break;
            } else {
                currentSectionIdx = 1;
            }
        } else {
            // Move to next section only after allFilled is confirmed
            currentSectionIdx++;
            const sectionButton = page.locator(`button:has-text("${currentSectionIdx}")`).first();
            try {
                await sectionButton.scrollIntoViewIfNeeded();
                if (await sectionButton.isVisible()) {
                    await sectionButton.click();
                    await page.waitForTimeout(800);
                } else {
                    if (loopCount > 40) break;
                }
            } catch (e) { }
        }
    }
}
