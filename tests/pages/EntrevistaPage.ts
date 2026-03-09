import { Page } from '@playwright/test';

export default class EntrevistaPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto() {
        await this.page.goto('http://localhost:5173/entrevista');
        await this.page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });
    }

    async fillOutTest() {
        let isFinished = false;
        let loopCount = 0;
        let currentSectionIdx = 1;

        while (!isFinished && loopCount < 60) {
            loopCount++;

            // 1. Fill all visible radio groups
            const groups = await this.page.locator('div[role="radiogroup"]').all();
            for (const group of groups) {
                if (await group.isVisible()) {
                    const firstRadio = group.locator('input[type="radio"]').first();
                    try {
                        if (await firstRadio.isVisible() && !(await firstRadio.isChecked())) {
                            await firstRadio.check({ force: true });
                            await this.page.waitForTimeout(200);
                        }
                    } catch (e) { }
                }
            }

            // 2. Fill all visible text inputs
            const textInputs = await this.page.locator('input[type="text"], textarea').all();
            for (const input of textInputs) {
                try {
                    if (await input.isVisible()) {
                        const val = await input.inputValue();
                        if (!val || val.trim() === '') {
                            await input.fill('Respuesta automática generada por Playwright');
                            await this.page.waitForTimeout(200);
                        }
                    }
                } catch (e) { }
            }

            // 3. Gate: only proceed if ALL visible inputs are filled
            let allFilled = true;
            const textCheck = await this.page.locator('input[type="text"], textarea').all();
            for (const input of textCheck) {
                try {
                    if (await input.isVisible()) {
                        const val = await input.inputValue();
                        if (!val || val.trim() === '') { allFilled = false; break; }
                    }
                } catch (e) { }
            }
            if (allFilled) {
                const groupsCheck = await this.page.locator('div[role="radiogroup"]').all();
                for (const group of groupsCheck) {
                    try {
                        if (await group.isVisible()) {
                            const checked = group.locator('input[type="radio"]:checked');
                            if (await checked.count() === 0) { allFilled = false; break; }
                        }
                    } catch (e) { }
                }
            }

            if (!allFilled) {
                await this.page.waitForTimeout(500);
                continue;
            }

            // 4. Try submit button
            const submitButton = this.page.locator('button:has(svg[data-testid="CheckIcon"])').first();
            let canSubmit = false;
            try {
                if (await submitButton.isVisible()) canSubmit = await submitButton.isEnabled();
            } catch (e) { }

            if (canSubmit) {
                await submitButton.click();
                const confirmButton = this.page.locator('button', { hasText: /Confirmar/i }).first();
                try {
                    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
                    await confirmButton.click();
                } catch (e) { }
                await this.page.waitForTimeout(2000);
                if (this.page.url().includes('client')) {
                    isFinished = true;
                    break;
                } else {
                    currentSectionIdx = 1;
                }
            } else {
                currentSectionIdx++;
                const sectionButton = this.page.locator(`button:has-text("${currentSectionIdx}")`).first();
                try {
                    if (await sectionButton.isVisible()) {
                        await sectionButton.click();
                        await this.page.waitForTimeout(800);
                    } else {
                        if (loopCount > 20) break;
                    }
                } catch (e) { }
            }
        }
    }
}
