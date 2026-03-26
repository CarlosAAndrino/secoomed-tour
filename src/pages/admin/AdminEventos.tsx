import { useEffect, useState } from "react";
import {
  Users,
  Pencil,
  Trash2,
  Plus,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { EventoLista } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function AdminEventos() {
  const [eventos, setEventos] = useState<EventoLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarPassados, setMostrarPassados] = useState(false);

  useEffect(() => {
    let mounted = true;

    const buscar = async () => {
      setCarregando(true);
      const { data } = await supabase
        .from("vw_eventos_lista")
        .select("*")
        .order("data_evento", { ascending: false });
      if (!mounted) return;
      setEventos((data as EventoLista[]) ?? []);
      setCarregando(false);
    };

    buscar();

    return () => {
      mounted = false;
    };
  }, []);

  const eventosFuturos = eventos.filter((e) => e.status_evento !== "realizado");
  const eventosPassados = eventos.filter(
    (e) => e.status_evento === "realizado",
  );

  function formatarData(data: string) {
    return format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  function badgeStatus(status: string) {
    switch (status) {
      case "aberto":
        return <span className="badge-green">Inscricoes abertas</span>;
      case "em_breve":
        return <span className="badge-blue">Em breve</span>;
      case "encerrado":
        return <span className="badge-amber">Encerrado</span>;
      default:
        return null;
    }
  }

  function CardEvento({ evento }: { evento: EventoLista }) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Info */}
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

        {/* Acoes */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to={`/admin/inscritos/${evento.id}`}
            title="Ver inscritos"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors"
            style={{ backgroundColor: "#16a34a" }}
          >
            <Users size={16} />
          </Link>
          <Link
            to={`/admin/editar-evento/${evento.id}`}
            title="Editar evento"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors"
            style={{ backgroundColor: "#16a34a" }}
          >
            <Pencil size={16} />
          </Link>
          <button
            title="Excluir evento"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
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
            className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors"
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

        {/* Eventos futuros */}
        {!carregando && (
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

        {/* Eventos passados */}
        {!carregando && eventosPassados.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setMostrarPassados(!mostrarPassados)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              {mostrarPassados ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
              Eventos realizados ({eventosPassados.length})
            </button>

            {mostrarPassados && (
              <div className="flex flex-col gap-3 opacity-70">
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
