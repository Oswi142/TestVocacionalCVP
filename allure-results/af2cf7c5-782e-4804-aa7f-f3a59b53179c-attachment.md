# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessControlTests.spec.ts >> Access Control - Protected Routes >> Unauthenticated user >> Should redirect to login when accessing /admin without session
- Location: tests\automation\accessControlTests.spec.ts:13:9

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/admin
Call log:
  - navigating to "http://localhost:5173/admin", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "No se puede acceder a este sitio" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: localhost
      - text: rechazó la conexión.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Intenta:"
      - list [ref=e12]:
        - listitem [ref=e13]: Comprobar la conexión.
        - listitem [ref=e14]:
          - link "Comprobar el proxy y el firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
          - text: .
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Volver a cargar" [ref=e19] [cursor=pointer]
    - button "Detalles" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import LoginPage from '../pages/LoginPage';
  3  | import dotenv from 'dotenv';
  4  | 
  5  | dotenv.config();
  6  | 
  7  | test.describe.configure({ mode: 'serial' });
  8  | 
  9  | test.describe('Access Control - Protected Routes', () => {
  10 | 
  11 |     test.describe('Unauthenticated user', () => {
  12 | 
  13 |         test('Should redirect to login when accessing /admin without session', async ({ page }) => {
> 14 |             await page.goto('http://localhost:5173/admin');
     |                        ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/admin
  15 |             await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
  16 |         });
  17 | 
  18 |         test('Should redirect to login when accessing /client without session', async ({ page }) => {
  19 |             await page.goto('http://localhost:5173/client');
  20 |             await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
  21 |         });
  22 | 
  23 |         test('Should redirect to login when accessing a nested protected route without session', async ({ page }) => {
  24 |             await page.goto('http://localhost:5173/gestion-usuarios');
  25 |             await expect(page).toHaveURL('http://localhost:5173/', { timeout: 10000 });
  26 |         });
  27 |     });
  28 |     test.describe('Client accessing admin routes', () => {
  29 | 
  30 |         test('Should redirect client to /client when accessing /admin', async ({ page }) => {
  31 |             const loginPage = new LoginPage(page);
  32 | 
  33 |             await loginPage.goto();
  34 |             await loginPage.login(
  35 |                 process.env.CLIENT_USERNAME || '',
  36 |                 process.env.CLIENT_PASSWORD || ''
  37 |             );
  38 |             await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
  39 | 
  40 |             await page.goto('http://localhost:5173/admin');
  41 |             await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });
  42 |         });
  43 | 
  44 |         test('Should redirect client to /client when accessing /gestion-usuarios', async ({ page }) => {
  45 |             const loginPage = new LoginPage(page);
  46 | 
  47 |             await loginPage.goto();
  48 |             await loginPage.login(
  49 |                 process.env.CLIENT_USERNAME || '',
  50 |                 process.env.CLIENT_PASSWORD || ''
  51 |             );
  52 |             await expect(page).toHaveURL(/.*\/client/, { timeout: 15000 });
  53 | 
  54 |             await page.goto('http://localhost:5173/gestion-usuarios');
  55 | 
  56 |             await expect(page).toHaveURL(/.*\/client/, { timeout: 10000 });
  57 |         });
  58 |     });
  59 | 
  60 |     test.describe('Admin accessing client routes', () => {
  61 | 
  62 |         test('Should redirect admin to /admin when accessing /client', async ({ page }) => {
  63 |             const loginPage = new LoginPage(page);
  64 | 
  65 |             await loginPage.goto();
  66 |             await loginPage.login(
  67 |                 process.env.ADMIN_USERNAME || '',
  68 |                 process.env.ADMIN_PASSWORD || ''
  69 |             );
  70 |             await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });
  71 | 
  72 |             await page.goto('http://localhost:5173/client');
  73 | 
  74 |             await expect(page).toHaveURL(/.*\/admin/, { timeout: 10000 });
  75 |         });
  76 |     });
  77 | });
  78 | 
```