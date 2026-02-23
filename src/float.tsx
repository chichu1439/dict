import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FloatWindow from './components/FloatWindow'
import './index.css'

window.addEventListener('error', (e) => {
  console.error('Float window global error:', e.error);
});

console.log('Float window initializing...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FloatWindow />
  </StrictMode>,
)
