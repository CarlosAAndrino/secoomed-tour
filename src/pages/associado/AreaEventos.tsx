import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  MapPin,
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { EventoLista } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ModalInscricao from "@/components/ui/ModalInscricao";

// ─── Funções utilitárias puras ────────────────────────────────────────────────

function formatarData(data: string): string {
  return format(new Date(data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
    locale: ptBR,
  });
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function badgeStatus(status: string): React.ReactNode {
  switch (status) {
    case "aberto":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
          <CheckCircle size={12} /> Inscrições abertas
        </span>
      );
    case "em_breve":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
          <CalendarDays size={12} /> Em breve
        </span>
      );
    case "encerrado":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
          <XCircle size={12} /> Encerrado
        </span>
      );
    default:
      return null;
  }
}

// ─── CardEvento — fora do componente pai ──────────────────────────────────────

interface CardEventoProps {
  evento: EventoLista;
  ativo: boolean;
  onInscrever: (evento: EventoLista) => void;
}

function CardEvento({ evento, ativo, onInscrever }: CardEventoProps) {
  const inscricaoAberta = evento.status_evento === "aberto";
  const jaInscrito = evento.titular_inscrito;
  const semVagas = evento.vagas_disponiveis <= 0;
  const podeInscrever = inscricaoAberta && !jaInscrito && !semVagas && ativo;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
      {/* Header do card */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
            <MapPin size={18} className="text-green-600 flex-shrink-0" />
            {evento.destino}
          </h3>
          {badgeStatus(evento.status_evento)}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} />
            {formatarData(evento.data_evento)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {evento.vagas_disponiveis} vagas restantes
          </span>
        </div>

        {/* Valores */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-sm">
            <DollarSign size={14} className="text-green-600" />
            <span className="text-gray-600">
              Titular:{" "}
              <strong className="text-gray-800">
                {formatarMoeda(evento.valor_titular)}
              </strong>
            </span>
          </div>
          {evento.aceita_dependente && evento.valor_dependente != null && (
            <div className="text-sm text-gray-500">
              Dependente: {formatarMoeda(evento.valor_dependente)}
            </div>
          )}
          {evento.limite_convidado > 0 && evento.valor_convidado != null && (
            <div className="text-sm text-gray-500">
              Convidado: {formatarMoeda(evento.valor_convidado)}
            </div>
          )}
        </div>

        {/* Barra de ocupação */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{evento.total_inscritos} inscritos</span>
            <span>{evento.vagas_totais} vagas</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(evento.percentual_ocupacao ?? 0, 100)}%`,
                backgroundColor:
                  (evento.percentual_ocupacao ?? 0) >= 90
                    ? "#ef4444"
                    : (evento.percentual_ocupacao ?? 0) >= 70
                    ? "#f59e0b"
                    : "#16a34a",
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer do card */}
      <div className="px-6 py-3 bg-gray-50 border-t border-surface-100 flex items-center justify-between">
        {jaInscrito ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
            <CheckCircle size={16} /> Você já está inscrito
          </span>
        ) : semVagas ? (
          <span className="text-sm text-red-500 font-medium">
            Vagas esgotadas
          </span>
        ) : !ativo ? (
          <span className="text-sm text-gray-400">
            Associado inativo — inscrição bloqueada
          </span>
        ) : !inscricaoAberta ? (
          <span className="text-sm text-gray-400">
            Inscrições não disponíveis
          </span>
        ) : (
          <span />
        )}

        {podeInscrever && (
          <button
            onClick={() => onInscrever(evento)}
            className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-colors hover:opacity-90"
            style={{ backgroundColor: "#16a34a" }}
          >
            Inscrever-se
          </button>
        )}

        {jaInscrito && (
          <Link
            to="/area/inscricoes"
            className="text-sm text-green-700 font-medium underline hover:text-green-800"
          >
            Ver inscrição
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── AreaEventos ──────────────────────────────────────────────────────────────

export default function AreaEventos() {
  const { associado } = useAuth();
  const [eventos, setEventos] = useState<EventoLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [eventoSelecionado, setEventoSelecionado] =
    useState<EventoLista | null>(null);

  // ─── Busca eventos com AbortController ──────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const buscar = async () => {
      setCarregando(true);
      setErro("");

      try {
        const { data, error } = await supabase
          .from("vw_eventos_lista")
          .select("*")
          .order("data_evento", { ascending: true })
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);
        if (!mounted) return;

        if (error) {
          if (error.code === "PGRST301" || error.message?.includes("JWT")) {
            window.location.href = "/entrar";
            return;
          }
          setErro("Não foi possível carregar os eventos.");
          return;
        }

        setEventos((data as EventoLista[]) ?? []);
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (!mounted) return;
        if (err instanceof Error && err.name === "AbortError") {
          setErro("A requisição demorou muito. Verifique sua conexão.");
        } else {
          setErro("Erro de conexão. Verifique sua internet.");
        }
      } finally {
        if (mounted) setCarregando(false);
      }
    };

    buscar();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [reloadKey]);

  // ─── Recarrega ao voltar do background ──────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setReloadKey((k) => k + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const eventosVisiveis = eventos.filter(
    (e) => e.status_evento !== "realizado"
  );
  const ativo = associado?.ativo ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-800">
              Eventos disponíveis
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Confira os próximos eventos e realize sua inscrição
            </p>
          </div>
          <Link
            to="/area/inscricoes"
            className="text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors hover:opacity-90"
            style={{ backgroundColor: "#16a34a" }}
          >
            Minhas inscrições
          </Link>
        </div>

        {!ativo && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 text-sm text-amber-700">
            Sua conta está inativa. Você pode visualizar os eventos, mas não
            pode realizar novas inscrições.
          </div>
        )}

        {carregando && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!carregando && erro && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle size={22} className="text-red-600" />
            </div>
            <p className="text-gray-600 text-sm">{erro}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn-primary"
              style={{ backgroundColor: "#16a34a" }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && (
          <div className="flex flex-col gap-4">
            {eventosVisiveis.length === 0 && (
              <p className="text-center text-gray-500 py-16">
                Nenhum evento disponível no momento.
              </p>
            )}
            {eventosVisiveis.map((evento) => (
              <CardEvento
                key={evento.id}
                evento={evento}
                ativo={ativo}
                onInscrever={(ev) => setEventoSelecionado(ev)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal só é montado quando há evento selecionado */}
      {eventoSelecionado && (
        <ModalInscricao
          evento={eventoSelecionado}
          onFechar={() => setEventoSelecionado(null)}
          onSucesso={() => {
            setEventoSelecionado(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
