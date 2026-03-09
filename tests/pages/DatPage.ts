import { Page } from '@playwright/test';
import { runPaginatedTest } from './TestHelpers';

const DAT_MODULES = [
    { name: 'Razonamiento Verbal', url: 'http://localhost:5173/dat/verbal' },
    { name: 'Razonamiento Numérico', url: 'http://localhost:5173/dat/numerico' },
    { name: 'Razonamiento Abstracto', url: 'http://localhost:5173/dat/abstracto' },
    { name: 'Razonamiento Mecánico', url: 'http://localhost:5173/dat/mecanico' },
    { name: 'Relaciones Espaciales', url: 'http://localhost:5173/dat/espaciales' },
    { name: 'Ortografía', url: 'http://localhost:5173/dat/ortografia' },
];

export default class DatPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async fillAllSubtests() {
        for (const mod of DAT_MODULES) {
            console.log(`\n--- Iniciando: ${mod.name} ---`);
            await this.page.goto(mod.url);
            await this.page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });
            await runPaginatedTest(this.page, 'Respuesta automática DAT Playwright', 100);
            console.log(`--- Completado: ${mod.name} ---`);
        }
    }
}
