import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Associado } from "@/types/database";
import { AuthContext } from "./authContextDef";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import ModalSessaoExpirando from "@/components/ui/ModalSessaoExpirando";
import ModalPrimeiroAcesso from "@/components/ui/ModalPrimeiroAcesso";

export { AuthContext };

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

  // -------------------------------------------------------
  // Idle timer — só ativo quando há sessão
  // -------------------------------------------------------
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
    await supabase.auth.signOut();
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

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // Auth listener
  // -------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    // Sessão inicial
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

    // Listener de mudanças
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Token renovado automaticamente — apenas atualiza sessão,
      // não recarrega o associado para evitar flicker
      if (event === "TOKEN_REFRESHED") {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) verificarAdmin(session.user);
        if (mounted) setIsLoading(false);
        return;
      }

      // Senha ou dados do usuário atualizados — não recarrega associado
      // evita loop com o modal de primeiro acesso
      if (event === "USER_UPDATED") {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) verificarAdmin(session.user);
        if (mounted) setIsLoading(false);
        return;
      }

      // Deslogado externamente (outro dispositivo, expiração forçada)
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setAssociado(null);
        setIsAdmin(false);
        if (mounted) setIsLoading(false);
        window.location.href = "/entrar";
        return;
      }

      // Login ou qualquer outro evento
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
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // -------------------------------------------------------
  // Auth actions
  // -------------------------------------------------------
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
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAssociado(null);
    setIsAdmin(false);
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
