import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe.configure({ mode: 'serial' });

test.describe('Login Module', () => {

test('Successful login as admin', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.ADMIN_USERNAME || '', process.env.ADMIN_PASSWORD || '');
    await expect(page).toHaveURL('http://localhost:5173/admin');
});

test('Successful login as client', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.CLIENT_USERNAME || '', process.env.CLIENT_PASSWORD || '');
    await expect(page).toHaveURL('http://localhost:5173/client');
});

test('Unsuccessful login, incorrect password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.CLIENT_USERNAME || '', 'incorrectpassword');
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByRole('alert')).toContainText(/Contraseña incorrecta/i);
});

test('Unsuccessful login, incorrect user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('incorrectUser', process.env.CLIENT_PASSWORD || '');
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByRole('alert')).toContainText(/Usuario no encontrado/i);
});

test('Unsuccessful login, empty fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // We try to click the login button without filling anything
    await page.getByTestId('login-button').click();
    
    // Since fields have the 'required' attribute, HTML5 validation prevents submission
    // We should remain on the login page and not see any custom error alert
    await expect(page).toHaveURL('http://localhost:5173/');
    
    // We can also verify that the username input is focused due to HTML5 validation
    const usernameInput = page.getByTestId('username-input');
    await expect(usernameInput).toBeFocused();
});

});
