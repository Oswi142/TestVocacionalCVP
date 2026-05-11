import { Page } from '@playwright/test';
import { runPaginatedTestFromJson } from './TestHelpers';
import datAnswers from '../data/dat_answers.json' with { type: 'json' };

const DAT_MODULES: { name: string; key: keyof typeof datAnswers }[] = [
    { name: 'Razonamiento Verbal',    key: 'razonamiento_verbal' },
    { name: 'Razonamiento Numérico',  key: 'razonamiento_numerico' },
    { name: 'Razonamiento Abstracto', key: 'razonamiento_abstracto' },
    { name: 'Razonamiento Mecánico',  key: 'razonamiento_mecanico' },
    { name: 'Relaciones Espaciales',  key: 'razonamiento_espacial' },
    { name: 'Ortografía',             key: 'ortografia' },
];

export default class DatPage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async fillAllSubtests() {
        for (const mod of DAT_MODULES) {
            console.log(`\n--- Iniciando: ${mod.name} ---`);
            
            if (!this.page.url().endsWith('/dat')) {
                await this.page.goto('http://localhost:5173/dat');
            }
            await this.page.waitForSelector('text=Selecciona un apartado', { timeout: 15000 });

            await this.page.click(`button:has-text("${mod.name}")`);
            await this.page.waitForSelector('text=¿Deseas comenzar', { timeout: 5000 });
            await this.page.click('button:has-text("Empezar")');
            await this.page.waitForSelector('div[role="radiogroup"], input[type="text"], textarea', { timeout: 15000 });
            await runPaginatedTestFromJson(this.page, datAnswers[mod.key] as number[], `Respuesta DAT ${mod.name}`, 100);
            console.log(`--- Completado: ${mod.name} ---`);
        }
    }
}
