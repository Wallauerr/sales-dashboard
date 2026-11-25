import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app'
import { Toaster } from './components/ui/sonner'
import { applyDocumentTheme, readTheme } from './lib/theme-dom'
import './index.css'

applyDocumentTheme(readTheme())

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Elemento #root não encontrado')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
    <Toaster position="bottom-right" richColors closeButton />
  </React.StrictMode>,
)
