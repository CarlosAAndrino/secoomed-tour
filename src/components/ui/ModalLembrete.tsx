import { useEffect, useMemo, useState } from "react";
import { Bell, Search, X, AlertCircle, CheckCircle, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { EventoLista } from "@/types/database";

interface Destinatario {
  id: string;
  nome: string;
  cpf: string;
  email: string;
}

interface Props {
  evento: EventoLista;
  onFechar: () => void;
}

function fmtBRL(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ModalLembrete({ evento, onFechar }: Props) {
  const [publico, setPublico] = useState<"todos" | "selecionados">("todos");
  const [elegiveis, setElegiveis] = useState<Destinatario[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<{ enviados: number; falhas: number; ignorados: number } | null>(null);
  const [lembreteRecente, setLembreteRecente] = useState(false);

  // Elegíveis: ativos + email verificado. Aviso de duplicidade: lembrete nas últimas 24h.
  useEffect(() => {
    supabase
      .from("associados")
      .select("id, nome, cpf, email")
      .eq("ativo", true)
      .eq("email_verificado", true)
      .not("email", "is", null)
      .order("nome")
      .then(({ data }) => setElegiveis((data as Destinatario[]) ?? []));

    supabase
      .from("log_lembretes")
      .select("id, criado_em")
      .eq("evento_id", evento.id)
      .gte("criado_em", new Date(Date.now() - 86400000).toISOString())
      .limit(1)
      .then(({ data }) => setLembreteRecente((data?.length ?? 0) > 0));
  }, [evento.id]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const dig = t.replace(/\D/g, "");
    if (!t) return elegiveis;
    return elegiveis.filter(
      (a) => a.nome.toLowerCase().includes(t) || (dig && a.cpf.includes(dig))
    );
  }, [busca, elegiveis]);

  const totalAlvo = publico === "todos" ? elegiveis.length : selecionados.size;

  function toggle(id: string) {
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function enviar() {
    setEnviando(true);
    setErro("");
    try {
      const { data, error } = await supabase.functions.invoke("enviar-lembrete-evento", {
        body: {
          evento_id: evento.id,
          destinatarios: publico === "todos" ? "todos" : Array.from(selecionados),
          app_url: window.location.origin,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResultado(data);
    } catch (e) {
      // FunctionsHttpError esconde o corpo: extrai status + mensagem reais
      let msg = (e as Error).message || "Falha ao enviar lembretes.";
      const ctx = (e as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          msg = `HTTP ${ctx.status}: ${body?.error ?? msg}`;
        } catch { msg = `HTTP ${ctx.status}: ${msg}`; }
      }
      setErro(msg);
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  }

  const dataCancel = new Date(new Date(evento.data_evento).getTime() - 2 * 86400000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-800 flex items-center gap-2">
            <Bell size={18} className="text-green-700" /> Enviar lembrete
          </h2>
          <button onClick={onFechar} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <p className="text-sm text-gray-500 mb-4">{evento.destino} — {fmtData(evento.data_evento)}</p>

        {/* Resultado final */}
        {resultado ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800">
            <p className="font-semibold flex items-center gap-2 mb-1"><CheckCircle size={16} /> Lembretes processados</p>
            <p>{resultado.enviados} enviado(s) · {resultado.falhas} falha(s) · {resultado.ignorados} ignorado(s)</p>
            <button onClick={onFechar} className="btn-primary mt-4" style={{ backgroundColor: "#16a34a" }}>Fechar</button>
          </div>
        ) : (
          <>
            {lembreteRecente && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-700 flex items-center gap-2">
                <AlertCircle size={14} /> Um lembrete deste evento já foi enviado nas últimas 24h.
              </div>
            )}

            {/* Público */}
            <div className="flex gap-2 mb-4">
              {(["todos", "selecionados"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPublico(p)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    publico === p ? "border-green-600 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p === "todos" ? `Todos elegíveis (${elegiveis.length})` : `Selecionar (${selecionados.size})`}
                </button>
              ))}
            </div>

            {publico === "selecionados" && (
              <>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por nome ou CPF..."
                    className="field pl-8 w-full text-sm"
                  />
                </div>
                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto mb-4">
                  {filtrados.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Nenhum elegível encontrado.</p>}
                  {filtrados.map((a) => (
                    <label key={a.id} className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={selecionados.has(a.id)} onChange={() => toggle(a.id)} />
                      <span className="text-sm text-gray-700 flex-1">{a.nome}</span>
                      <span className="text-xs text-gray-400">{a.cpf}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* Preview */}
            <button
              onClick={() => setPreview(!preview)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
            >
              <Eye size={14} /> {preview ? "Ocultar prévia" : "Ver prévia do email"}
            </button>
            {preview && (
              <div className="border border-gray-200 rounded-xl p-4 mb-4 text-xs text-gray-700 bg-gray-50">
                <p className="font-bold text-green-700 text-sm mb-2">Lembrete: {evento.destino}</p>
                <p>Olá, [nome]!</p>
                <ul className="mt-2 space-y-1">
                  <li><strong>Data:</strong> {fmtData(evento.data_evento)}</li>
                  <li><strong>Inscrições:</strong> {fmtData(evento.inicio_inscricao)} até {fmtData(evento.fim_inscricao)}</li>
                  <li><strong>Vagas:</strong> {evento.vagas_disponiveis} de {evento.vagas_totais}</li>
                  <li><strong>Titular:</strong> {fmtBRL(evento.valor_titular)}</li>
                  <li><strong>Dependente:</strong> {evento.aceita_dependente ? fmtBRL(evento.valor_dependente) : "Não aceita"}</li>
                  <li><strong>Convidado:</strong> {evento.limite_convidado > 0 ? `${fmtBRL(evento.valor_convidado)} (lim. ${evento.limite_convidado})` : "Não aceita"}</li>
                  <li><strong>Cancelamento até:</strong> {dataCancel.toLocaleDateString("pt-BR")}</li>
                </ul>
                <p className="mt-2 text-gray-500">Regras de participação + botão "Ver evento e inscrever-se".</p>
              </div>
            )}

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={14} /> {erro}
              </div>
            )}

            {/* Confirmação */}
            {confirmando ? (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                <p className="text-sm text-amber-800 mb-3">
                  Enviar lembrete para <strong>{totalAlvo}</strong> associado(s)?
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmando(false)} disabled={enviando} className="btn-secondary flex-1">Cancelar</button>
                  <button
                    onClick={enviar}
                    disabled={enviando}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
                    style={{ backgroundColor: "#16a34a" }}
                  >
                    {enviando ? "Enviando..." : "Confirmar envio"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmando(true)}
                disabled={totalAlvo === 0 || enviando}
                className="w-full py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50"
                style={{ backgroundColor: "#16a34a" }}
              >
                Enviar para {totalAlvo} associado(s)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
