import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Pencil,
  Trash2,
  Plus,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { EventoLista } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminEventos() {
  const [eventos, setEventos]           = useState<EventoLista[]>([]);
  const [carregando, setCarregando]     = useState(true);
  const [erro, setErro]                 = useState("");
  const [mostrarPassados, setMostrarPassados] = useState(false);
  const [confirmandoId, setConfirmandoId]     = useState<string | null>(null);

  const carregarEventos = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const { data, error } = await supabase
        .from("vw_eventos_lista")
        .select("*")
        .order("data_evento", { ascending: false });

      if (error) {
        // Erro de autenticação — redireciona para login
        if (error.code === "PGRST301" || error.message?.includes("JWT")) {
          window.location.href = "/entrar";
          return;
        }
        setErro("Nao foi possivel carregar os eventos. Tente novamente.");
        setCarregando(false);
        return;
      }

      setEventos((data as EventoLista[]) ?? []);
    } catch {
      setErro("Erro de conexao. Verifique sua internet e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await carregarEventos();
    })();
  }, [carregarEventos]);

  async function handleExcluir(id: string) {
    const { error } = await supabase.from("eventos").delete().eq("id", id);
    if (error) {
      alert("Não foi possivel excluir o evento. Tente novamente.");
      return;
    }
    setConfirmandoId(null);
    setEventos((prev) => prev.filter((e) => e.id !== id));
  }

  const eventosFuturos  = eventos.filter((e) => e.status_evento !== "realizado");
  const eventosPassados = eventos.filter((e) => e.status_evento === "realizado");

  function formatarData(data: string) {
    return format(new Date(data), "dd 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR });
  }

  function badgeStatus(status: string) {
    switch (status) {
      case "aberto":    return <span className="badge-green">Inscricoes abertas</span>;
      case "em_breve":  return <span className="badge-blue">Em breve</span>;
      case "encerrado": return <span className="badge-amber">Encerrado</span>;
      default:          return null;
    }
  }

  function CardEvento({ evento }: { evento: EventoLista }) {
    const realizado = evento.status_evento === "realizado";

    return (
      <>
        <div className={`bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${realizado ? "opacity-60" : ""}`}>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-gray-800 text-base">
                {evento.destino}
              </span>
              {badgeStatus(evento.status_evento)}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarDays size={14} />
                {formatarData(evento.data_evento)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={14} />
                {evento.total_inscritos} inscritos
              </span>
              <span className="text-gray-400">
                {evento.vagas_disponiveis} vagas restantes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Ver inscritos */}
            <Link
              to={`/admin/inscritos/${evento.id}`}
              title="Ver inscritos"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors"
              style={{ backgroundColor: "#16a34a" }}
            >
              <Users size={16} />
            </Link>

            {/* Editar — bloqueado para eventos realizados */}
            {realizado ? (
              <div
                title="Evento ja realizado — edicao nao permitida"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white cursor-not-allowed opacity-40"
                style={{ backgroundColor: "#16a34a" }}
              >
                <Pencil size={16} />
              </div>
            ) : (
              <Link
                to={`/admin/editar-evento/${evento.id}`}
                title="Editar evento"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#16a34a" }}
              >
                <Pencil size={16} />
              </Link>
            )}

            {/* Excluir */}
            <button
              title="Excluir evento"
              onClick={() => setConfirmandoId(evento.id)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Modal de confirmacao de exclusao */}
        {confirmandoId === evento.id && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-modal p-8 max-w-sm w-full mx-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <h2 className="font-display text-lg font-bold text-gray-800 mb-2">
                Excluir evento?
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                <strong>{evento.destino}</strong> será removido permanentemente.
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmandoId(null)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleExcluir(evento.id)}
                  className="btn-danger flex-1"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">

        {/* Titulo + botao */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-800">
            Administrar Eventos
          </h1>
          <Link
            to="/admin/novo-evento"
            className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors hover:opacity-90"
            style={{ backgroundColor: "#16a34a" }}
          >
            <Plus size={16} />
            Novo Evento
          </Link>
        </div>

        {/* Loading */}
        {carregando && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Erro */}
        {!carregando && erro && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle size={22} className="text-red-600" />
            </div>
            <p className="text-gray-600 text-sm">{erro}</p>
            <button
              onClick={carregarEventos}
              className="btn-primary"
              style={{ backgroundColor: "#16a34a" }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Eventos futuros */}
        {!carregando && !erro && (
          <div className="flex flex-col gap-3">
            {eventosFuturos.length === 0 && (
              <p className="text-center text-gray-500 py-12">
                Nenhum evento cadastrado ainda.
              </p>
            )}
            {eventosFuturos.map((evento) => (
              <CardEvento key={evento.id} evento={evento} />
            ))}
          </div>
        )}

        {/* Eventos realizados */}
        {!carregando && !erro && eventosPassados.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setMostrarPassados(!mostrarPassados)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              {mostrarPassados ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Eventos realizados ({eventosPassados.length})
            </button>

            {mostrarPassados && (
              <div className="flex flex-col gap-3">
                {eventosPassados.map((evento) => (
                  <CardEvento key={evento.id} evento={evento} />
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
