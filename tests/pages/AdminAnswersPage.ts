import { Page, expect } from '@playwright/test';

export default class AdminAnswersPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async goto() {
        await this.page.goto('http://localhost:5173/respuestas-clientes');
        await this.page.waitForSelector('input[placeholder="Buscar cliente..."]');
    }

    async verifyClientAnswers(clientName: string, expectedTestKinds: string[]) {
        await this.page.fill('input[placeholder="Buscar cliente..."]', clientName);
        await this.page.waitForTimeout(2000);

        const clientRow = this.page.locator('h6, p, span, .MuiTypography-root', { hasText: clientName }).first();
        await clientRow.scrollIntoViewIfNeeded();
        await clientRow.click();
        
        await this.page.waitForTimeout(2000);

        for (const kind of expectedTestKinds) {
            console.log(`Verificando respuesta de: ${kind}`);
            const testRow = this.page.locator(`[data-testid="answer-row-${kind}"]`);
            
            await testRow.scrollIntoViewIfNeeded();
            await expect(testRow).toBeVisible({ timeout: 15000 });
            
            const downloadBtn = this.page.locator(`[data-testid="download-btn-${kind}"]`);
            await expect(downloadBtn).toBeVisible();
            await expect(downloadBtn).toBeEnabled();
        }
    }
}
