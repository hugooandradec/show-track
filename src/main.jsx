import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 👉 REGISTRO DO SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/show-track/sw.js')
      .then(() => console.log('SW registrado 😏'))
      .catch((err) => console.log('Erro SW:', err))
  })
}