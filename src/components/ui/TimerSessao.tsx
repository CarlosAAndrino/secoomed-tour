import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

const TEMPO_LIMITE_MS = 30 * 60 * 1000

export default function TimerSessao() {
  const { session, timerResetTimestampRef } = useAuth()
  const [segs, setSegs] = useState(Math.floor(TEMPO_LIMITE_MS / 1000))

  useEffect(() => {
    if (!session) return

    // Intervalo isolado — só este componente re-renderiza a cada segundo
    const interval = setInterval(() => {
      const elapsed   = Date.now() - timerResetTimestampRef.current
      const remaining = Math.max(0, TEMPO_LIMITE_MS - elapsed)
      setSegs(Math.floor(remaining / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [session, timerResetTimestampRef])

  if (!session) return null

  const minutos  = Math.floor(segs / 60)
  const segundos = segs % 60
  const formatado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
  const critico  = segs <= 300

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg text-xs font-medium select-none"
      style={{
        backgroundColor: critico ? '#FEF2F2' : '#F0FDF4',
        color:           critico ? '#DC2626' : '#16a34a',
        border:          `1px solid ${critico ? '#FECACA' : '#BBF7D0'}`,
      }}
    >
      <div
        className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
        style={{ backgroundColor: critico ? '#DC2626' : '#16a34a' }}
      />
      Sessão expira em {formatado}
    </div>
  )
}