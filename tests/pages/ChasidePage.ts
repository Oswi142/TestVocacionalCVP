import { Page } from '@playwright/test';
import { runPaginatedTestFromJson } from './TestHelpers';
import chasideAnswers from '../data/chaside_answers.json' with { type: 'json' };

export default class ChasidePage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async goto() {
        await this.page.goto('http://localhost:5173/chaside');
        await this.page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });
    }

    async fillOutTest() {
        await runPaginatedTestFromJson(this.page, chasideAnswers.answers as boolean[], 'Respuesta CHASIDE', 100);
    }
}
