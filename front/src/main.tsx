import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setWorkerUrl } from 'maplibre-gl'
// O MapLibre 6 procura o worker ao lado do próprio módulo; o Vite move o módulo e o worker fica para trás.
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import './index.css'
import App from './App.tsx'

setWorkerUrl(urlDoWorker)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
