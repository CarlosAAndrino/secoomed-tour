/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas.')
}

// Sessão persistida em localStorage (padrão do supabase-js para SPAs no browser).
//
// Por que localStorage e NÃO sessionStorage:
// - localStorage SOBREVIVE ao F5 incondicionalmente (mesmo quando o reload
//   recria o browsing context). sessionStorage fica VAZIO nesse caso, o que
//   fazia INITIAL_SESSION vir com session=null e deslogar no refresh.
// - localStorage é compartilhado entre abas do mesmo domínio. sessionStorage
//   é isolado por aba, então abrir/trocar de aba lia storage vazio, emitia
//   SIGNED_OUT e deslogava.
//
// O requisito "deslogar ao fechar a aba/janela" é tratado em main.tsx via
// pagehide + Navigation Timing (distingue fechamento real de F5), sem usar
// sessionStorage — preservando login no refresh e em múltiplas abas.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})