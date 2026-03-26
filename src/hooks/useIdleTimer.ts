import { useEffect, useRef, useCallback } from 'react'

interface UseIdleTimerProps {
  tempoLimite: number      // em milissegundos
  tempoAviso: number       // quanto antes do limite mostrar aviso
  onAviso: () => void      // callback para mostrar aviso
  onExpirar: () => void    // callback para deslogar
}

export function useIdleTimer({
  tempoLimite,
  tempoAviso,
  onAviso,
  onExpirar,
}: UseIdleTimerProps) {
  const timerExpirar = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerAviso   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avisadoRef   = useRef(false)

  const resetar = useCallback(() => {
    if (timerExpirar.current) clearTimeout(timerExpirar.current)
    if (timerAviso.current)   clearTimeout(timerAviso.current)
    avisadoRef.current = false

    timerAviso.current = setTimeout(() => {
      avisadoRef.current = true
      onAviso()
    }, tempoLimite - tempoAviso)

    timerExpirar.current = setTimeout(() => {
      onExpirar()
    }, tempoLimite)
  }, [tempoLimite, tempoAviso, onAviso, onExpirar])

  useEffect(() => {
    const eventos = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

    function handleAtividade() {
      if (!avisadoRef.current) resetar()
    }

    eventos.forEach(ev => window.addEventListener(ev, handleAtividade, true))
    resetar()

    return () => {
      eventos.forEach(ev => window.removeEventListener(ev, handleAtividade, true))
      if (timerExpirar.current) clearTimeout(timerExpirar.current)
      if (timerAviso.current)   clearTimeout(timerAviso.current)
    }
  }, [resetar])

  return { resetar }
}