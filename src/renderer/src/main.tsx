import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app'
import { Toaster } from './components/ui/sonner'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Elemento #root não encontrado')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
    <Toaster position="bottom-right" richColors closeButton />
  </React.StrictMode>,
)
