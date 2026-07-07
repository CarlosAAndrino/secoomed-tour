/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas.')
}

// ─── fetch com timeout ──────────────────────────────────────────────────────
// Requisições sem signal próprio (ex.: refresh de token) ganham timeout de 12s.
// Queries com signal próprio passam direto.
const fetchComTimeout: typeof fetch = async (input, init) => {
  if (init?.signal) {
    return fetch(input, init)
  }

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 12000)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

// Lock sem Web Locks API — evita deadlock de navigator.locks ao trocar de aba.
async function lockSemWebLocks<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  return fn()
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