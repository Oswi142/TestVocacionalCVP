import { Page, Locator } from '@playwright/test';

export default class LoginPage {
    readonly page: Page;
    readonly usernameField: Locator;
    readonly passwordField: Locator;
    readonly loginButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.usernameField = page.getByTestId('username-input');
        this.passwordField = page.getByTestId('password-input');
        this.loginButton = page.getByTestId('login-button');
    }

    async goto() {
        await this.page.goto('http://localhost:5173');
    }

    async login(username: string, password: string) {
        // Wait and ensure focus
        await this.usernameField.waitFor({ state: 'visible', timeout: 15000 });
        await this.usernameField.click();
        await this.usernameField.fill(username);
        
        await this.passwordField.waitFor({ state: 'visible', timeout: 10000 });
        await this.passwordField.click();
        await this.passwordField.fill(password);
        
        await this.loginButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.loginButton.click();
    }
}
