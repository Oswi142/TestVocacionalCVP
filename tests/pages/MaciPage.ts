import { Page } from '@playwright/test';
import { runPaginatedTest } from './TestHelpers';

export default class MaciPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async goto() {
        await this.page.goto('http://localhost:5173/maci');
        await this.page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });
    }

    async fillOutTest() {
        await runPaginatedTest(this.page, 'Respuesta automática MACI Playwright', 100);
    }
}
