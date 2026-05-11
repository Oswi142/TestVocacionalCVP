import { Page } from '@playwright/test';
import introAnswers from '../data/introduccion_answers.json' with { type: 'json' };

export default class IntroduccionPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async goto() {
        await this.page.goto('http://localhost:5173/introduccion');
        await this.page.waitForSelector('div[role="combobox"], input:not([type="hidden"])', { timeout: 15000 });
    }

    async fillOutForm() {
        await this.page.waitForSelector('input:not([type="hidden"]), div[role="combobox"]', { timeout: 10000 });
        await this.page.waitForTimeout(1000);

        const generoSelect = this.page.locator('div[role="combobox"]').first();
        if (await generoSelect.isVisible()) {
            await generoSelect.click();
            await this.page.waitForSelector(`li[role="option"]:has-text("${introAnswers.genero}")`, { timeout: 5000 });
            await this.page.locator(`li[role="option"]:has-text("${introAnswers.genero}")`).click();
        }

        const calendarIcon = this.page.locator('svg[data-testid="CalendarIcon"]').first();
        if (await calendarIcon.isVisible()) {
            await calendarIcon.click();
            await this.page.waitForSelector('button[role="gridcell"]', { timeout: 5000 });
            const dayBtn = this.page.locator(`button[role="gridcell"]:has-text("${introAnswers.day}")`).first();
            if (await dayBtn.isVisible()) {
                await dayBtn.click();
            } else {
                await this.page.locator('button[role="gridcell"]').nth(15).click();
            }
            await this.page.keyboard.press('Escape');
        }

        const inputs = this.page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):visible, textarea:visible');
        await this.page.waitForTimeout(500);
        const count = await inputs.count();

        const genericFallbacks = [introAnswers.address, introAnswers.hobbies];
        let genericIdx = 0;

        for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            const placeholder = await input.getAttribute('placeholder') || '';
            const ariaLabel = await input.getAttribute('aria-label') || '';
            const id = await input.getAttribute('id') || '';
            const allIds = `${placeholder} ${ariaLabel} ${id}`.toLowerCase();

            let typeval = '';
            if (allIds.includes('yyyy') || allIds.includes('fecha')) {
                continue;
            } else if (allIds.includes('departamento')) {
                typeval = introAnswers.departamento;
            } else if (allIds.includes('ciudad')) {
                typeval = introAnswers.ciudad;
            } else if (allIds.includes('colegio')) {
                typeval = introAnswers.colegio;
            } else if (allIds.includes('secundaria') || allIds.includes('6to') || allIds.includes('curso')) {
                typeval = introAnswers.curso;
            } else {
                const val = await input.inputValue();
                if (!val || val.trim() === '') {
                    typeval = genericFallbacks[genericIdx % genericFallbacks.length];
                    genericIdx++;
                }
            }

            if (typeval !== '') {
                await input.fill(typeval);
                await this.page.keyboard.press('Tab');
            }
        }
    }

    async submit() {
        const submitButton = this.page.locator('button:has(svg[data-testid="CheckIcon"])').first();
        await submitButton.waitFor({ state: 'visible', timeout: 5000 });
        await submitButton.click();
        const confirmButton = this.page.locator('button', { hasText: /Confirmar/i }).first();
        await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
        await confirmButton.click();
    }
}
