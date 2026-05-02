import { Page } from '@playwright/test';

export default class AdminDashboardPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async goto() {
        await this.page.goto('http://localhost:5173/admin');
        await this.page.waitForSelector('button:has-text("Gestión de Usuarios")');
    }

    async logout() {
        await this.page.click('button:has-text("Cuenta")');
        await this.page.click('button:has-text("Cerrar sesión")');
        await this.page.click('button:has-text("Salir")');
        await this.page.waitForURL('**/');
    }
}
