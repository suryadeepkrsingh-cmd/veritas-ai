import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress THREE.Clock deprecation warning until R3F updates internally
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('THREE.Clock') || args[0].includes('deprecated'))) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
