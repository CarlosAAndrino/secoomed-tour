/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas.')
}

// fetch com timeout para requisições SEM signal próprio.
// As queries das páginas já trazem seu próprio AbortController (10s) — essas
// passam direto. As requisições internas do auth (refresh de token) NÃO trazem
// signal e, se a aba foi suspensa em segundo plano, podem ficar penduradas para
// sempre — travando getSession() e, por consequência, TODA query nova.
// O timeout garante que nenhuma requisição de auth pendure indefinidamente.
const fetchComTimeout: typeof fetch = (input, init) => {
  if (init?.signal) {
    return fetch(input, init)
  }
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 12000)
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  )
}

// Lock sem Web Locks API — evita o aviso de lock órfão do gotrue em StrictMode/HMR.
// A serialização dentro da aba continua garantida pelo controle interno do supabase-js.
async function lockSemWebLocks<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  return await fn()
}

// Sessão em localStorage: sobrevive a F5 e à troca de abas; compartilhada entre
// abas do mesmo domínio. (O "deslogar ao fechar a aba" é tratado em main.tsx
// pelo marcador de sessão de página no sessionStorage.)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    // autoRefreshToken DESLIGADO de propósito.
    // O auto-refresh do supabase-js engancha no visibilitychange e dispara uma
    // requisição de rede sempre que a aba volta ao foco. Em abas que ficaram em
    // segundo plano, essa requisição era suspensa pelo navegador e ficava
    // pendurada, travando getSession() e deixando toda query seguinte em loading
    // infinito. A renovação do token agora é manual, num intervalo fixo
    // desacoplado da visibilidade (ver o useEffect de refresh em AuthContext).
    autoRefreshToken: false,
    detectSessionInUrl: false,
    lock: lockSemWebLocks,
  },
  global: {
    fetch: fetchComTimeout,
  },
})