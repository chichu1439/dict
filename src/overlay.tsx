import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ScreenshotTranslation from './components/ScreenshotTranslation'
import './index.css'

// Add global error handler to catch initialization issues
window.addEventListener('error', (e) => {
  console.error('Overlay global error:', e.error);
});

console.log('Overlay window initializing...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScreenshotTranslation />
  </StrictMode>,
)
