import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import type { Associado } from '@/types/database'
import { AuthContext } from './authContextDef'

export { AuthContext }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]     = useState<Session | null>(null)
  const [user, setUser]           = useState<User | null>(null)
  const [associado, setAssociado] = useState<Associado | null>(null)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  async function carregarAssociado(userId: string) {
    const { data } = await supabase
      .from('associados')
      .select('*')
      .eq('user_id', userId)
      .single()
    setAssociado(data ?? null)
  }

  function verificarAdmin(u: User) {
    setIsAdmin(u.app_metadata?.role === 'admin')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        verificarAdmin(session.user)
        carregarAssociado(session.user.id)
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          verificarAdmin(session.user)
          await carregarAssociado(session.user.id)
        } else {
          setAssociado(null)
          setIsAdmin(false)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(cpf: string, senha: string) {
    const cpfLimpo = cpf.replace(/[^0-9]/g, '')
    const email    = `${cpfLimpo}@secoomed.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) return { erro: 'CPF ou senha incorretos. Verifique seus dados e tente novamente.' }
    return {}
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAssociado(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ session, user, associado, isAdmin, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}