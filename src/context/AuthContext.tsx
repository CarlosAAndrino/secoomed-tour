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
  const keys = Object.keys(localStorage).filter(
    (k) => k.startsWith("sb-") && k.includes("-auth-token")
  );
  keys.forEach((k) => localStorage.removeItem(k));
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

  // ─── Idle timer ───────────────────────────────────────────────────────────
  const handleAviso = useCallback(() => {
    setContador(300);
    setMostrarAviso(true);
    contadorRef.current = setInterval(() => {
      setContador((c) => c - 1);
    }, 1000);
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

  const sessionAtiva = !!session;

  const { resetar, resetTimestampRef } = useIdleTimer({
    tempoLimite: 30 * 60 * 1000,
    tempoAviso: 5 * 60 * 1000,
    onAviso: handleAviso,
    onExpirar: handleExpirar,
    ativo: sessionAtiva,
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

  // ─── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          verificarAdmin(s.user);
          carregarAssociado(s.user.id).finally(() => {
            if (mounted) setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;

      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) verificarAdmin(s.user);
        return;
      }

      if (event === "SIGNED_OUT") {
        limparTokensLocais();
        setSession(null);
        setUser(null);
        setAssociado(null);
        setIsAdmin(false);
        setIsLoading(false);
        window.location.href = "/entrar";
        return;
      }

      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        verificarAdmin(s.user);
        await carregarAssociado(s.user.id);
      } else {
        setAssociado(null);
        setIsAdmin(false);
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ─── Visibilitychange centralizado ────────────────────────────────────────
  // Quando a aba volta do background, renova o token ANTES de sinalizar
  // para os componentes refazerem fetch. Resolve a race condition.
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible" || !session) return;

      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          limparTokensLocais();
          setSession(null);
          setUser(null);
          setAssociado(null);
          setIsAdmin(false);
          window.location.href = "/entrar";
          return;
        }

        // Token renovado — agora sinaliza os componentes para refazer fetch
        setSession(data.session);
        setUser(data.session.user);
        setDataRefreshKey((k) => k + 1);
      } catch {
        // Erro de rede — não desloga, mantém dados em cache
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [session]);

  // ─── Auth actions ─────────────────────────────────────────────────────────
  async function signIn(cpf: string, senha: string) {
    const cpfLimpo = cpf.replace(/[^0-9]/g, "");
    const email = `${cpfLimpo}@secoomed.local`;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error)
      return {
        erro: "CPF ou senha incorretos. Verifique seus dados e tente novamente.",
      };
    return {};
  }

  async function signOut() {
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
    }
  }

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
