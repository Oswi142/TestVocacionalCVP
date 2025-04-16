self.addEventListener('install', () => {
    console.log('[Service Worker] Instalado');
  });
  
  self.addEventListener('activate', () => {
    console.log('[Service Worker] Activado');
  });
  