import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { App } from './App.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import 'leaflet/dist/leaflet.css'; // <-- ESTO ACOMODA LOS RECUADROS DEL MAPA
import './styles.css';
// Usamos React Router para separar las vistas B2C y B2B
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Ruta pública (Pasajeros) */}
        <Route path="/" element={<App />} />
        
        {/* Ruta privada oculta (Administradores) */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);