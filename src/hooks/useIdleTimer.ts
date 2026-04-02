import { useEffect, useRef, useCallback } from "react";

interface UseIdleTimerProps {
  tempoLimite: number;
  tempoAviso: number;
  onAviso: () => void;
  onExpirar: () => void;
  ativo: boolean;
}

export function useIdleTimer({
  tempoLimite,
  tempoAviso,
  onAviso,
  onExpirar,
  ativo,
}: UseIdleTimerProps) {
  const timerExpirar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisadoRef = useRef(false);
  const resetTimestampRef = useRef(0);

  const limpar = useCallback(() => {
    if (timerExpirar.current) clearTimeout(timerExpirar.current);
    if (timerAviso.current) clearTimeout(timerAviso.current);
  }, []);

  const resetar = useCallback(() => {
    if (!ativo) return;
    limpar();
    avisadoRef.current = false;
    resetTimestampRef.current = Date.now();

    timerAviso.current = setTimeout(() => {
      avisadoRef.current = true;
      onAviso();
    }, tempoLimite - tempoAviso);

    timerExpirar.current = setTimeout(onExpirar, tempoLimite);
  }, [ativo, tempoLimite, tempoAviso, onAviso, onExpirar, limpar]);

  useEffect(() => {
    if (ativo) {
      resetar();
    } else {
      limpar();
    }
    return limpar;
  }, [ativo, resetar, limpar]);

  return { resetar, resetTimestampRef };
}
