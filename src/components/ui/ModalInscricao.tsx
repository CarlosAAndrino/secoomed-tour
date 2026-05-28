import { useEffect, useState } from "react";
import {
  X,
  UserCheck,
  Users,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { EventoLista, ParticipanteInscricao } from "@/types/database";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MeuDependente {
  id: string;
  nome: string;
  nr_sequencia: number;
  data_nascimento: string | null;
}

interface Convidado {
  nome: string;
  cpf: string;
}

interface Props {
  evento: EventoLista;
  onFechar: () => void;
  onSucesso: () => void;
}

// ─── Funções utilitárias ──────────────────────────────────────────────────────

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarCpf(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// ─── ModalInscricao ───────────────────────────────────────────────────────────

export default function ModalInscricao({ evento, onFechar, onSucesso }: Props) {
  const [dependentes, setDependentes] = useState<MeuDependente[]>([]);
  const [carregandoDeps, setCarregandoDeps] = useState(false);
  const [titularSelecionado, setTitularSelecionado] = useState(true);
  const [depsSelecionados, setDepsSelecionados] = useState<Set<string>>(
    new Set()
  );
  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  // ─── Reset ao trocar de evento ────────────────────────────────────────────
  const [prevEventoId, setPrevEventoId] = useState<string | null>(null);

  if (evento.id !== prevEventoId) {
    setPrevEventoId(evento.id);
    setTitularSelecionado(true);
    setDepsSelecionados(new Set());
    setConvidados([]);
    setErro("");
    setSucesso(false);
    setDependentes([]);
    setCarregandoDeps(evento.aceita_dependente);
  }

  // ─── Busca dependentes ────────────────────────────────────────────────────
  useEffect(() => {
    if (!evento.aceita_dependente) return;

    let mounted = true;

    const buscar = async () => {
      const { data } = await supabase
        .from("vw_meus_dependentes")
        .select("id, nome, nr_sequencia, data_nascimento")
        .order("nr_sequencia");

      if (mounted) {
        setDependentes((data as MeuDependente[]) ?? []);
        setCarregandoDeps(false);
      }
    };

    buscar();
    return () => {
      mounted = false;
    };
  }, [evento.id, evento.aceita_dependente]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function toggleDependente(id: string) {
    setDepsSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function adicionarConvidado() {
    if (convidados.length >= evento.limite_convidado) return;
    setConvidados((prev) => [...prev, { nome: "", cpf: "" }]);
  }

  function atualizarConvidado(
    index: number,
    campo: keyof Convidado,
    valor: string
  ) {
    setConvidados((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, [campo]: campo === "cpf" ? formatarCpf(valor) : valor }
          : c
      )
    );
  }

  function removerConvidado(index: number) {
    setConvidados((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Cálculo de valor total ───────────────────────────────────────────────

  const valorTitular = titularSelecionado ? evento.valor_titular : 0;
  const valorDeps = depsSelecionados.size * (evento.valor_dependente ?? 0);
  const valorConvidados = convidados.length * (evento.valor_convidado ?? 0);
  const valorTotal = valorTitular + valorDeps + valorConvidados;
  const totalParticipantes =
    (titularSelecionado ? 1 : 0) + depsSelecionados.size + convidados.length;

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setErro("");

    if (totalParticipantes === 0) {
      setErro("Selecione ao menos um participante.");
      return;
    }

    if (
      !titularSelecionado &&
      (depsSelecionados.size > 0 || convidados.length > 0)
    ) {
      setErro(
        "O titular deve estar inscrito para incluir dependentes ou convidados."
      );
      return;
    }

    for (const conv of convidados) {
      if (!conv.nome.trim()) {
        setErro("Informe o nome de todos os convidados.");
        return;
      }
    }

    if (totalParticipantes > evento.vagas_disponiveis) {
      setErro(
        `Vagas insuficientes. Disponíveis: ${evento.vagas_disponiveis}, solicitadas: ${totalParticipantes}.`
      );
      return;
    }

    const participantes: ParticipanteInscricao[] = [];

    if (titularSelecionado) {
      participantes.push({ tipo: "titular" });
    }

    for (const depId of depsSelecionados) {
      participantes.push({ tipo: "dependente", dependente_id: depId });
    }

    for (const conv of convidados) {
      participantes.push({
        tipo: "convidado",
        nome: conv.nome.trim(),
        cpf: conv.cpf.replace(/\D/g, "") || undefined,
      });
    }

    setSalvando(true);

    try {
      const { data, error } = await supabase.rpc("reservar_evento", {
        p_evento_id: evento.id,
        p_participantes: participantes,
      });

      if (error) {
        setErro("Erro ao processar a inscrição. Tente novamente.");
        setSalvando(false);
        return;
      }

      const resultado = data as Record<string, unknown> | null;

      if (resultado?.erro) {
        setErro(resultado.erro as string);
        setSalvando(false);
        return;
      }

      setSalvando(false);
      setSucesso(true);
      setTimeout(onSucesso, 2000);
    } catch {
      setErro("Erro inesperado. Tente novamente.");
      setSalvando(false);
    }
  }

  // ─── Tela de sucesso ──────────────────────────────────────────────────────

  if (sucesso) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-modal p-8 max-w-md w-full mx-4 text-center animate-slide-up">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#DCFCE7" }}
          >
            <CheckCircle size={32} style={{ color: "#16a34a" }} />
          </div>
          <h2 className="font-display text-xl font-bold text-gray-800 mb-2">
            Inscrição realizada!
          </h2>
          <p className="text-gray-500 text-sm">
            {totalParticipantes} participante(s) inscrito(s) com sucesso.
          </p>
        </div>
      </div>
    );
  }

  // ─── Modal principal ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl px-6 py-4 border-b border-surface-100 flex items-center justify-between z-10">
          <h2 className="font-display text-lg font-bold text-gray-800">
            Inscrição — {evento.destino}
          </h2>
          <button
            onClick={onFechar}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Titular */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <UserCheck size={16} className="text-green-600" /> Titular
            </h3>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={titularSelecionado}
                onChange={(e) => setTitularSelecionado(e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              <span className="flex-1 text-sm text-gray-700">
                Eu (titular)
              </span>
              <span className="text-sm font-medium text-gray-800">
                {formatarMoeda(evento.valor_titular)}
              </span>
            </label>
          </div>

          {/* Dependentes */}
          {evento.aceita_dependente && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Users size={16} className="text-green-600" /> Dependentes
              </h3>
              {carregandoDeps ? (
                <p className="text-sm text-gray-400 py-2">
                  Carregando dependentes...
                </p>
              ) : dependentes.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">
                  Nenhum dependente cadastrado.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dependentes.map((dep) => (
                    <label
                      key={dep.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={depsSelecionados.has(dep.id)}
                        onChange={() => toggleDependente(dep.id)}
                        className="w-4 h-4 accent-green-600"
                      />
                      <span className="flex-1 text-sm text-gray-700">
                        {dep.nome}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {formatarMoeda(evento.valor_dependente ?? 0)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Convidados */}
          {evento.limite_convidado > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <UserPlus size={16} className="text-green-600" /> Convidados
                <span className="text-xs text-gray-400 font-normal">
                  (máx. {evento.limite_convidado})
                </span>
              </h3>

              {convidados.map((conv, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 mb-2 p-3 rounded-xl border border-surface-200"
                >
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Nome do convidado"
                      value={conv.nome}
                      onChange={(e) =>
                        atualizarConvidado(index, "nome", e.target.value)
                      }
                      className="field flex-1 text-sm"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="CPF (opcional)"
                      value={conv.cpf}
                      onChange={(e) =>
                        atualizarConvidado(index, "cpf", e.target.value)
                      }
                      className="field w-full sm:w-40 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removerConvidado(index)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {convidados.length < evento.limite_convidado && (
                <button
                  type="button"
                  onClick={adicionarConvidado}
                  className="text-sm text-green-700 font-medium hover:text-green-800 transition-colors"
                >
                  + Adicionar convidado
                </button>
              )}

              {convidados.length > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  {convidados.length} convidado(s) ×{" "}
                  {formatarMoeda(evento.valor_convidado ?? 0)}
                </div>
              )}
            </div>
          )}

          {/* Resumo */}
          <div className="bg-gray-50 rounded-xl p-4 border border-surface-100">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Participantes</span>
              <span>{totalParticipantes}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-800">
              <span>Valor total</span>
              <span style={{ color: "#16a34a" }}>
                {formatarMoeda(valorTotal)}
              </span>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle
                size={16}
                className="text-red-500 flex-shrink-0 mt-0.5"
              />
              <p className="text-red-600 text-sm">{erro}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white rounded-b-2xl px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
          <button onClick={onFechar} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={salvando || totalParticipantes === 0}
            className="btn-primary"
            style={{
              backgroundColor:
                salvando || totalParticipantes === 0 ? "#86efac" : "#16a34a",
            }}
          >
            {salvando ? "Inscrevendo..." : "Confirmar inscrição"}
          </button>
        </div>
      </div>
    </div>
  );
}
