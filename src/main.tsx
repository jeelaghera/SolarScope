import L from 'leaflet';
// Ensure Leaflet is globally available for plugins
if (typeof window !== 'undefined') {
  (window as any).L = L;
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
