# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: datOfflineTests.spec.ts >> DAT Offline Protection Tests >> Offline pause and reconnect flow in DAT
- Location: tests\automation\datOfflineTests.spec.ts:9:5

# Error details

```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('div[role="radiogroup"], input[type="text"], textarea') to be visible

```

# Page snapshot

```yaml
- generic [ref=e8]:
  - img "Club Vida Plena"
  - generic [ref=e9]:
    - button "Tests" [ref=e10] [cursor=pointer]
    - button "Cuenta" [ref=e11] [cursor=pointer]
  - generic [ref=e13]:
    - heading "Bienvenido, Juan Diego 👋" [level=5] [ref=e14]
    - paragraph [ref=e15]: Es hora de iniciar a realizar los tests! 😄
    - generic [ref=e16]:
      - button "📄 ENTREVISTA" [ref=e17] [cursor=pointer]
      - button "🧠 IPPR":
        - img
        - text: 🧠 IPPR
      - button "🍥 CHASIDE":
        - img
        - text: 🍥 CHASIDE
      - button "🛠️ MACI":
        - img
        - text: 🛠️ MACI
      - button "🧩 DAT":
        - img
        - text: 🧩 DAT
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import LoginPage from '../pages/LoginPage';
  3  | import dotenv from 'dotenv';
  4  | 
  5  | dotenv.config();
  6  | 
  7  | test.describe('DAT Offline Protection Tests', () => {
  8  | 
  9  |     test('Offline pause and reconnect flow in DAT', async ({ page, context }) => {
  10 |         const loginPage = new LoginPage(page);
  11 |         
  12 |         // 1. Iniciar sesión como cliente
  13 |         await loginPage.goto();
  14 |         await loginPage.login(process.env.CLIENT_USERNAME || 'client', process.env.CLIENT_PASSWORD || 'client');
  15 |         await expect(page).toHaveURL('http://localhost:5173/client');
  16 | 
  17 |         // 2. Navegar a la sección del test DAT
  18 |         await page.goto('http://localhost:5173/dat');
  19 |         await page.waitForSelector('text=Selecciona un apartado', { timeout: 15000 });
  20 | 
  21 |         // 3. Seleccionar e iniciar el primer subtest (Razonamiento Verbal)
  22 |         await page.click('button:has-text("Razonamiento Verbal")');
  23 |         await page.waitForSelector('text=¿Deseas comenzar', { timeout: 5000 });
  24 |         await page.click('button:has-text("Empezar")');
  25 | 
  26 |         // 4. Esperar a que cargue el cuestionario
> 27 |         await page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });
     |                    ^ TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
  28 | 
  29 |         // 5. Simular desconexión a internet
  30 |         await context.setOffline(true);
  31 | 
  32 |         // 6. Verificar que aparece el diálogo de advertencia de conexión perdida
  33 |         const warningDialog = page.locator('text=Conexión Perdida');
  34 |         await expect(warningDialog).toBeVisible({ timeout: 5000 });
  35 |         
  36 |         const dialogText = page.locator('text=Para continuar con este test debes estar conectado a internet');
  37 |         await expect(dialogText).toBeVisible();
  38 | 
  39 |         // 7. Simular reconexión a internet
  40 |         await context.setOffline(false);
  41 | 
  42 |         // 8. Verificar que el diálogo de conexión perdida desaparece automáticamente
  43 |         await expect(warningDialog).not.toBeVisible({ timeout: 5000 });
  44 | 
  45 |         // 9. Volver a simular desconexión
  46 |         await context.setOffline(true);
  47 |         await expect(warningDialog).toBeVisible({ timeout: 5000 });
  48 | 
  49 |         // 10. Hacer clic en "Ir al Dashboard"
  50 |         const dashboardBtn = page.locator('button:has-text("Ir al Dashboard")');
  51 |         await dashboardBtn.click();
  52 | 
  53 |         // 11. Verificar la redirección al dashboard del cliente
  54 |         await expect(page).toHaveURL('http://localhost:5173/client', { timeout: 8000 });
  55 | 
  56 |         // Limpiar el estado offline al finalizar
  57 |         await context.setOffline(false);
  58 |     });
  59 | 
  60 | });
  61 | 
```