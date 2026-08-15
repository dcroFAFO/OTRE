import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { reportClientError } from '@/lib/reportClientError'

window.addEventListener('error', (event) => {
  reportClientError(event.error || new Error('Unhandled browser error'), { source: 'window_error' })
})

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error('Unhandled promise rejection')
  reportClientError(error, { source: 'unhandled_rejection' })
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
