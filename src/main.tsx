import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { supabase } from './lib/supabase'

// Desloga ao fechar o browser/aba
window.addEventListener('beforeunload', () => {
  supabase.auth.signOut()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)