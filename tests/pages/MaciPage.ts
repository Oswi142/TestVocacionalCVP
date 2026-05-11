import { Page } from '@playwright/test';
import { runPaginatedTestFromJson } from './TestHelpers';
import maciAnswers from '../data/maci_answers.json' with { type: 'json' };

export default class MaciPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async goto() {
        await this.page.goto('http://localhost:5173/maci');
        await this.page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });
    }

    async fillOutTest() {
        const answers = maciAnswers.testCases[0].answers as boolean[];
        await runPaginatedTestFromJson(this.page, answers, 'Respuesta MACI', 100);
    }
}
