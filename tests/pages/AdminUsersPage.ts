import { Page, expect } from '@playwright/test';

export default class AdminUsersPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async goto() {
        await this.page.goto('http://localhost:5173/gestion-usuarios');
        await this.page.waitForSelector('button:has-text("Nuevo Usuario")');
    }

    async createUser(name: string, firstName: string, lastName: string, username: string, pass: string) {
        await this.page.click('button:has-text("Nuevo Usuario")');
        
        await this.page.fill('label:has-text("Nombre(s)") + div input', name);
        await this.page.fill('label:has-text("Primer Apellido") + div input', firstName);
        await this.page.fill('label:has-text("Segundo Apellido") + div input', lastName);
        
        const usernameInput = this.page.locator('label:has-text("Usuario") + div input');
        await usernameInput.focus();
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Backspace');
        await usernameInput.fill(username);

        const passInput = this.page.locator('label:has-text("Contraseña") + div input');
        await passInput.focus();
        await this.page.keyboard.press('Control+A');
        await passInput.fill(pass);

        await this.page.click('div[role="combobox"]:has-text("Cliente")');
        await this.page.click('li[role="option"]:has-text("Cliente")');

        await this.page.click('button:has-text("Crear")');
        
        await this.page.waitForSelector('text=Usuario creado exitosamente');
    }

    async deleteUser(name: string) {
        await this.page.fill('input[placeholder="Buscar por nombre..."]', name);
        await this.page.waitForTimeout(1000);

        const row = this.page.locator('tr', { hasText: name }).first();
        await row.scrollIntoViewIfNeeded();
        await row.locator('button:has(svg[data-testid="DeleteIcon"])').click();

        const confirmBtn = this.page.locator('button', { hasText: "Eliminar" }).filter({ hasNotText: "usuario" }).first();
        await confirmBtn.waitFor({ state: 'visible' });
        await confirmBtn.click();

        await this.page.waitForSelector('text=No se encontraron usuarios');
    }

    async editUser(oldName: string, newName: string) {
        await this.page.fill('input[placeholder="Buscar por nombre..."]', oldName);
        await this.page.waitForTimeout(1000);

        const row = this.page.locator('tr', { hasText: oldName }).first();
        await row.scrollIntoViewIfNeeded();
        await row.locator('button:has(svg[data-testid="EditIcon"])').click();

        const editDialog = this.page.locator('div[role="dialog"]').filter({ hasText: 'Editar Usuario' });
        await editDialog.waitFor({ state: 'visible' });

        const nameInput = editDialog.locator('label:has-text("Nombre(s)") + div input');
        await nameInput.click();
        await nameInput.selectText();
        await nameInput.pressSequentially(newName, { delay: 50 });

        const saveBtn = editDialog.locator('button:has-text("Guardar")');
        await expect(saveBtn).toBeEnabled({ timeout: 10000 });
        await saveBtn.click();
        await this.page.waitForSelector('text=Usuario actualizado');
    }

    async verifyUserExists(name: string) {
        await this.page.fill('input[placeholder="Buscar por nombre..."]', name);
        await this.page.waitForTimeout(1500);
        const row = this.page.locator('tr', { hasText: name }).first();
        await expect(row).toBeVisible();
    }

    async verifyUserNotExists(name: string) {
        await this.page.fill('input[placeholder="Buscar por nombre..."]', name);
        await this.page.waitForTimeout(1500);
        await expect(this.page.locator('text=No se encontraron usuarios')).toBeVisible();
    }
}
