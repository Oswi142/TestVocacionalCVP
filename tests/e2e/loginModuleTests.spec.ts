import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import dotenv from 'dotenv';

dotenv.config();

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
