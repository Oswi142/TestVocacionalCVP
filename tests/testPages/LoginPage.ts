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
    await this.usernameField.fill(username);
    await this.passwordField.fill(password);
    await this.loginButton.click();
  }
}
