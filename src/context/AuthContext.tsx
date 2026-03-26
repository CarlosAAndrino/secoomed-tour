import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Associado } from "@/types/database";
import { AuthContext } from "./authContextDef";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import ModalSessaoExpirando from "@/components/ui/ModalSessaoExpirando";

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [associado, setAssociado] = useState<Associado | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [contador, setContador] = useState(300);
  const contadorRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAviso = useCallback(() => {
    setContador(300); // 5 minutos de aviso
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

  const { resetar } = useIdleTimer({
    tempoLimite: 30 * 60 * 1000, // 30 minutos
    tempoAviso: 5 * 60 * 1000, // aviso 5 minutos antes
    onAviso: handleAviso,
    onExpirar: handleExpirar,
  });

  async function carregarAssociado(userId: string) {
    try {
      const { data } = await supabase
        .from("associados")
        .select("*")
        .eq("user_id", userId)
        .single();
      setAssociado(data ?? null);
    } catch {
      setAssociado(null);
    }
  }
  function handleContinuar() {
    if (contadorRef.current) clearInterval(contadorRef.current);
    setMostrarAviso(false);
    resetar();
  }

  function verificarAdmin(u: User) {
    setIsAdmin(u.app_metadata?.role === "admin");
  }

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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
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
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAssociado(null);
    setIsAdmin(false);
  }

  return (
    <AuthContext.Provider
      value={{ session, user, associado, isAdmin, isLoading, signIn, signOut }}
    >
      {children}
      <ModalSessaoExpirando
        visivel={mostrarAviso && !!session}
        segundosRestantes={contador}
        onContinuar={handleContinuar}
      />
    </AuthContext.Provider>
  );
}
