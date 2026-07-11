import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installAppFormValidationMessages } from './lib/formValidationMessages'

installAppFormValidationMessages()

if (import.meta.env.DEV) {
  import('./lib/fcm').then(({ validateFcmConfig }) => {
    window.validateFcmConfig = validateFcmConfig
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
