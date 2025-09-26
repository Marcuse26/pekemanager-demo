// Contenido para: src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext'; // [!code ++]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider> {/* [!code ++] */}
      <App />
    </AppProvider> {/* [!code ++] */}
  </StrictMode>,
)