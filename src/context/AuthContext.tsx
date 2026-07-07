import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Associado } from "@/types/database";
import { AuthContext } from "./authContextDef";
import ModalPrimeiroAcesso from "@/components/ui/ModalPrimeiroAcesso";

export { AuthContext };

function limparTokensLocais() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("sb-") && k.includes("-auth-token"))
    .forEach((k) => localStorage.removeItem(k));
  sessionStorage.removeItem("secoomed_aba_viva");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [associado, setAssociado] = useState<Associado | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);

  // dataRefreshKey permanece fixo no contexto porque as páginas o usam nos
  // arrays de dependência dos seus useEffect de fetch.
  const dataRefreshKey = 0;

  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async function carregarAssociado(userId: string) {
    try {
      const { data } = await supabase
        .from("associados")
        .select("id, nr_inscricao, nome, celular, cpf, data_nascimento, empresa, ativo, user_id, primeiro_acesso, email, email_verificado")
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

  // ─── Renovação periódica do token ─────────────────────────────────────────
  // Substitui o autoRefreshToken do supabase-js (desligado em supabase.ts).
  // Roda num intervalo fixo, desacoplado da visibilidade da aba.

  useEffect(() => {
    const TRINTA_MIN = 30 * 60 * 1000;
    const id = setInterval(async () => {
      if (!sessionRef.current) return;
      try {
        await supabase.auth.refreshSession();
      } catch {
        /* rede falhou — tenta no próximo ciclo */
      }
    }, TRINTA_MIN);
    return () => clearInterval(id);
  }, []);

  // ─── Auth actions ─────────────────────────────────────────────────────────

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
      dataRefreshKey,
      signIn,
      signOut,
    }),
    [session, user, associado, isAdmin, isLoading, primeiroAcesso, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <ModalPrimeiroAcesso
        visivel={!!session && primeiroAcesso}
        onConcluido={() => setPrimeiroAcesso(false)}
      />
    </AuthContext.Provider>
  );
}