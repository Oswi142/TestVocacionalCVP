import { test, expect } from '@playwright/test';
import LoginPage from './testPages/LoginPage';
import dotenv from 'dotenv';

dotenv.config();

test('Successful login as admin', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  const username = process.env.ADMIN_USERNAME || '';
  const password = process.env.ADMIN_PASSWORD || '';

  await loginPage.login(username, password);

  await expect(page).toHaveURL('http://localhost:5173/admin');
});

test('Successful login as client', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  const username = process.env.CLIENT_USERNAME || '';
  const password = process.env.CLIENT_PASSWORD || '';

  await loginPage.login(username, password);

  await expect(page).toHaveURL('http://localhost:5173/client');
});

test('Unsuccessful login, incorrect password', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  const username = process.env.CLIENT_USERNAME || '';

  await loginPage.login(username, 'incorrectpassword');

  await expect(page).toHaveURL('http://localhost:5173/');
  const errorAlert = page.getByRole('alert');
  await expect(errorAlert).toContainText(/Contraseña incorrecta/i);
});

test('Unsuccessful login, incorrect user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  const password = process.env.CLIENT_PASSWORD || '';

  await loginPage.login('incorrectUser', password);

  await expect(page).toHaveURL('http://localhost:5173/');
  const errorAlert = page.getByRole('alert');
  await expect(errorAlert).toContainText(/Usuario no encontrado/i);
});
