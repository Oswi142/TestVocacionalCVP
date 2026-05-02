import { Page } from '@playwright/test';

async function fillVisibleInputs(page: Page, textFillValue: string): Promise<boolean> {
    const textInputs = await page.locator('input[type="text"]:not([disabled]), textarea:not([disabled])').all();
    for (const input of textInputs) {
        try {
            if (await input.isVisible() && (await input.inputValue()).trim() === '') {
                await input.fill(textFillValue);
            }
        } catch (e) { }
    }

    const groups = await page.locator('div[role="radiogroup"]').all();
    for (const group of groups) {
        try {
            if (await group.isVisible()) {
                const radio = group.locator('input[type="radio"]').first();
                if (await radio.isVisible() && !(await radio.isChecked())) {
                    await radio.check({ force: true });
                }
            }
        } catch (e) { }
    }

    let allFilled = true;
    for (const input of await page.locator('input[type="text"]:not([disabled]), textarea:not([disabled])').all()) {
        try {
            if (await input.isVisible() && (await input.inputValue()).trim() === '') allFilled = false;
        } catch (e) { }
    }
    for (const group of await page.locator('div[role="radiogroup"]').all()) {
        try {
            if (await group.isVisible() && (await group.locator('input[type="radio"]:checked').count()) === 0) allFilled = false;
        } catch (e) { }
    }
    return allFilled;
}

/**
 * Centered logic for running any test that has pagination (sections 1, 2, 3...)
 * and a final submit button with CheckIcon.
 * 
 * Works for IPPR, CHASIDE, MACI, and individual DAT modules.
 * Only advances to the next section if allFilled is true — no section skipping.
 */
export async function runPaginatedTest(page: Page, textFillValue: string, loopMax = 100): Promise<void> {
    await page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });
    let isFinished = false;
    let loopCount = 0;
    let currentSectionIdx = 1;

    while (!isFinished && loopCount < loopMax) {
        loopCount++;

        if (loopCount % 5 === 0) {
            console.log(`[E2E] Revisando sección ${currentSectionIdx} (Loop: ${loopCount})`);
        }

        const allFilled = await fillVisibleInputs(page, textFillValue);

        if (!allFilled) {
            await page.waitForTimeout(200);
            continue;
        }

        const submitButton = page.locator('button:has(svg[data-testid="CheckIcon"]), button:has-text("Finalizar")').first();
        let canSubmit = false;
        try {
            if (await submitButton.isVisible()) canSubmit = await submitButton.isEnabled();
        } catch (e) { }

            if (canSubmit) {
                await submitButton.click();
                const confirmButton = page.locator('button', { hasText: /Confirmar|Finalizar/i }).first();
                try {
                    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
                    await confirmButton.click();
                    
                    // CRITICAL FIX: Wait for the app to NATURALLY redirect after saving to Supabase.
                    // This ensures the next test (like MACI) will be fully unlocked.
                    await page.waitForURL(/\/(client|dat)/, { timeout: 20000 });
                    isFinished = true;
                    break;
                } catch (e) {
                    console.error("Error waiting for natural redirect:", e);
                }
            } else {
            currentSectionIdx++;
            const sectionButton = page.locator(`button[data-testid="section-btn-${currentSectionIdx}"]`).first();
            try {
                if (await sectionButton.isVisible()) {
                    await sectionButton.click();
                    await page.waitForTimeout(300);
                } else {
                    // Try to scroll tabs or find next section button better if needed
                    if (loopCount > 20) break; 
                }
            } catch (e) { }
        }
    }
}

/**
 * JSON-driven version of runPaginatedTest.
 * Uses an array of answers to pick specific radio buttons instead of always selecting the first.
 * - boolean true  → picks radio at index 0 (e.g. Sí / Verdadero)
 * - boolean false → picks radio at index 1 (e.g. No / Falso)
 * - number N      → picks radio at index N (for multi-option tests like DAT/IPPR)
 * If the answer array runs out, it cycles back to index 0.
 */
