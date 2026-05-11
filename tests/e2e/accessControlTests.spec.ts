import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe.configure({ mode: 'serial' });

test.describe('Access Control - Protected Routes', () => {

    test.describe('Unauthenticated user', () => {

        test('Should redirect to login when accessing /admin without session', async ({ page }) => {
            await page.goto('http://localhost:5173/admin');
            await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
        });

        test('Should redirect to login when accessing /client without session', async ({ page }) => {
            await page.goto('http://localhost:5173/client');
            await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
        });

        test('Should redirect to login when accessing a nested protected route without session', async ({ page }) => {
            await page.goto('http://localhost:5173/gestion-usuarios');
            await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
        });
    });
    test.describe('Client accessing admin routes', () => {

        test('Should redirect client to /client when accessing /admin', async ({ page }) => {
            const loginPage = new LoginPage(page);

            await loginPage.goto();
            await loginPage.login(
                process.env.CLIENT_USERNAME || '',
                process.env.CLIENT_PASSWORD || ''
            );
            await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

            await page.goto('http://localhost:5173/admin');
            await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });
        });

        test('Should redirect client to /client when accessing /gestion-usuarios', async ({ page }) => {
            const loginPage = new LoginPage(page);

            await loginPage.goto();
            await loginPage.login(
                process.env.CLIENT_USERNAME || '',
                process.env.CLIENT_PASSWORD || ''
            );
            await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

            await page.goto('http://localhost:5173/gestion-usuarios');

            await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });
        });
    });

    test.describe('Admin accessing client routes', () => {

        test('Should redirect admin to /admin when accessing /client', async ({ page }) => {
            const loginPage = new LoginPage(page);

            await loginPage.goto();
            await loginPage.login(
                process.env.ADMIN_USERNAME || '',
                process.env.ADMIN_PASSWORD || ''
            );
            await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });

            await page.goto('http://localhost:5173/client');

            await expect(page).toHaveURL(/.*\/admin/, { timeout: 10000 });
        });
    });
});
