import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import dotenv from 'dotenv';

dotenv.config();

test.describe.configure({ mode: 'serial' });

test.describe('Access Control - Protected Routes', () => {

    // --- Unauthenticated user ---
    test.describe('Unauthenticated user', () => {

        test('Should redirect to login when accessing /admin without session', async ({ page }) => {
            // Try to navigate directly to admin without any session
            await page.goto('http://localhost:5173/admin');

            // Should be sent back to the login page
            await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
        });

        test('Should redirect to login when accessing /client without session', async ({ page }) => {
            // Try to navigate directly to client without any session
            await page.goto('http://localhost:5173/client');

            // Should be sent back to the login page
            await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
        });

        test('Should redirect to login when accessing a nested protected route without session', async ({ page }) => {
            // Try to access a deep admin route
            await page.goto('http://localhost:5173/gestion-usuarios');

            // Should be sent back to the login page
            await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
        });
    });

    // --- Client trying to access admin area ---
    test.describe('Client accessing admin routes', () => {

        test('Should redirect client to /client when accessing /admin', async ({ page }) => {
            const loginPage = new LoginPage(page);

            // Login as a client
            await loginPage.goto();
            await loginPage.login(
                process.env.CLIENT_USERNAME || '',
                process.env.CLIENT_PASSWORD || ''
            );
            await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

            // Now try to navigate to admin
            await page.goto('http://localhost:5173/admin');

            // Should be redirected back to /client, NOT allowed into /admin
            await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });
        });

        test('Should redirect client to /client when accessing /gestion-usuarios', async ({ page }) => {
            const loginPage = new LoginPage(page);

            // Login as a client
            await loginPage.goto();
            await loginPage.login(
                process.env.CLIENT_USERNAME || '',
                process.env.CLIENT_PASSWORD || ''
            );
            await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });

            // Try to force navigate to a protected admin sub-route
            await page.goto('http://localhost:5173/gestion-usuarios');

            // Should be redirected back to /client
            await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });
        });
    });

    // --- Admin trying to access client area ---
    test.describe('Admin accessing client routes', () => {

        test('Should redirect admin to /admin when accessing /client', async ({ page }) => {
            const loginPage = new LoginPage(page);

            // Login as admin
            await loginPage.goto();
            await loginPage.login(
                process.env.ADMIN_USERNAME || '',
                process.env.ADMIN_PASSWORD || ''
            );
            await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });

            // Now try to navigate to client dashboard
            await page.goto('http://localhost:5173/client');

            // Should be redirected back to /admin, NOT allowed into /client
            await expect(page).toHaveURL(/.*\/admin/, { timeout: 10000 });
        });
    });
});
