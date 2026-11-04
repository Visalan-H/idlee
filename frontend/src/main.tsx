import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { PlanPage } from './components/PlanPage'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname.replace(/\/+$/, '') === '/plan' ? (
      <PlanPage />
    ) : (
      <App initialTab={new URLSearchParams(window.location.search).get('tab') === 'all' ? 'all' : 'free'} />
    )}
  </StrictMode>,
)
