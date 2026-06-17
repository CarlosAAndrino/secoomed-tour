import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Associado } from "@/types/database";
import { AuthContext } from "./authContextDef";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import ModalSessaoExpirando from "@/components/ui/ModalSessaoExpirando";
import ModalPrimeiroAcesso from "@/components/ui/ModalPrimeiroAcesso";

export { AuthContext };

function limparTokensLocais() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("sb-") && k.includes("-auth-token"))
    .forEach((k) => localStorage.removeItem(k));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [associado, setAssociado] = useState<Associado | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [contador, setContador] = useState(300);
  const contadorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // ─── Idle timer ───────────────────────────────────────────────────────────

  const handleAviso = useCallback(() => {
    setContador(300);
    setMostrarAviso(true);
    contadorRef.current = setInterval(() => setContador((c) => c - 1), 1000);
  }, []);

  const handleExpirar = useCallback(async () => {
    if (contadorRef.current) clearInterval(contadorRef.current);
    setMostrarAviso(false);
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignora */
    }
    limparTokensLocais();
    setSession(null);
    setUser(null);
    setAssociado(null);
    setIsAdmin(false);
    window.location.href = "/entrar";
  }, []);

  const { resetar, resetTimestampRef } = useIdleTimer({
    tempoLimite: 30 * 60 * 1000,
    tempoAviso: 5 * 60 * 1000,
    onAviso: handleAviso,
    onExpirar: handleExpirar,
    ativo: !!session,
  });

  function handleContinuar() {
    if (contadorRef.current) clearInterval(contadorRef.current);
    setMostrarAviso(false);
    resetar();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async function carregarAssociado(userId: string) {
    try {
      const { data } = await supabase
        .from("associados")
        .select("*")
        .eq("user_id", userId)
        .single();
      setAssociado(data ?? null);
      setPrimeiroAcesso(data?.primeiro_acesso ?? false);
    } catch {
      setAssociado(null);
    }
  }

  function verificarAdmin(u: User) {
    setIsAdmin(u.app_metadata?.role === "admin");
  }

  function limparEstado() {
    limparTokensLocais();
    setSession(null);
    setUser(null);
    setAssociado(null);
    setIsAdmin(false);
    setPrimeiroAcesso(false);
  }

  // ─── Inicialização via onAuthStateChange ──────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;

      switch (event) {
        case "INITIAL_SESSION":
          if (s?.user) {
            setSession(s);
            setUser(s.user);
            verificarAdmin(s.user);
            try {
              await carregarAssociado(s.user.id);
            } catch {
              /* ignora */
            }
          }
          if (mounted) setIsLoading(false);
          break;

        case "SIGNED_IN":
          if (s?.user) {
            setSession(s);
            setUser(s.user);
            verificarAdmin(s.user);
            await carregarAssociado(s.user.id);
          }
          if (mounted) setIsLoading(false);
          break;

        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
          setSession(s);
          setUser(s?.user ?? null);
          if (s?.user) verificarAdmin(s.user);
          break;

        case "SIGNED_OUT":
          limparEstado();
          if (mounted) setIsLoading(false);
          window.location.href = "/entrar";
          break;

        default:
          if (mounted) setIsLoading(false);
          break;
      }
    });

    const safetyTimeout = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 6000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // ─── Tab sync (visibilitychange) ──────────────────────────────────────────

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      if (!sessionRef.current) return;

      try {
        const {
          data: { session: freshSession },
        } = await supabase.auth.getSession();

        if (!freshSession) {
          limparEstado();
          window.location.href = "/entrar";
          return;
        }

        setSession(freshSession);
        setUser(freshSession.user);
        setDataRefreshKey((k) => k + 1);
      } catch {
        // Erro de rede — mantém dados em cache
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // ─── Auth actions (useCallback para estabilidade no useMemo) ──────────────

  const signIn = useCallback(async (cpf: string, senha: string) => {
    const cpfLimpo = cpf.replace(/[^0-9]/g, "");
    const email = `${cpfLimpo}@secoomed.local`;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) {
      return {
        erro: "CPF ou senha incorretos. Verifique seus dados e tente novamente.",
      };
    }
    return {};
  }, []);

  const signOut = useCallback(async () => {
    if (contadorRef.current) clearInterval(contadorRef.current);
    setMostrarAviso(false);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignora
    } finally {
      limparTokensLocais();
      setSession(null);
      setUser(null);
      setAssociado(null);
      setIsAdmin(false);
      setPrimeiroAcesso(false);
    }
  }, []);

  // ─── Context value memoizado ──────────────────────────────────────────────

  const contextValue = useMemo(
    () => ({
      session,
      user,
      associado,
      isAdmin,
      isLoading,
      primeiroAcesso,
      setPrimeiroAcesso,
      timerResetTimestampRef: resetTimestampRef,
      resetarTimer: resetar,
      dataRefreshKey,
      signIn,
      signOut,
    }),
    [
      session,
      user,
      associado,
      isAdmin,
      isLoading,
      primeiroAcesso,
      resetar,
      resetTimestampRef,
      dataRefreshKey,
      signIn,
      signOut,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <ModalSessaoExpirando
        visivel={mostrarAviso && !!session}
        segundosRestantes={contador}
        onContinuar={handleContinuar}
      />
      <ModalPrimeiroAcesso
        visivel={!!session && primeiroAcesso}
        onConcluido={() => setPrimeiroAcesso(false)}
      />
    </AuthContext.Provider>
  );
}
