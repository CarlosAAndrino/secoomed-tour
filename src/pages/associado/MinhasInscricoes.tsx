import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Users,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { MinhaInscricao, ParticipanteInscricao } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from '@/hooks/useAuth'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GrupoEvento {
  eventoId: string;
  destino: string;
  dataEvento: string;
  statusEvento: string;
  inscricoes: MinhaInscricao[];
}

// ─── Funções utilitárias puras ────────────────────────────────────────────────

function formatarData(data: string): string {
  return format(new Date(data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
    locale: ptBR,
  });
}

function formatarDataCurta(data: string): string {
  return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function labelTipo(tipo: string): string {
  switch (tipo) {
    case "titular":
      return "Titular";
    case "dependente":
      return "Dependente";
    case "convidado":
      return "Convidado";
    default:
      return tipo;
  }
}

function agruparPorEvento(inscricoes: MinhaInscricao[]): GrupoEvento[] {
  const mapa = new Map<string, GrupoEvento>();

  for (const insc of inscricoes) {
    const grupo = mapa.get(insc.evento_id);
    if (grupo) {
      grupo.inscricoes.push(insc);
    } else {
      mapa.set(insc.evento_id, {
        eventoId: insc.evento_id,
        destino: insc.evento_destino,
        dataEvento: insc.data_evento,
        statusEvento: insc.status_evento,
        inscricoes: [insc],
      });
    }
  }

  return Array.from(mapa.values());
}

function ordenarParticipantes(inscricoes: MinhaInscricao[]): MinhaInscricao[] {
  const ordem: Record<string, number> = { titular: 0, dependente: 1, convidado: 2 };
  return [...inscricoes].sort(
    (a, b) => (ordem[a.tipo_participante] ?? 3) - (ordem[b.tipo_participante] ?? 3)
  );
}

// ─── LinhaConfirmada — participante confirmado ────────────────────────────────

interface LinhaConfirmadaProps {
  inscricao: MinhaInscricao;
  cancelandoId: string | null;
  processando: boolean;
  onAbrirCancelamento: (id: string) => void;
  onFecharCancelamento: () => void;
  onCancelar: (inscricao: MinhaInscricao) => void;
}

function LinhaConfirmada({
  inscricao,
  cancelandoId,
  processando,
  onAbrirCancelamento,
  onFecharCancelamento,
  onCancelar,
}: LinhaConfirmadaProps) {
  const podeCancelar = inscricao.pode_cancelar;

  return (
    <>
      <div className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          <span className="text-sm font-medium text-gray-800">
            {inscricao.participante_nome}
          </span>
          <span className="text-xs text-gray-400">
            {labelTipo(inscricao.tipo_participante)}
          </span>
          {inscricao.pago && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              <DollarSign size={10} /> Pago
            </span>
          )}
          {inscricao.valor_inscricao != null && (
            <span className="text-xs text-gray-400">
              {formatarMoeda(inscricao.valor_inscricao)}
            </span>
          )}
        </div>

        {podeCancelar && (
          <button
            onClick={() => onAbrirCancelamento(inscricao.inscricao_id)}
            className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
            title="Cancelar esta inscrição"
          >
            <Trash2 size={14} />
          </button>
        )}

        {inscricao.pago && (
          <span className="text-xs text-emerald-500 flex-shrink-0">
            Cancelamento bloqueado
          </span>
        )}
      </div>

      {/* Modal de confirmação de cancelamento */}
      {cancelandoId === inscricao.inscricao_id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-modal p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h2 className="font-display text-lg font-bold text-gray-800 mb-2">
              Cancelar inscrição?
            </h2>
            <p className="text-gray-500 text-sm mb-2">
              Participante: <strong>{inscricao.participante_nome}</strong> (
              {labelTipo(inscricao.tipo_participante)})
            </p>
            <p className="text-gray-500 text-sm mb-6">
              {inscricao.tipo_participante === "titular"
                ? "Ao cancelar como titular, todas as inscrições do seu grupo (dependentes e convidados) também serão canceladas."
                : "Apenas esta inscrição individual será cancelada."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onFecharCancelamento}
                disabled={processando}
                className="btn-secondary flex-1"
              >
                Voltar
              </button>
              <button
                onClick={() => onCancelar(inscricao)}
                disabled={processando}
                className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm bg-red-500 hover:bg-red-600 transition-colors"
              >
                {processando ? "Cancelando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── LinhaCancelada — participante cancelado com botão de reinscrição ─────────

interface LinhaCanceladaProps {
  inscricao: MinhaInscricao;
  eventoAberto: boolean;
  reinscrevendoId: string | null;
  onReinscrever: (inscricao: MinhaInscricao) => void;
}

function LinhaCancelada({
  inscricao,
  eventoAberto,
  reinscrevendoId,
  onReinscrever,
}: LinhaCanceladaProps) {
  const estaReinscrevendo = reinscrevendoId === inscricao.inscricao_id;

  return (
    <div className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
        <span className="text-sm text-gray-600">
          {inscricao.participante_nome}
        </span>
        <span className="text-xs text-gray-400">
          {labelTipo(inscricao.tipo_participante)}
        </span>
        {inscricao.valor_inscricao != null && (
          <span className="text-xs text-gray-400">
            {formatarMoeda(inscricao.valor_inscricao)}
          </span>
        )}
      </div>

      {eventoAberto && (
        <button
          onClick={() => onReinscrever(inscricao)}
          disabled={estaReinscrevendo || reinscrevendoId !== null}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 text-white hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#16a34a" }}
        >
          <RotateCcw size={12} />
          {estaReinscrevendo ? "..." : "Reinscrever"}
        </button>
      )}
    </div>
  );
}

// ─── CardGrupoConfirmado ──────────────────────────────────────────────────────

interface CardGrupoConfirmadoProps {
  grupo: GrupoEvento;
  cancelandoId: string | null;
  processando: boolean;
  onAbrirCancelamento: (id: string) => void;
  onFecharCancelamento: () => void;
  onCancelar: (inscricao: MinhaInscricao) => void;
}

function CardGrupoConfirmado({
  grupo,
  cancelandoId,
  processando,
  onAbrirCancelamento,
  onFecharCancelamento,
  onCancelar,
}: CardGrupoConfirmadoProps) {
  const ordenadas = ordenarParticipantes(grupo.inscricoes);
  const temPodeCancelar = ordenadas.some((i) => i.pode_cancelar);
  const primeiraInsc = ordenadas[0];

  return (
    <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <MapPin size={16} className="text-green-600 flex-shrink-0" />
              {grupo.destino}
            </h3>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <CalendarDays size={14} />
                {formatarData(grupo.dataEvento)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={14} />
                {grupo.inscricoes.length} participante(s)
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0">
            <CheckCircle size={12} /> Confirmada
          </span>
        </div>
        {temPodeCancelar && primeiraInsc && (
          <p className="text-xs text-gray-400 mt-2">
            Cancelamento até{" "}
            {formatarDataCurta(primeiraInsc.data_limite_cancelamento)}
          </p>
        )}
      </div>

      <div className="px-2 py-2 divide-y divide-surface-50">
        {ordenadas.map((insc) => (
          <LinhaConfirmada
            key={insc.inscricao_id}
            inscricao={insc}
            cancelandoId={cancelandoId}
            processando={processando}
            onAbrirCancelamento={onAbrirCancelamento}
            onFecharCancelamento={onFecharCancelamento}
            onCancelar={onCancelar}
          />
        ))}
      </div>
    </div>
  );
}

// ─── CardGrupoCancelado ───────────────────────────────────────────────────────

interface CardGrupoCanceladoProps {
  grupo: GrupoEvento;
  reinscrevendoId: string | null;
  onReinscrever: (inscricao: MinhaInscricao) => void;
}

function CardGrupoCancelado({
  grupo,
  reinscrevendoId,
  onReinscrever,
}: CardGrupoCanceladoProps) {
  const ordenadas = ordenarParticipantes(grupo.inscricoes);
  const eventoAberto = grupo.statusEvento === "aberto";

  return (
    <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden opacity-60 hover:opacity-80 transition-opacity">
      <div className="px-6 py-4 border-b border-surface-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <MapPin size={16} className="text-gray-400 flex-shrink-0" />
              {grupo.destino}
            </h3>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <CalendarDays size={14} />
                {formatarData(grupo.dataEvento)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-600">
              <XCircle size={12} /> Cancelada
            </span>
            {eventoAberto && (
              <span className="text-xs text-green-600 font-medium">
                Inscrições abertas
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-2 py-2 divide-y divide-surface-50">
        {ordenadas.map((insc) => (
          <LinhaCancelada
            key={insc.inscricao_id}
            inscricao={insc}
            eventoAberto={eventoAberto}
            reinscrevendoId={reinscrevendoId}
            onReinscrever={onReinscrever}
          />
        ))}
      </div>
    </div>
  );
}

// ─── MinhasInscricoes ─────────────────────────────────────────────────────────

export default function MinhasInscricoes() {
  const navigate = useNavigate();

  const [inscricoes, setInscricoes] = useState<MinhaInscricao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [cancelandoId, setCancelando] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [reinscrevendoId, setReinscrevendoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [canceladasAberto, setCanceladasAberto] = useState(false);
  const { dataRefreshKey } = useAuth()

  // ─── Busca inscrições ─────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const buscar = async () => {
      setCarregando(true);
      setErro("");

      try {
        const { data, error } = await supabase
          .from("vw_minhas_inscricoes")
          .select("*")
          .abortSignal(controller.signal)
          .order("data_evento", { ascending: false });

        clearTimeout(timeoutId);
        if (!mounted) return;

        if (error) {
          if (error.code === "PGRST301" || error.message?.includes("JWT")) {
            window.location.href = "/entrar";
            return;
          }
          setErro("Não foi possível carregar suas inscrições.");
          return;
        }

        setInscricoes((data as MinhaInscricao[]) ?? []);
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
  }, [reloadKey, dataRefreshKey]);

  function mostrarFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 4000);
  }

  // ─── Cancelamento ─────────────────────────────────────────────────────────
  async function handleCancelar(inscricao: MinhaInscricao) {
    setProcessando(true);

    try {
      const { data, error } = await supabase.rpc("cancelar_inscricao", {
        p_inscricao_id: inscricao.inscricao_id,
      });

      const resultado = data as Record<string, unknown> | null;

      if (error) {
        mostrarFeedback("Erro ao cancelar. Tente novamente.");
      } else if (resultado?.erro) {
        mostrarFeedback(resultado.erro as string);
      } else {
        mostrarFeedback(
          (resultado?.mensagem as string) ?? "Inscrição cancelada."
        );
        setReloadKey((k) => k + 1);
      }
    } catch {
      mostrarFeedback("Erro inesperado. Tente novamente.");
    } finally {
      setProcessando(false);
      setCancelando(null);
    }
  }

  // ─── Reinscrição individual ───────────────────────────────────────────────
  async function handleReinscrever(inscricao: MinhaInscricao) {
    setReinscrevendoId(inscricao.inscricao_id);

    let participante: ParticipanteInscricao;

    if (inscricao.tipo_participante === "titular") {
      participante = { tipo: "titular" };
    } else if (
      inscricao.tipo_participante === "dependente" &&
      inscricao.dependente_id
    ) {
      participante = {
        tipo: "dependente",
        dependente_id: inscricao.dependente_id,
      };
    } else if (inscricao.tipo_participante === "convidado") {
      participante = {
        tipo: "convidado",
        nome: inscricao.participante_nome,
        cpf: inscricao.participante_cpf ?? undefined,
      };
    } else {
      mostrarFeedback("Tipo de participante inválido.");
      setReinscrevendoId(null);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("reservar_evento", {
        p_evento_id: inscricao.evento_id,
        p_participantes: [participante],
      });

      const resultado = data as Record<string, unknown> | null;

      if (error) {
        mostrarFeedback("Erro ao reinscrever. Tente novamente.");
      } else if (resultado?.erro) {
        mostrarFeedback(resultado.erro as string);
      } else {
        mostrarFeedback(
          `${inscricao.participante_nome.split(" ")[0]} reinscrito(a) com sucesso!`
        );
        setReloadKey((k) => k + 1);
      }
    } catch {
      mostrarFeedback("Erro inesperado. Tente novamente.");
    } finally {
      setReinscrevendoId(null);
    }
  }

  // ─── Agrupamento ──────────────────────────────────────────────────────────
  const confirmadas = inscricoes.filter((i) => i.status === "confirmada");
  const canceladas = inscricoes.filter((i) => i.status === "cancelada");

  const gruposConfirmados = agruparPorEvento(confirmadas);
  const gruposCancelados = agruparPorEvento(canceladas);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      {feedback && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          <CheckCircle size={16} className="text-green-400" />
          {feedback}
        </div>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <button
          onClick={() => navigate("/area")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para eventos
        </button>

        <h1 className="font-display text-2xl font-bold text-gray-800 mb-8">
          Minhas inscrições
        </h1>

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

        {/* Confirmadas — agrupadas por evento */}
        {!carregando && !erro && (
          <div className="flex flex-col gap-4">
            {gruposConfirmados.length === 0 &&
              gruposCancelados.length === 0 && (
                <p className="text-center text-gray-500 py-16">
                  Você ainda não tem nenhuma inscrição.
                </p>
              )}
            {gruposConfirmados.map((grupo) => (
              <CardGrupoConfirmado
                key={grupo.eventoId}
                grupo={grupo}
                cancelandoId={cancelandoId}
                processando={processando}
                onAbrirCancelamento={setCancelando}
                onFecharCancelamento={() => setCancelando(null)}
                onCancelar={handleCancelar}
              />
            ))}
          </div>
        )}

        {/* Canceladas — dropdown colapsável */}
        {!carregando && !erro && gruposCancelados.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setCanceladasAberto(!canceladasAberto)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              {canceladasAberto ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
              Inscrições canceladas ({canceladas.length})
            </button>

            {canceladasAberto && (
              <div className="flex flex-col gap-4">
                {gruposCancelados.map((grupo) => (
                  <CardGrupoCancelado
                    key={grupo.eventoId}
                    grupo={grupo}
                    reinscrevendoId={reinscrevendoId}
                    onReinscrever={handleReinscrever}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
