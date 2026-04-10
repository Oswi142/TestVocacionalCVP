import { testService } from '@/infrastructure/services/testService';

export const processPendingSubmissions = async () => {
    if (!navigator.onLine) return;

    const pending = JSON.parse(localStorage.getItem('pending_submissions') || '[]');
    if (pending.length === 0) return;

    console.log(`[Offline Sync] Intentando enviar ${pending.length} tests pendientes...`);

    const remaining = [];
    for (const item of pending) {
        try {
            await testService.submitAnswers(item.payload);
            console.log(`[Offline Sync] Test ${item.id} enviado con éxito.`);
        } catch (error) {
            console.error(`[Offline Sync] Error al enviar test ${item.id}:`, error);
            remaining.push(item);
        }
    }

    localStorage.setItem('pending_submissions', JSON.stringify(remaining));
};
