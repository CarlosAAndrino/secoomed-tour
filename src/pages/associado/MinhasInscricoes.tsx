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
} from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { MinhaInscricao } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    case "titular":    return "Titular";
    case "dependente": return "Dependente";
    case "convidado":  return "Convidado";
    default:           return tipo;
  }
}

function badgeStatusInscricao(status: string): React.ReactNode {
  if (status === "confirmada") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <CheckCircle size={12} /> Confirmada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
      <XCircle size={12} /> Cancelada
    </span>
  );
}

// ─── CardInscricao — fora do componente pai ───────────────────────────────────

interface CardInscricaoProps {
  inscricao: MinhaInscricao;
  cancelandoId: string | null;
  processando: boolean;
  onAbrirCancelamento: (id: string) => void;
  onFecharCancelamento: () => void;
  onCancelar: (inscricao: MinhaInscricao) => void;
}

function CardInscricao({
  inscricao,
  cancelandoId,
  processando,
  onAbrirCancelamento,
  onFecharCancelamento,
  onCancelar,
}: CardInscricaoProps) {
  const confirmada = inscricao.status === "confirmada";

  return (
    <>
      <div
        className={`bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4 ${
          !confirmada ? "opacity-50" : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <MapPin size={16} className="text-green-600 flex-shrink-0" />
              <span className="font-semibold text-gray-800">
                {inscricao.evento_destino}
              </span>
              {badgeStatusInscricao(inscricao.status)}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <CalendarDays size={14} />
                {formatarData(inscricao.data_evento)}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span>
                Participante: <strong className="text-gray-700">{inscricao.participante_nome}</strong>
              </span>
              <span>Tipo: {labelTipo(inscricao.tipo_participante)}</span>
              {inscricao.valor_inscricao && (
                <span>Valor: {formatarMoeda(inscricao.valor_inscricao)}</span>
              )}
              <span>Inscrito em: {formatarDataCurta(inscricao.inscrito_em)}</span>
            </div>

            {confirmada && inscricao.pode_cancelar && (
              <p className="text-xs text-gray-400 mt-2">
                Cancelamento até {formatarDataCurta(inscricao.data_limite_cancelamento)}
              </p>
            )}
          </div>

          {/* Botão cancelar — só para titular confirmado com prazo válido */}
          {confirmada && inscricao.pode_cancelar && inscricao.tipo_participante === "titular" && (
            <button
              onClick={() => onAbrirCancelamento(inscricao.inscricao_id)}
              className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <Trash2 size={16} />
              Cancelar
            </button>
          )}
        </div>
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
              Evento: <strong>{inscricao.evento_destino}</strong>
            </p>
            <p className="text-gray-500 text-sm mb-6">
              {inscricao.tipo_participante === "titular"
                ? "Ao cancelar como titular, todas as inscrições do seu grupo (dependentes e convidados) também serão canceladas."
                : "Esta inscrição será cancelada permanentemente."}
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
                {processando ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
  const [feedback, setFeedback] = useState("");

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
  }, [reloadKey]);

  // ─── Recarrega ao voltar do background ────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setReloadKey((k) => k + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // ─── Cancelamento ─────────────────────────────────────────────────────────
  async function handleCancelar(inscricao: MinhaInscricao) {
    setProcessando(true);

    try {
      const { data, error } = await supabase.rpc("cancelar_inscricao", {
        p_inscricao_id: inscricao.inscricao_id,
      });

      if (error) {
        setFeedback("Erro ao cancelar. Tente novamente.");
      } else if (data?.erro) {
        setFeedback(data.erro);
      } else {
        setFeedback(
          data?.mensagem ?? "Inscrição cancelada com sucesso."
        );
        setReloadKey((k) => k + 1);
      }
    } catch {
      setFeedback("Erro inesperado. Tente novamente.");
    } finally {
      setProcessando(false);
      setCancelando(null);
      setTimeout(() => setFeedback(""), 4000);
    }
  }

  // Separa confirmadas e canceladas
  const confirmadas = inscricoes.filter((i) => i.status === "confirmada");
  const canceladas  = inscricoes.filter((i) => i.status === "cancelada");

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      {/* Toast */}
      {feedback && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          <CheckCircle size={16} className="text-green-400" />
          {feedback}
        </div>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">

        {/* Voltar */}
        <button
          onClick={() => navigate("/area")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para eventos
        </button>

        {/* Título */}
        <h1 className="font-display text-2xl font-bold text-gray-800 mb-8">
          Minhas inscrições
        </h1>

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
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn-primary"
              style={{ backgroundColor: "#16a34a" }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Inscrições confirmadas */}
        {!carregando && !erro && (
          <div className="flex flex-col gap-3">
            {confirmadas.length === 0 && canceladas.length === 0 && (
              <p className="text-center text-gray-500 py-16">
                Você ainda não tem nenhuma inscrição.
              </p>
            )}
            {confirmadas.map((insc) => (
              <CardInscricao
                key={insc.inscricao_id}
                inscricao={insc}
                cancelandoId={cancelandoId}
                processando={processando}
                onAbrirCancelamento={setCancelando}
                onFecharCancelamento={() => setCancelando(null)}
                onCancelar={handleCancelar}
              />
            ))}
          </div>
        )}

        {/* Inscrições canceladas */}
        {!carregando && !erro && canceladas.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-gray-400 mb-3">
              Inscrições canceladas ({canceladas.length})
            </h2>
            <div className="flex flex-col gap-3">
              {canceladas.map((insc) => (
                <CardInscricao
                  key={insc.inscricao_id}
                  inscricao={insc}
                  cancelandoId={cancelandoId}
                  processando={processando}
                  onAbrirCancelamento={setCancelando}
                  onFecharCancelamento={() => setCancelando(null)}
                  onCancelar={handleCancelar}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
