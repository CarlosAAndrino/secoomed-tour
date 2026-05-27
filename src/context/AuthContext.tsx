import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Associado } from "@/types/database";
import { AuthContext } from "./authContextDef";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import ModalSessaoExpirando from "@/components/ui/ModalSessaoExpirando";
import ModalPrimeiroAcesso from "@/components/ui/ModalPrimeiroAcesso";

export { AuthContext };

// ─── Limpa tokens do localStorage — garante logout mesmo sem resposta do server
function limparTokensLocais() {
  const keys = Object.keys(localStorage).filter(
    (k) => k.startsWith("sb-") && k.includes("-auth-token")
  );
  keys.forEach((k) => localStorage.removeItem(k));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]     = useState<Session | null>(null);
  const [user, setUser]           = useState<User | null>(null);
  const [associado, setAssociado] = useState<Associado | null>(null);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [mostrarAviso, setMostrarAviso]     = useState(false);
  const [contador, setContador]             = useState(300);
  const contadorRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Limpeza centralizada de estado ──────────────────────────────────────────
  function limparEstadoAuth() {
    limparTokensLocais();
    setSession(null);
    setUser(null);
    setAssociado(null);
    setIsAdmin(false);
    setPrimeiroAcesso(false);
  }

  // ─── Idle timer ───────────────────────────────────────────────────────────────
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
    try { await supabase.auth.signOut(); } catch { /* ignora */ }
    limparEstadoAuth();
    window.location.href = "/entrar";
  }, []);

  const sessionAtiva = !!session;

  const { resetar, resetTimestampRef } = useIdleTimer({
    tempoLimite: 30 * 60 * 1000,
    tempoAviso:   5 * 60 * 1000,
    onAviso:   handleAviso,
    onExpirar: handleExpirar,
    ativo:     sessionAtiva,
  });

  function handleContinuar() {
    if (contadorRef.current) clearInterval(contadorRef.current);
    setMostrarAviso(false);
    resetar();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
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

  // ─── Auth listener ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          verificarAdmin(session.user);
          carregarAssociado(session.user.id).finally(() => {
            if (mounted) setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "TOKEN_REFRESHED") {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) verificarAdmin(session.user);
          if (mounted) setIsLoading(false);
          return;
        }

        if (event === "USER_UPDATED") {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) verificarAdmin(session.user);
          if (mounted) setIsLoading(false);
          return;
        }

        if (event === "SIGNED_OUT") {
          limparEstadoAuth();
          if (mounted) setIsLoading(false);
          window.location.href = "/entrar";
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          verificarAdmin(session.user);
          await carregarAssociado(session.user.id);
        } else {
          setAssociado(null);
          setIsAdmin(false);
        }
        if (mounted) setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ─── Verificação periódica de sessão (60s) ────────────────────────────────────
  // Detecta tokens expirados silenciosamente quando SIGNED_OUT não dispara
  useEffect(() => {
    if (!session) return;

    const verificar = async () => {
      const { error } = await supabase.auth.getUser();
      if (error) {
        limparEstadoAuth();
        window.location.href = "/entrar";
      }
    };

    const interval = setInterval(verificar, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  // ─── Auth actions ─────────────────────────────────────────────────────────────
  async function signIn(cpf: string, senha: string) {
    const cpfLimpo = cpf.replace(/[^0-9]/g, "");
    const email    = `${cpfLimpo}@secoomed.local`;
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

  // signOut resiliente — limpa estado local mesmo se o servidor falhar
  async function signOut() {
    if (contadorRef.current) clearInterval(contadorRef.current);
    setMostrarAviso(false);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignora erro do servidor — limpeza local garante o logout
    } finally {
      limparEstadoAuth();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        associado,
        isAdmin,
        isLoading,
        primeiroAcesso,
        setPrimeiroAcesso,
        timerResetTimestampRef: resetTimestampRef,
        resetarTimer: resetar,
        signIn,
        signOut,
      }}
    >
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