import { Page } from '@playwright/test';
import answers from '../data/entrevista_answers.json' with { type: 'json' };

type SectionKey = keyof typeof answers.sections;

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
        await this.page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });

        let isFinished = false;
        let loopCount = 0;
        let currentSectionIdx = 1;

        // Per-section indices so each answer maps to the right question
        const textIdx: Record<number, number> = {};
        const radioIdx: Record<number, number> = {};

        while (!isFinished && loopCount < 80) {
            loopCount++;

            const sec = String(currentSectionIdx) as SectionKey;
            const sectionData = answers.sections[sec] as { text?: string[]; radio?: number[] } | undefined;
            const textAnswers = sectionData?.text ?? [];
            const radioAnswers = sectionData?.radio ?? [];

            if (textIdx[currentSectionIdx] === undefined) textIdx[currentSectionIdx] = 0;
            if (radioIdx[currentSectionIdx] === undefined) radioIdx[currentSectionIdx] = 0;

            // 1. Fill radio groups using the section-specific radio array
            const groups = await this.page.locator('div[role="radiogroup"]').all();
            for (const group of groups) {
                if (await group.isVisible()) {
                    try {
                        const isChecked = (await group.locator('input[type="radio"]:checked').count()) > 0;
                        if (!isChecked) {
                            const radios = await group.locator('input[type="radio"]').all();
                            if (radios.length > 0) {
                                const idx = radioIdx[currentSectionIdx] % Math.max(radioAnswers.length, 1);
                                const radioIndex = radioAnswers.length > 0
                                    ? Math.min(radioAnswers[idx], radios.length - 1)
                                    : 0;
                                await radios[radioIndex].check({ force: true });
                                radioIdx[currentSectionIdx]++;
                                await this.page.waitForTimeout(200);
                            }
                        }
                    } catch (e) { }
                }
            }

            // 2. Fill text inputs with the section-specific ordered text answers
            const textInputs = await this.page.locator('input[type="text"], textarea').all();
            for (const input of textInputs) {
                try {
                    if (await input.isVisible()) {
                        const val = await input.inputValue();
                        if (!val || val.trim() === '') {
                            const idx = textIdx[currentSectionIdx] % Math.max(textAnswers.length, 1);
                            const textToFill = textAnswers.length > 0
                                ? textAnswers[idx]
                                : 'Respuesta de entrevista';
                            await input.fill(textToFill);
                            textIdx[currentSectionIdx]++;
                            await this.page.waitForTimeout(200);
                        }
                    }
                } catch (e) { }
            }

            // 3. Gate: verify all visible inputs are filled
            let allFilled = true;
            for (const input of await this.page.locator('input[type="text"], textarea').all()) {
                try {
                    if (await input.isVisible() && (await input.inputValue()).trim() === '') {
                        allFilled = false; break;
                    }
                } catch (e) { }
            }
            if (allFilled) {
                for (const group of await this.page.locator('div[role="radiogroup"]').all()) {
                    try {
                        if (await group.isVisible() && (await group.locator('input[type="radio"]:checked').count()) === 0) {
                            allFilled = false; break;
                        }
                    } catch (e) { }
                }
            }

            if (!allFilled) {
                await this.page.waitForTimeout(500);
                continue;
            }

            // 4. Try submit or advance to next section
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
                }
            } else {
                currentSectionIdx++;
                const sectionButton = this.page.locator(`button:has-text("${currentSectionIdx}")`).first();
                try {
                    if (await sectionButton.isVisible()) {
                        await sectionButton.click();
                        await this.page.waitForTimeout(800);
                    } else if (loopCount > 30) {
                        break;
                    }
                } catch (e) { }
            }
        }
    }
}
