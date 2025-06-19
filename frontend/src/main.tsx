import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AppStateProvider } from './contexts/AppStateProvider'
import { CanvasProvider } from './contexts/CanvasContext' // ADD this import

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppStateProvider>
      <CanvasProvider>
        <App />
      </CanvasProvider>
    </AppStateProvider>
  </React.StrictMode>,
)