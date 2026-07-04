import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { InscricaoEvento, EventoLista } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from '@/hooks/useAuth'
import { loadingStart, loadingEnd, loadingError, diag } from "@/lib/diag";

function formatarData(data: string): string {
  return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}


// Anti formula-injection: prefixa ' em valores iniciando com = + - @
function esc(v: string | number | null | undefined): string | number {
  if (v == null) return "";
  if (typeof v === "number") return v;
  return /^[=+\-@]/.test(v) ? `'${v}` : v;
}
function fmtCpfX(cpf: string | null): string {
  if (!cpf) return "";
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
function fmtDataX(d: string | null): string {
  if (!d) return "";
  return format(new Date(d.length === 10 ? d + "T12:00:00" : d), "dd/MM/yyyy", { locale: ptBR });
}
function labelTipo(tipo: string): string {
  switch (tipo) {
    case "titular":
      return "Associado(a)";
    case "dependente":
      return "Dependente";
    case "convidado":
      return "Convidado";
    default:
      return tipo;
  }
}

export default function AdminInscritos() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { dataRefreshKey } = useAuth()
  const [evento, setEvento] = useState<EventoLista | null>(null);
  const [inscritos, setInscritos] = useState<InscricaoEvento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventoId) return;

    let mounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const buscar = async () => {
      loadingStart("AdminInscritos", "fetch_inscritos", { eventoId });
      setCarregando(true);
      setErro("");

      try {
        const [
          { data: ev, error: evError },
          { data: insc, error: inscError },
        ] = await Promise.all([
          supabase
            .from("vw_eventos_lista")
            .select("*")
            .eq("id", eventoId)
            .abortSignal(controller.signal)
            .single(),
          supabase
            .from("vw_inscricoes_evento")
            .select("*")
            .eq("evento_id", eventoId)
            .eq("status", "confirmada")
            .abortSignal(controller.signal)
            .order("inscrito_em", { ascending: true }),
        ]);

        clearTimeout(timeoutId);
        if (!mounted) return;

        if (evError || inscError) {
          const error = evError ?? inscError;
          loadingError("AdminInscritos", "fetch_inscritos", { erro: error?.message, code: error?.code });
          if (error?.code === "PGRST301" || error?.message?.includes("JWT")) {
            window.location.href = "/entrar";
            return;
          }
          setErro("Não foi possível carregar os inscritos. Tente novamente.");
          return;
        }

        setEvento((ev as EventoLista) ?? null);
        setInscritos((insc as InscricaoEvento[]) ?? []);
        loadingEnd("AdminInscritos", "fetch_inscritos", { qtd: (insc as InscricaoEvento[])?.length ?? 0 });
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (!mounted) return;
        loadingError("AdminInscritos", "fetch_inscritos", { erro: (err as Error)?.name });
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
  }, [eventoId, reloadKey, dataRefreshKey]);

  // ─── Toggle pagamento (AÇÃO INSTRUMENTADA) ──────────────────────────────────
  async function handleTogglePago(inscricao: InscricaoEvento) {
    const acao = "toggle_pago";
    diag("AdminInscritos", "CLICK", { acao, id: inscricao.inscricao_id });
    loadingStart("AdminInscritos", acao, { id: inscricao.inscricao_id });
    setAtualizandoId(inscricao.inscricao_id);

    const novoPago = !inscricao.pago;
    try {
      diag("AdminInscritos", "ANTES_UPDATE", { acao, id: inscricao.inscricao_id });
      const { error } = await supabase
        .from("inscricoes")
        .update({ pago: novoPago })
        .eq("id", inscricao.inscricao_id);
      diag("AdminInscritos", "DEPOIS_UPDATE", { acao, id: inscricao.inscricao_id, temErro: !!error });

      if (error) {
        loadingError("AdminInscritos", acao, { erro: error.message });
        setFeedback("Erro ao atualizar pagamento.");
      } else {
        setInscritos((prev) =>
          prev.map((i) =>
            i.inscricao_id === inscricao.inscricao_id
              ? { ...i, pago: novoPago }
              : i
          )
        );
        setFeedback(
          novoPago
            ? `Pagamento de ${inscricao.participante_nome.split(" ")[0]} confirmado.`
            : `Pagamento de ${inscricao.participante_nome.split(" ")[0]} desmarcado.`
        );
        loadingEnd("AdminInscritos", acao, { novoPago });
      }
    } catch (e) {
      loadingError("AdminInscritos", acao, { erro: (e as Error)?.name });
      setFeedback("Erro ao atualizar pagamento.");
    }

    setAtualizandoId(null);
    setTimeout(() => setFeedback(""), 3000);
  }

  // ─── Marcar todos como pagos (AÇÃO INSTRUMENTADA) ───────────────────────────
  async function handleMarcarTodosPagos() {
    if (!eventoId) return;
    const naoPagos = confirmados.filter((i) => !i.pago);
    if (naoPagos.length === 0) return;

    const acao = "marcar_todos_pagos";
    diag("AdminInscritos", "CLICK", { acao, qtd: naoPagos.length });
    loadingStart("AdminInscritos", acao, { qtd: naoPagos.length });
    setAtualizandoId("todos");

    try {
      diag("AdminInscritos", "ANTES_UPDATE", { acao });
      const { error } = await supabase
        .from("inscricoes")
        .update({ pago: true })
        .eq("evento_id", eventoId)
        .eq("status", "confirmada")
        .eq("pago", false);
      diag("AdminInscritos", "DEPOIS_UPDATE", { acao, temErro: !!error });

      if (error) {
        loadingError("AdminInscritos", acao, { erro: error.message });
        setFeedback("Erro ao atualizar pagamentos.");
      } else {
        setInscritos((prev) => prev.map((i) => ({ ...i, pago: true })));
        setFeedback(`${naoPagos.length} inscrição(ões) marcada(s) como paga(s).`);
        loadingEnd("AdminInscritos", acao, {});
      }
    } catch (e) {
      loadingError("AdminInscritos", acao, { erro: (e as Error)?.name });
      setFeedback("Erro ao atualizar pagamentos.");
    }

    setAtualizandoId(null);
    setTimeout(() => setFeedback(""), 3000);
  }

  const confirmados = inscritos.filter((i) => i.status === "confirmada");

  // Grupos por titular (associado_id): titular > dependentes > convidados
  const grupos = (() => {
    const mapa = new Map<string, { titular: InscricaoEvento | null; subs: InscricaoEvento[]; nome: string }>();
    for (const i of confirmados) {
      let g = mapa.get(i.associado_id);
      if (!g) { g = { titular: null, subs: [], nome: i.associado_nome }; mapa.set(i.associado_id, g); }
      if (i.tipo_participante === "titular") g.titular = i;
      else g.subs.push(i);
    }
    for (const g of mapa.values()) {
      g.subs.sort((x, y) =>
        x.tipo_participante === y.tipo_participante
          ? x.participante_nome.localeCompare(y.participante_nome)
          : x.tipo_participante === "dependente" ? -1 : 1);
    }
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  })();
  const totalPagos = confirmados.filter((i) => i.pago).length;
  const valorTotal = confirmados.reduce(
    (acc, i) => acc + (i.valor_inscricao ?? 0),
    0
  );
  const valorPago = confirmados
    .filter((i) => i.pago)
    .reduce((acc, i) => acc + (i.valor_inscricao ?? 0), 0);


  function exportarXlsx() {
    if (!evento || confirmados.length === 0) return;

    const linhas = confirmados.map((i) => ({
      "Evento": esc(evento.destino),
      "Data do evento": fmtDataX(evento.data_evento),
      "Data da inscricao": fmtDataX(i.inscrito_em),
      "Status": i.status,
      "Pago": i.pago ? "Sim" : "Nao",
      "Valor (R$)": i.valor_inscricao ?? "",
      "Tipo": labelTipo(i.tipo_participante),
      "Participante": esc(i.participante_nome),
      "CPF participante": fmtCpfX(i.participante_cpf),
      "Titular (associado)": esc(i.associado_nome),
      "Celular titular": esc(i.associado_celular),
      "Email titular": esc(i.associado_email),
    }));

    const titulares = confirmados.filter((i) => i.tipo_participante === "titular").length;
    const dependentes = confirmados.filter((i) => i.tipo_participante === "dependente").length;
    const convidados = confirmados.filter((i) => i.tipo_participante === "convidado").length;
    const pagos = confirmados.filter((i) => i.pago).length;

    const resumo = [
      { Item: "Evento", Valor: esc(evento.destino) },
      { Item: "Data do evento", Valor: fmtDataX(evento.data_evento) },
      { Item: "Total de inscricoes", Valor: confirmados.length },
      { Item: "Titulares", Valor: titulares },
      { Item: "Dependentes", Valor: dependentes },
      { Item: "Convidados", Valor: convidados },
      { Item: "Pagos", Valor: pagos },
      { Item: "Nao pagos", Valor: confirmados.length - pagos },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), "Inscritos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");

    const slug = evento.destino.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
    XLSX.writeFile(wb, `inscritos_${slug}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      {feedback && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          <CheckCircle size={16} className="text-green-400" />
          {feedback}
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para eventos
        </button>

        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-800">
            {evento?.destino ?? (carregando ? "Carregando..." : "Evento")}
          </h1>
          {evento && (
            <p className="text-gray-500 text-sm mt-1">
              {formatarData(evento.data_evento)} &mdash;{" "}
              {confirmados.length} inscrito(s)
            </p>
          )}
          {confirmados.length > 0 && (
            <button
              onClick={exportarXlsx}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors hover:opacity-90"
              style={{ backgroundColor: "#16a34a" }}
            >
              <FileSpreadsheet size={16} /> Exportar inscritos
            </button>
          )}
        </div>

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

        {!carregando && !erro && confirmados.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" />
                <span className="text-gray-600">
                  Total:{" "}
                  <strong className="text-gray-800">
                    {formatarMoeda(valorTotal)}
                  </strong>
                </span>
              </div>
              <div className="text-gray-600">
                Pagos:{" "}
                <strong className="text-green-700">
                  {formatarMoeda(valorPago)}
                </strong>{" "}
                <span className="text-gray-400">
                  ({totalPagos}/{confirmados.length})
                </span>
              </div>
              {valorTotal - valorPago > 0 && (
                <div className="text-gray-600">
                  Pendente:{" "}
                  <strong className="text-amber-600">
                    {formatarMoeda(valorTotal - valorPago)}
                  </strong>
                </div>
              )}
            </div>

            {totalPagos < confirmados.length && (
              <button
                onClick={handleMarcarTodosPagos}
                disabled={atualizandoId === "todos"}
                className="text-sm font-semibold text-white px-4 py-2 rounded-xl transition-colors hover:opacity-90 flex-shrink-0"
                style={{ backgroundColor: "#16a34a" }}
              >
                {atualizandoId === "todos"
                  ? "Atualizando..."
                  : "Marcar todos como pagos"}
              </button>
            )}
          </div>
        )}

        {!carregando && !erro && (
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
            {confirmados.length === 0 ? (
              <p className="text-center text-gray-500 py-16">
                Nenhum inscrito confirmado neste evento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 bg-surface-50">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Nome</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Tipo</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Valor</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">ID Assoc.</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Reserva</th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-600">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((g, gi) => {
                      const linhas = g.titular ? [g.titular, ...g.subs] : g.subs;
                      return linhas.map((inscrito, li) => {
                        const ehTitular = inscrito.tipo_participante === "titular";
                        const ehUltimo = li === linhas.length - 1;
                        return (
                          <tr
                            key={inscrito.inscricao_id}
                            className={`border-b border-surface-100 last:border-0 transition-colors ${ehTitular ? "bg-surface-50/60 hover:bg-surface-50" : "hover:bg-surface-50"}`}
                          >
                            <td className="px-5 py-3 text-gray-500 font-mono">
                              {ehTitular || !g.titular ? `#${String(gi + 1).padStart(2, "0")}` : ""}
                            </td>
                            <td className={`px-5 py-3 ${ehTitular ? "font-semibold text-gray-800" : "text-gray-700"}`}>
                              {ehTitular ? (
                                inscrito.participante_nome
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <span className="text-gray-300 font-mono">{ehUltimo ? "└─" : "├─"}</span>
                                  {inscrito.participante_nome}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {labelTipo(inscrito.tipo_participante)}
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {inscrito.valor_inscricao != null
                                ? formatarMoeda(inscrito.valor_inscricao)
                                : "—"}
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {ehTitular ? inscrito.nr_inscricao : ""}
                            </td>
                            <td className="px-5 py-3 text-gray-500">
                              {formatarData(inscrito.inscrito_em)}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button
                                onClick={() => handleTogglePago(inscrito)}
                                disabled={atualizandoId === inscrito.inscricao_id}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  inscrito.pago
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                }`}
                                title={
                                  inscrito.pago
                                    ? "Clique para desmarcar pagamento"
                                    : "Clique para marcar como pago"
                                }
                              >
                                {atualizandoId === inscrito.inscricao_id ? (
                                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <DollarSign size={16} />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}