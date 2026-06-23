/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'
import { diag, getSessionStart, getSessionEnd } from '@/lib/diag'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas.')
}

// ─── fetch instrumentado + timeout ──────────────────────────────────────────
// Loga TODA requisição/resposta/erro de rede. Mantém o timeout para requisições
// sem signal próprio (refresh de token). Queries com signal próprio passam direto.
const fetchComTimeout: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  const curto = url.replace(supabaseUrl, '')
  const inicio = performance.now()

  diag('network', 'REQUEST', { url: curto, temSignal: !!init?.signal })

  const logResp = (status: number) =>
    diag('network', 'RESPONSE', {
      url: curto,
      status,
      ms: Math.round(performance.now() - inicio),
    })
  const logErr = (name: string) =>
    diag('network', 'ERROR', {
      url: curto,
      erro: name,
      ms: Math.round(performance.now() - inicio),
    })

  if (init?.signal) {
    try {
      const r = await fetch(input, init)
      logResp(r.status)
      return r
    } catch (e) {
      logErr((e as Error)?.name ?? 'unknown')
      throw e
    }
  }

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 12000)
  try {
    const r = await fetch(input, { ...init, signal: controller.signal })
    logResp(r.status)
    return r
  } catch (e) {
    logErr((e as Error)?.name ?? 'unknown')
    throw e
  } finally {
    clearTimeout(id)
  }
}

// Lock sem Web Locks API — INSTRUMENTADO.
// Loga aquisição e liberação. Se uma aquisição não tiver liberação correspondente
// após voltar de aba, é AQUI que o congelamento mora.
let lockSeq = 0
async function lockSemWebLocks<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  const id = ++lockSeq
  const inicio = performance.now()
  diag('lock', 'ACQUIRE', { id, name })
  try {
    const r = await fn()
    diag('lock', 'RELEASE', { id, name, ms: Math.round(performance.now() - inicio), ok: true })
    return r
  } catch (e) {
    diag('lock', 'RELEASE', {
      id,
      name,
      ms: Math.round(performance.now() - inicio),
      ok: false,
      erro: (e as Error)?.name,
    })
    throw e
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    lock: lockSemWebLocks,
  },
  global: {
    fetch: fetchComTimeout,
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUMENTAÇÃO DE getSession — o ponto crítico da hipótese.
// Toda query/ação do supabase-js chama getSession() internamente para montar o
// cabeçalho de auth ANTES de disparar o fetch REST. Se getSession travar, a ação
// fica em loading infinito sem nunca chegar ao fetch. Envelopamos getSession
// para medir exatamente quando ela inicia e se/quando conclui.
// ─────────────────────────────────────────────────────────────────────────────
const getSessionOriginal = supabase.auth.getSession.bind(supabase.auth)
let getSessionSeq = 0
supabase.auth.getSession = async function instrumentedGetSession() {
  const origem = `gs#${++getSessionSeq}`
  const inicio = performance.now()
  getSessionStart(origem)
  try {
    const r = await getSessionOriginal()
    getSessionEnd(origem, !r.error, performance.now() - inicio)
    return r
  } catch (e) {
    getSessionEnd(origem, false, performance.now() - inicio)
    throw e
  }
} as typeof supabase.auth.getSession