import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import TimePicker from "@/components/ui/TimePicker";

interface FormData {
  destino: string;
  data_evento_data: string;
  data_evento_hora: string;
  inicio_inscricao_data: string;
  inicio_inscricao_hora: string;
  fim_inscricao_data: string;
  fim_inscricao_hora: string;
  vagas_totais: string;
  aceita_dependente: boolean;
  limite_convidado: string;
  valor_titular: string;
  valor_dependente: string;
  valor_convidado: string;
}

const formInicial: FormData = {
  destino: "",
  data_evento_data: "",
  data_evento_hora: "08:00",
  inicio_inscricao_data: "",
  inicio_inscricao_hora: "08:00",
  fim_inscricao_data: "",
  fim_inscricao_hora: "23:59",
  vagas_totais: "",
  aceita_dependente: true,
  limite_convidado: "0",
  valor_titular: "",
  valor_dependente: "",
  valor_convidado: "",
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

function isoParaData(iso: string): string {
  return iso.slice(0, 10);
}

function isoParaHora(iso: string): string {
  return iso.slice(11, 16);
}

function combinarDataHora(data: string, hora: string): string {
  return new Date(`${data}T${hora}`).toISOString();
}

function dataHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── AdminFormEvento ──────────────────────────────────────────────────────────

export default function AdminFormEvento() {
  const navigate = useNavigate();
  const { eventoId } = useParams<{ eventoId: string }>();
  const isEdicao = !!eventoId;

  const [form, setForm] = useState<FormData>(formInicial);
  const [carregando, setCarregando] = useState(isEdicao);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function parseMoeda(valor: string) {
    return parseFloat(valor.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
  }

  function handleChange(campo: keyof FormData, valor: string | boolean) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function handleMoeda(campo: keyof FormData, valor: string) {
    const soNumeros = valor.replace(/[^\d]/g, "");
    const numero = parseInt(soNumeros || "0", 10) / 100;
    setForm((f) => ({ ...f, [campo]: numero.toFixed(2).replace(".", ",") }));
  }

  useEffect(() => {
    if (!isEdicao) return;
    let mounted = true;

    const buscar = async () => {
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", eventoId)
        .single();

      if (!mounted || !data) return;

      if (new Date(data.data_evento) < new Date()) {
        navigate("/admin");
        return;
      }

      setForm({
        destino: data.destino,
        data_evento_data: isoParaData(data.data_evento),
        data_evento_hora: isoParaHora(data.data_evento),
        inicio_inscricao_data: isoParaData(data.inicio_inscricao),
        inicio_inscricao_hora: isoParaHora(data.inicio_inscricao),
        fim_inscricao_data: isoParaData(data.fim_inscricao),
        fim_inscricao_hora: isoParaHora(data.fim_inscricao),
        vagas_totais: String(data.vagas_totais),
        aceita_dependente: data.aceita_dependente,
        limite_convidado: String(data.limite_convidado),
        valor_titular: formatarValor(data.valor_titular),
        valor_dependente: data.valor_dependente
          ? formatarValor(data.valor_dependente)
          : "",
        valor_convidado: data.valor_convidado
          ? formatarValor(data.valor_convidado)
          : "",
      });
      setCarregando(false);
    };

    buscar();
    return () => {
      mounted = false;
    };
  }, [eventoId, isEdicao, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!form.destino.trim()) return setErro("Informe o destino do evento.");
    if (!form.data_evento_data)
      return setErro("Informe a data do evento.");
    if (!form.inicio_inscricao_data)
      return setErro("Informe a data de início das inscrições.");
    if (!form.fim_inscricao_data)
      return setErro("Informe a data de fim das inscrições.");
    if (!form.vagas_totais) return setErro("Informe a quantidade de vagas.");
    if (!form.valor_titular) return setErro("Informe o valor do titular.");

    const dataEvento = `${form.data_evento_data}T${form.data_evento_hora}`;
    const inicioInsc = `${form.inicio_inscricao_data}T${form.inicio_inscricao_hora}`;
    const fimInsc = `${form.fim_inscricao_data}T${form.fim_inscricao_hora}`;

    if (new Date(dataEvento) <= new Date())
      return setErro("A data do evento não pode ser no passado.");
    if (inicioInsc >= fimInsc)
      return setErro("O início das inscrições deve ser anterior ao fim.");
    if (fimInsc >= dataEvento)
      return setErro(
        "O fim das inscrições deve ser anterior à data do evento."
      );

    setSalvando(true);

    const payload = {
      destino: form.destino.trim(),
      data_evento: combinarDataHora(
        form.data_evento_data,
        form.data_evento_hora
      ),
      inicio_inscricao: combinarDataHora(
        form.inicio_inscricao_data,
        form.inicio_inscricao_hora
      ),
      fim_inscricao: combinarDataHora(
        form.fim_inscricao_data,
        form.fim_inscricao_hora
      ),
      vagas_totais: parseInt(form.vagas_totais, 10),
      aceita_dependente: form.aceita_dependente,
      limite_convidado: parseInt(form.limite_convidado, 10) || 0,
      valor_titular: parseMoeda(form.valor_titular),
      valor_dependente: form.valor_dependente
        ? parseMoeda(form.valor_dependente)
        : null,
      valor_convidado: form.valor_convidado
        ? parseMoeda(form.valor_convidado)
        : null,
    };

    let error;

    if (isEdicao) {
      const res = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", eventoId);
      error = res.error;
    } else {
      const res = await supabase.from("eventos").insert({
        ...payload,
        vagas_disponiveis: payload.vagas_totais,
      });
      error = res.error;
    }

    setSalvando(false);

    if (error) {
      setErro("Erro ao salvar evento. Tente novamente.");
      return;
    }

    navigate("/admin");
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para eventos
        </button>

        <h1 className="font-display text-2xl font-bold text-gray-800 text-center mb-8">
          {isEdicao ? "Editar Evento" : "Novo Evento"}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-card border border-surface-200 p-6 sm:p-8"
        >
          <div className="flex flex-col gap-5">
            {/* Destino */}
            <div>
              <label className="label">Destino</label>
              <input
                type="text"
                value={form.destino}
                onChange={(e) => handleChange("destino", e.target.value)}
                placeholder="Ex: Beto Carrero World"
                className="field"
              />
            </div>

            {/* Data e hora do evento */}
            <div>
              <label className="label">Data e hora do evento</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.data_evento_data}
                  min={dataHoje()}
                  onChange={(e) =>
                    handleChange("data_evento_data", e.target.value)
                  }
                  className="field"
                />
                <TimePicker
                  value={form.data_evento_hora}
                  onChange={(v) => handleChange("data_evento_hora", v)}
                />
              </div>
            </div>

            {/* Início das inscrições */}
            <div>
              <label className="label">Início das inscrições</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.inicio_inscricao_data}
                  min={dataHoje()}
                  onChange={(e) =>
                    handleChange("inicio_inscricao_data", e.target.value)
                  }
                  className="field"
                />
                <TimePicker
                  value={form.inicio_inscricao_hora}
                  onChange={(v) => handleChange("inicio_inscricao_hora", v)}
                />
              </div>
            </div>

            {/* Fim das inscrições */}
            <div>
              <label className="label">Fim das inscrições</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.fim_inscricao_data}
                  min={form.inicio_inscricao_data || dataHoje()}
                  max={form.data_evento_data || undefined}
                  onChange={(e) =>
                    handleChange("fim_inscricao_data", e.target.value)
                  }
                  className="field"
                />
                <TimePicker
                  value={form.fim_inscricao_hora}
                  onChange={(v) => handleChange("fim_inscricao_hora", v)}
                />
              </div>
            </div>

            {/* Vagas + Dependentes + Convidados */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Vagas</label>
                <input
                  type="number"
                  min="1"
                  value={form.vagas_totais}
                  onChange={(e) => handleChange("vagas_totais", e.target.value)}
                  placeholder="0"
                  className="field"
                />
              </div>
              <div>
                <label className="label">Dependentes</label>
                <select
                  value={form.aceita_dependente ? "sim" : "nao"}
                  onChange={(e) =>
                    handleChange("aceita_dependente", e.target.value === "sim")
                  }
                  className="field"
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              <div>
                <label className="label">Limite convidados</label>
                <input
                  type="number"
                  min="0"
                  value={form.limite_convidado}
                  onChange={(e) =>
                    handleChange("limite_convidado", e.target.value)
                  }
                  className="field"
                />
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Valor titular</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valor_titular}
                    onChange={(e) =>
                      handleMoeda("valor_titular", e.target.value)
                    }
                    placeholder="0,00"
                    className="field pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="label">Valor dependente</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valor_dependente}
                    onChange={(e) =>
                      handleMoeda("valor_dependente", e.target.value)
                    }
                    placeholder="0,00"
                    className="field pl-9"
                    disabled={!form.aceita_dependente}
                  />
                </div>
              </div>
              <div>
                <label className="label">Valor convidado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valor_convidado}
                    onChange={(e) =>
                      handleMoeda("valor_convidado", e.target.value)
                    }
                    placeholder="0,00"
                    className="field pl-9"
                    disabled={parseInt(form.limite_convidado) === 0}
                  />
                </div>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm text-center">{erro}</p>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="btn-primary"
                style={{ backgroundColor: salvando ? "#86efac" : "#16a34a" }}
              >
                {salvando
                  ? "Salvando..."
                  : isEdicao
                  ? "Salvar alterações"
                  : "Criar evento"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
