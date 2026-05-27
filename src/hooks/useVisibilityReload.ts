import { useEffect, useState, useCallback } from 'react'

/**
 * Hook que fornece um reloadKey que incrementa automaticamente
 * quando o usuário volta para a aba (visibilitychange).
 *
 * Use como dependência do useEffect de busca de dados para
 * garantir que requests travados sejam abortados e reiniciados
 * ao retornar da aba, evitando loading infinito.
 */
export function useVisibilityReload() {
  const [reloadKey, setReloadKey] = useState(0)

  const forcarReload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    const handle = () => {
      if (document.visibilityState === 'visible') {
        setReloadKey((k) => k + 1)
      }
    }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [])

  return { reloadKey, forcarReload }
}