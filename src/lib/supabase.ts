/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas.')
}

// Sessão persistida em sessionStorage:
// - Sobrevive ao F5 (refresh) e à navegação interna na mesma aba.
// - Sobrevive à troca de abas (o storage não é apagado ao perder foco).
// - É apagada automaticamente pelo navegador quando a aba/janela é fechada.
// Isso atende exatamente ao requisito: logout só quando a aba é fechada.
// Não usar localStorage (sobreviveria ao fechamento) nem marcadores manuais
// (causavam corrida com persistSession e deslogavam no refresh).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})  