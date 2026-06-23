import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Pencil, Trash2, Plus, CalendarDays,
  ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { EventoLista } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatarData(data: string): string {
  return format(new Date(data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
}

// ─── Log de diagnóstico autônomo (sem dependência externa) ──────────────────
// Remover quando o bug de loading infinito for confirmado resolvido.
function logLoading(evento: string, payload?: Record<string, unknown>) {
  console.log(
    `%c[LOADING ${Math.round(performance.now())}ms] %cAdminEventos %c${evento}`,
    "color:#888",
    "color:#16a34a;font-weight:bold",
    "color:#2563eb;font-weight:bold",
    payload ?? ""
  );
}

function badgeStatus(status: string): React.ReactNode {
  switch (status) {
    case "aberto":    return <span className="badge-green">Inscrições abertas</span>;
    case "em_breve":  return <span className="badge-blue">Em breve</span>;
    case "encerrado": return <span className="badge-amber">Encerrado</span>;
    default:          return null;
  }
}

interface CardEventoProps {
  evento: EventoLista;
  confirmandoId: string | null;
  onAbrirConfirmacao: (id: string) => void;
  onFecharConfirmacao: () => void;
  onExcluir: (id: string) => void;
}

function CardEvento({ evento, confirmandoId, onAbrirConfirmacao, onFecharConfirmacao, onExcluir }: CardEventoProps) {
  const realizado = evento.status_evento === "realizado";
  return (
    <>
      <div className={`bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${realizado ? "opacity-60" : ""}`}>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-gray-800 text-base">{evento.destino}</span>
            {badgeStatus(evento.status_evento)}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><CalendarDays size={14} />{formatarData(evento.data_evento)}</span>
            <span className="flex items-center gap-1"><Users size={14} />{evento.total_inscritos} inscritos</span>
            <span className="text-gray-400">{evento.vagas_disponiveis} vagas restantes</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to={`/admin/inscritos/${evento.id}`} title="Ver inscritos" className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90" style={{ backgroundColor: "#16a34a" }}><Users size={16} /></Link>
          {realizado ? (
            <div title="Evento já realizado" className="w-9 h-9 rounded-lg flex items-center justify-center text-white cursor-not-allowed opacity-40" style={{ backgroundColor: "#16a34a" }}><Pencil size={16} /></div>
          ) : (
            <Link to={`/admin/editar-evento/${evento.id}`} title="Editar evento" className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90" style={{ backgroundColor: "#16a34a" }}><Pencil size={16} /></Link>
          )}
          <button title="Excluir evento" onClick={() => onAbrirConfirmacao(evento.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>
      {confirmandoId === evento.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-modal p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-600" /></div>
            <h2 className="font-display text-lg font-bold text-gray-800 mb-2">Excluir evento?</h2>
            <p className="text-gray-500 text-sm mb-6"><strong>{evento.destino}</strong> será removido permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={onFecharConfirmacao} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => onExcluir(evento.id)} className="btn-danger flex-1">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminEventos() {
  const { dataRefreshKey } = useAuth();
  const [eventos, setEventos] = useState<EventoLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mostrarPassados, setMostrarPassados] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // `ativo` indica se ESTA execução do efeito ainda é a vigente.
    // O timeout dispara um abort "real" (timeout). O cleanup dispara um abort
    // "de recriação". Precisamos distinguir os dois.
    let ativo = true;
    let abortPorTimeout = false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      abortPorTimeout = true;
      controller.abort();
    }, 10_000);

    const buscar = async () => {
      logLoading("LOADING_START", { reloadKey, dataRefreshKey });
      setCarregando(true);
      setErro("");

      try {
        const { data, error } = await supabase
          .from("vw_eventos_lista")
          .select("*")
          .order("data_evento", { ascending: false })
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
          if (error.code === "PGRST301" || error.message?.includes("JWT")) {
            logLoading("LOADING_ERROR", { motivo: "JWT", code: error.code });
            window.location.href = "/entrar";
            return;
          }
          if (!ativo) {
            logLoading("LOADING_ABORT", { motivo: "erro em execucao obsoleta" });
            return;
          }
          logLoading("LOADING_ERROR", { motivo: error.message });
          setErro("Não foi possível carregar os eventos.");
          setCarregando(false);
          return;
        }

        if (!ativo) {
          logLoading("LOADING_ABORT", { motivo: "sucesso em execucao obsoleta" });
          return;
        }

        setEventos((data as EventoLista[]) ?? []);
        setCarregando(false);
        logLoading("LOADING_SUCCESS", { qtd: (data as EventoLista[])?.length ?? 0 });
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        const ehAbort = err instanceof Error && err.name === "AbortError";

        if (ehAbort) {
          if (abortPorTimeout && ativo) {
            logLoading("LOADING_ABORT", { motivo: "timeout", liberaLoading: true });
            setErro("A requisição demorou muito. Verifique sua conexão.");
            setCarregando(false);
          } else {
            logLoading("LOADING_ABORT", { motivo: "recriacao", liberaLoading: false });
          }
          return;
        }

        if (!ativo) {
          logLoading("LOADING_ABORT", { motivo: "excecao em execucao obsoleta" });
          return;
        }
        logLoading("LOADING_ERROR", { motivo: (err as Error)?.name ?? "desconhecido" });
        setErro("Erro de conexão.");
        setCarregando(false);
      } finally {
        logLoading("LOADING_END", { ativo });
      }
    };

    buscar();

    return () => {
      ativo = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [reloadKey, dataRefreshKey]);

  async function handleExcluir(id: string) {
    const { error } = await supabase.from("eventos").delete().eq("id", id);
    if (error) { alert("Não foi possível excluir o evento."); return; }
    setConfirmandoId(null);
    setEventos((prev) => prev.filter((e) => e.id !== id));
  }

  const eventosFuturos = eventos.filter((e) => e.status_evento !== "realizado");
  const eventosPassados = eventos.filter((e) => e.status_evento === "realizado");

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-800">Administrar Eventos</h1>
          <Link to="/admin/novo-evento" className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors hover:opacity-90" style={{ backgroundColor: "#16a34a" }}><Plus size={16} />Novo Evento</Link>
        </div>
        {carregando && <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}
        {!carregando && erro && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><AlertCircle size={22} className="text-red-600" /></div>
            <p className="text-gray-600 text-sm">{erro}</p>
            <button onClick={() => setReloadKey((k) => k + 1)} className="btn-primary" style={{ backgroundColor: "#16a34a" }}>Tentar novamente</button>
          </div>
        )}
        {!carregando && !erro && (
          <div className="flex flex-col gap-3">
            {eventosFuturos.length === 0 && <p className="text-center text-gray-500 py-12">Nenhum evento cadastrado ainda.</p>}
            {eventosFuturos.map((evento) => <CardEvento key={evento.id} evento={evento} confirmandoId={confirmandoId} onAbrirConfirmacao={setConfirmandoId} onFecharConfirmacao={() => setConfirmandoId(null)} onExcluir={handleExcluir} />)}
          </div>
        )}
        {!carregando && !erro && eventosPassados.length > 0 && (
          <div className="mt-10">
            <button onClick={() => setMostrarPassados(!mostrarPassados)} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4">
              {mostrarPassados ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Eventos realizados ({eventosPassados.length})
            </button>
            {mostrarPassados && <div className="flex flex-col gap-3">{eventosPassados.map((evento) => <CardEvento key={evento.id} evento={evento} confirmandoId={confirmandoId} onAbrirConfirmacao={setConfirmandoId} onFecharConfirmacao={() => setConfirmandoId(null)} onExcluir={handleExcluir} />)}</div>}
          </div>
        )}
      </main>
    </div>
  );
}