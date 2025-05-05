import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme'; // <- Importa el tema que creaste

const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('✅ Service Worker registrado'))
      .catch((err) => console.error('❌ Error al registrar el SW:', err));
  });
}
