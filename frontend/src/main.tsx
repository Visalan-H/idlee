import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import { PlanPage } from './components/PlanPage'
import { BreakPage } from './components/BreakPage'
import './styles.css'

// Set to false to bring the app back.
const ON_BREAK = true

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {ON_BREAK ? (
      <BreakPage />
    ) : window.location.pathname.replace(/\/+$/, '') === '/plan' ? (
      <PlanPage />
    ) : (
      <App initialTab={new URLSearchParams(window.location.search).get('tab') === 'all' ? 'all' : 'free'} />
    )}
    <Analytics />
  </StrictMode>,
)
