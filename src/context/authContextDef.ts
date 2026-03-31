import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Associado } from '@/types/database'

export interface AuthContextData {
  session: Session | null
  user: User | null
  associado: Associado | null
  isAdmin: boolean
  isLoading: boolean
  primeiroAcesso: boolean
  setPrimeiroAcesso: (valor: boolean) => void
  signIn: (cpf: string, senha: string) => Promise<{ erro?: string }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData)