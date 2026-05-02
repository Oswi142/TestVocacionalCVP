import { Page } from '@playwright/test';
import { runPaginatedTestFromJson } from './TestHelpers';
import ipprAnswers from '../data/ippr_answers.json' with { type: 'json' };

export default class IpprPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async goto() {
        await this.page.goto('http://localhost:5173/ippr');
        await this.page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });
    }

    async fillOutTest() {
        await runPaginatedTestFromJson(this.page, ipprAnswers.answers as number[], 'Respuesta IPPR', 100);
    }
}
