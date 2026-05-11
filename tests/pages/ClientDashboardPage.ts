import { Page, expect } from '@playwright/test';

export default class ClientDashboardPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async goto() {
        await this.page.goto('http://localhost:5173/client');
        await this.page.waitForSelector('button:has-text("Tests")');
    }

    async startTest(testName: string) {
        const testIdStr = testName.toLowerCase() === 'introducción' ? 'introduccion' : testName.toLowerCase();
        const btn = this.page.locator(`button[data-testid="test-btn-${testIdStr}"]`);
        
        await expect(btn).toBeVisible({ timeout: 20000 });
        await expect(btn.locator('svg[data-testid="LockIcon"]')).toHaveCount(0, { timeout: 20000 });
        
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        
        await this.page.waitForTimeout(1000);
    }

    async logout() {
        await this.page.click('button:has-text("Cuenta")');
        await this.page.click('button:has-text("Cerrar sesión")');
        await this.page.click('button:has-text("Salir")');
        await this.page.waitForURL('**/');
    }
}