export async function runPaginatedTestFromJson(
    page: Page,
    answers: (boolean | number)[],
    textFillValue: string = 'Respuesta automatizada',
    loopMax = 100
): Promise<void> {
    await page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });

    let isFinished = false;
    let loopCount = 0;
    let currentSectionIdx = 1;
    let globalAnswerIdx = 0; // Tracks which answer in the JSON we are on

    while (!isFinished && loopCount < loopMax) {
        loopCount++;

        if (loopCount % 5 === 0) {
            console.log(`[E2E JSON] Revisando sección ${currentSectionIdx} (Loop: ${loopCount}, Respuesta: ${globalAnswerIdx}/${answers.length})`);
        }

        // Fill text inputs with the default text value
        const textInputs = await page.locator('input[type="text"]:not([disabled]), textarea:not([disabled])').all();
        for (const input of textInputs) {
            try {
                if (await input.isVisible() && (await input.inputValue()).trim() === '') {
                    await input.fill(textFillValue);
                    await page.waitForTimeout(100);
                }
            } catch (e) { }
        }

        // Fill radio groups using the JSON answers array
        const groups = await page.locator('div[role="radiogroup"]').all();
        for (const group of groups) {
            try {
                if (await group.isVisible()) {
                    const isChecked = (await group.locator('input[type="radio"]:checked').count()) > 0;
                    if (!isChecked) {
                        const radios = await group.locator('input[type="radio"]').all();
                        if (radios.length > 0) {
                            // Determine which radio to pick from the answers array
                            const answer = answers[globalAnswerIdx % answers.length];
                            let radioIndex = 0;
                            if (typeof answer === 'boolean') {
                                radioIndex = answer ? 0 : 1;
                            } else if (typeof answer === 'number') {
                                radioIndex = Math.min(answer, radios.length - 1);
                            }
                            await radios[radioIndex].check({ force: true });
                            globalAnswerIdx++;
                            // CRITICAL: Wait a bit to let React process the state update
                            await page.waitForTimeout(100);
                        }
                    }
                }
            } catch (e) { }
        }

        // Verify all visible inputs are filled
        let allFilled = true;
        for (const input of await page.locator('input[type="text"]:not([disabled]), textarea:not([disabled])').all()) {
            try {
                if (await input.isVisible() && (await input.inputValue()).trim() === '') { allFilled = false; break; }
            } catch (e) { }
        }
        for (const group of await page.locator('div[role="radiogroup"]').all()) {
            try {
                if (await group.isVisible() && (await group.locator('input[type="radio"]:checked').count()) === 0) { allFilled = false; break; }
            } catch (e) { }
        }

        if (!allFilled) {
            await page.waitForTimeout(300);
            continue;
        }

        const submitButton = page.locator('button:has(svg[data-testid="CheckIcon"]), button:has-text("Finalizar")').first();
        let canSubmit = false;
        try {
            if (await submitButton.isVisible()) canSubmit = await submitButton.isEnabled();
        } catch (e) { }

        if (canSubmit) {
            await submitButton.click();
            const confirmButton = page.locator('button', { hasText: /Confirmar|Finalizar/i }).first();
            try {
                await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
                await confirmButton.click();
                // Wait specifically for the dashboard or client path to ensure submission finishes
                await page.waitForURL(url => url.pathname === '/client' || url.pathname === '/dat', { timeout: 20000 });
                isFinished = true;
                break;
            } catch (e) {
                console.error("Error waiting for natural redirect:", e);
            }
        } else {
            currentSectionIdx++;
            const sectionButton = page.locator(`button[data-testid="section-btn-${currentSectionIdx}"]`).first();
            try {
                if (await sectionButton.isVisible()) {
                    await sectionButton.click();
                    // CRITICAL: Wait for the new section to fully render to avoid skipping sections
                    try {
                        await page.getByText(`Sección ${currentSectionIdx}`, { exact: true }).waitFor({ state: 'visible', timeout: 3000 });
                    } catch (e) {
                        await page.waitForTimeout(1000); // Fallback wait
                    }
                } else {
                    if (loopCount > 20) break;
                }
            } catch (e) { }
        }
    }
}
