import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Upload, Download, AlertCircle, CheckCircle,
  FileSpreadsheet, History, RefreshCw, Users, UsersRound,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  COLUNAS_ASSOCIADOS, COLUNAS_DEPENDENTES, ErroPlanilha,
  lerPlanilha, validarAssociados, validarDependentes,
  gerarModeloAssociados, gerarModeloDependentes,
  type ResultadoValidacao, type RegistroAssociado, type RegistroDependente, type ErroLinha,
} from "@/lib/planilha";

type Aba = "associados" | "dependentes" | "historico";

interface ResultadoImport {
  criados: number; atualizados: number; inativados?: number;
  erros: { erro: string;[k: string]: unknown }[];
}
interface ItemHistorico {
  id: string; importado_em: string; tipo: "associados" | "dependentes";
  importador_nome: string; total_enviados: number;
  criados: number; atualizados: number; inativados: number; total_erros: number;
}

// ─── Sub-componentes (nível de módulo, evitando remontagem) ──────────────────

function ListaErros({ erros }: { erros: ErroLinha[] }) {
  if (erros.length === 0) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mt-4 text-sm">
      <p className="font-semibold text-red-800 mb-2 flex items-center gap-2">
        <AlertCircle size={16} /> {erros.length} linha(s) com erro — não serão importadas
      </p>
      <ul className="space-y-1 text-red-700 max-h-64 overflow-y-auto">
        {erros.slice(0, 50).map((e) => (
          <li key={e.linha}>
            <strong>Linha {e.linha}</strong> ({e.identificador}): {e.motivos.join("; ")}
          </li>
        ))}
      </ul>
      {erros.length > 50 && <p className="text-red-600 mt-2">… e mais {erros.length - 50} erro(s).</p>}
    </div>
  );
}

function Previa({ colunas, linhas }: { colunas: string[]; linhas: (string | number | null)[][] }) {
  if (linhas.length === 0) return null;
  return (
    <div className="mt-4 border border-surface-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-sm">
          <thead className="bg-surface-50 sticky top-0">
            <tr className="border-b border-surface-200">
              {colunas.map((c) => (
                <th key={c} className="text-left px-4 py-2 font-semibold text-gray-600 whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.slice(0, 20).map((linha, i) => (
              <tr key={i} className="border-b border-surface-100 last:border-0">
                {linha.map((cel, j) => (
                  <td key={j} className="px-4 py-2 text-gray-700 whitespace-nowrap">{cel ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {linhas.length > 20 && (
        <p className="text-center text-xs text-gray-500 py-2 bg-surface-50">
          … e mais {linhas.length - 20} linha(s) válida(s).
        </p>
      )}
    </div>
  );
}

function ResultadoBox({ r }: { r: ResultadoImport }) {
  const erros = r.erros?.length ?? 0;
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mt-4 text-sm text-green-800">
      <p className="font-semibold mb-1 flex items-center gap-2"><CheckCircle size={16} /> Importação concluída</p>
      <p>
        {r.criados} criado(s) · {r.atualizados} atualizado(s)
        {typeof r.inativados === "number" ? ` · ${r.inativados} inativado(s)` : ""} · {erros} erro(s)
      </p>
      {erros > 0 && (
        <ul className="mt-2 text-red-700 max-h-48 overflow-y-auto space-y-1">
          {r.erros.slice(0, 30).map((e, i) => <li key={i}>{e.erro}{e.nome ? ` — ${String(e.nome)}` : ""}</li>)}
        </ul>
      )}
    </div>
  );
}

// ─── Tela principal ──────────────────────────────────────────────────────────

export default function AdminImportacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aba, setAba] = useState<Aba>("associados");

  // Associados
  const [arquivoAssoc, setArquivoAssoc] = useState("");
  const [erroAssoc, setErroAssoc] = useState("");
  const [valAssoc, setValAssoc] = useState<ResultadoValidacao<RegistroAssociado> | null>(null);
  const [inativarAusentes, setInativarAusentes] = useState(false);
  const [importandoAssoc, setImportandoAssoc] = useState(false);
  const [resAssoc, setResAssoc] = useState<ResultadoImport | null>(null);

  // Dependentes
  const [arquivoDep, setArquivoDep] = useState("");
  const [erroDep, setErroDep] = useState("");
  const [valDep, setValDep] = useState<ResultadoValidacao<RegistroDependente> | null>(null);
  const [importandoDep, setImportandoDep] = useState(false);
  const [resDep, setResDep] = useState<ResultadoImport | null>(null);

  // Histórico
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [carregandoHist, setCarregandoHist] = useState(false);

  async function carregarHistorico() {
    setCarregandoHist(true);
    const { data, error } = await supabase.rpc("listar_importacoes");
    if (!error) setHistorico((data as ItemHistorico[]) ?? []);
    setCarregandoHist(false);
  }
  useEffect(() => { if (aba === "historico") { void Promise.resolve().then(carregarHistorico); } }, [aba]);

  // ── Handlers Associados ──
  async function aoSelecionarAssociados(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErroAssoc(""); setResAssoc(null); setValAssoc(null); setArquivoAssoc(file.name);
    try {
      const leitura = await lerPlanilha(file, COLUNAS_ASSOCIADOS);
      if (leitura.colunasFaltando.length > 0) {
        setErroAssoc(`Colunas obrigatórias ausentes: ${leitura.colunasFaltando.join(", ")}`);
        return;
      }
      setValAssoc(validarAssociados(leitura.linhas));
    } catch (err) {
      setErroAssoc(err instanceof ErroPlanilha ? err.message : "Erro ao ler a planilha.");
    }
  }
  async function importarAssociados() {
    if (!valAssoc || valAssoc.validos.length === 0) return;
    setImportandoAssoc(true);
    try {
      const { data, error } = await supabase.rpc("importar_base_associados", {
        p_associados: valAssoc.validos,
        p_inativar_ausentes: inativarAusentes,
        p_importado_por: user?.id ?? null,
        p_observacao: `Importação de associados — ${arquivoAssoc}`,
      });
      if (error) setErroAssoc("Erro ao importar: " + error.message);
      else { setResAssoc(data as ResultadoImport); setValAssoc(null); }
    } finally { setImportandoAssoc(false); }
  }

  // ── Handlers Dependentes ──
  async function aoSelecionarDependentes(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErroDep(""); setResDep(null); setValDep(null); setArquivoDep(file.name);
    try {
      const { data: assoc, error: assocErr } = await supabase.from("associados").select("nr_inscricao");
      if (assocErr) { setErroDep("Não foi possível validar os titulares: " + assocErr.message); return; }
      const set = new Set<number>((assoc ?? []).map((r: { nr_inscricao: number }) => r.nr_inscricao));
      const leitura = await lerPlanilha(file, COLUNAS_DEPENDENTES);
      if (leitura.colunasFaltando.length > 0) {
        setErroDep(`Colunas obrigatórias ausentes: ${leitura.colunasFaltando.join(", ")}`);
        return;
      }
      setValDep(validarDependentes(leitura.linhas, set));
    } catch (err) {
      setErroDep(err instanceof ErroPlanilha ? err.message : "Erro ao ler a planilha.");
    }
  }
  async function importarDependentes() {
    if (!valDep || valDep.validos.length === 0) return;
    setImportandoDep(true);
    try {
      const { data, error } = await supabase.rpc("importar_base_dependentes", {
        p_dependentes: valDep.validos,
        p_importado_por: user?.id ?? null,
        p_observacao: `Importação de dependentes — ${arquivoDep}`,
      });
      if (error) setErroDep("Erro ao importar: " + error.message);
      else { setResDep(data as ResultadoImport); setValDep(null); }
    } finally { setImportandoDep(false); }
  }

  const btnVerde = "flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors hover:opacity-90 cursor-pointer";

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <button onClick={() => navigate("/admin/associados")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6">
          <ArrowLeft size={16} /> Voltar para associados
        </button>

        <h1 className="font-display text-2xl font-bold text-gray-800 mb-6">Importação de Base</h1>

        {/* Abas */}
        <div className="flex gap-2 mb-8 border-b border-surface-200">
          {([["associados", "Associados", Users], ["dependentes", "Dependentes", UsersRound], ["historico", "Histórico", History]] as const).map(
            ([id, label, Icon]) => (
              <button key={id} onClick={() => setAba(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  aba === id ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                <Icon size={16} /> {label}
              </button>
            ))}
        </div>

        {/* ── ABA ASSOCIADOS ── */}
        {aba === "associados" && (
          <section>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 text-xs text-blue-700">
              <strong>Colunas (.xlsx):</strong> {COLUNAS_ASSOCIADOS.join(", ")}.
              A senha inicial de cada associado é o próprio CPF.
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={gerarModeloAssociados} className={btnVerde} style={{ backgroundColor: "#0ea5e9" }}>
                <Download size={16} /> Baixar modelo
              </button>
              <label className={btnVerde} style={{ backgroundColor: "#16a34a" }}>
                <Upload size={16} /> Selecionar planilha .xlsx
                <input type="file" accept=".xlsx" className="hidden" onChange={aoSelecionarAssociados} />
              </label>
              {arquivoAssoc && (
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  <FileSpreadsheet size={16} /> {arquivoAssoc}
                </span>
              )}
            </div>

            {erroAssoc && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={16} /> {erroAssoc}
              </div>
            )}

            {valAssoc && (
              <>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>{valAssoc.validos.length}</strong> válido(s) de {valAssoc.totalLinhas} ·{" "}
                  <span className="text-red-600">{valAssoc.erros.length} com erro</span>
                </p>
                <Previa
                  colunas={["Inscrição", "Nome", "CPF", "Celular", "Nascimento", "Empresa"]}
                  linhas={valAssoc.validos.map((v) => [v.nr_inscricao, v.nome, v.cpf, v.celular, v.data_nascimento, v.empresa])}
                />
                <ListaErros erros={valAssoc.erros} />

                <label className="flex items-center gap-2 text-sm text-gray-600 mt-4 cursor-pointer">
                  <input type="checkbox" checked={inativarAusentes} onChange={(e) => setInativarAusentes(e.target.checked)} />
                  Inativar associados ausentes nesta planilha
                </label>

                <button onClick={importarAssociados} disabled={importandoAssoc || valAssoc.validos.length === 0}
                  className={`${btnVerde} mt-4 disabled:opacity-50`} style={{ backgroundColor: "#16a34a" }}>
                  {importandoAssoc ? "Importando..." : `Importar ${valAssoc.validos.length} associado(s)`}
                </button>
              </>
            )}

            {resAssoc && <ResultadoBox r={resAssoc} />}
          </section>
        )}

        {/* ── ABA DEPENDENTES ── */}
        {aba === "dependentes" && (
          <section>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 text-xs text-blue-700">
              <strong>Colunas (.xlsx):</strong> {COLUNAS_DEPENDENTES.join(", ")}.
              Importe os associados antes — o titular (NRINSCRSOC_D) precisa existir.
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={gerarModeloDependentes} className={btnVerde} style={{ backgroundColor: "#0ea5e9" }}>
                <Download size={16} /> Baixar modelo
              </button>
              <label className={btnVerde} style={{ backgroundColor: "#16a34a" }}>
                <Upload size={16} /> Selecionar planilha .xlsx
                <input type="file" accept=".xlsx" className="hidden" onChange={aoSelecionarDependentes} />
              </label>
              {arquivoDep && (
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  <FileSpreadsheet size={16} /> {arquivoDep}
                </span>
              )}
            </div>

            {erroDep && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={16} /> {erroDep}
              </div>
            )}

            {valDep && (
              <>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>{valDep.validos.length}</strong> válido(s) de {valDep.totalLinhas} ·{" "}
                  <span className="text-red-600">{valDep.erros.length} com erro</span>
                </p>
                <Previa
                  colunas={["Titular (insc.)", "Seq.", "Nome", "CPF", "Nascimento"]}
                  linhas={valDep.validos.map((v) => [v.nr_inscricao_socio, v.nr_sequencia, v.nome, v.cpf, v.data_nascimento])}
                />
                <ListaErros erros={valDep.erros} />

                <button onClick={importarDependentes} disabled={importandoDep || valDep.validos.length === 0}
                  className={`${btnVerde} mt-4 disabled:opacity-50`} style={{ backgroundColor: "#16a34a" }}>
                  {importandoDep ? "Importando..." : `Importar ${valDep.validos.length} dependente(s)`}
                </button>
              </>
            )}

            {resDep && <ResultadoBox r={resDep} />}
          </section>
        )}

        {/* ── ABA HISTÓRICO ── */}
        {aba === "historico" && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">Registro de todas as importações realizadas.</p>
              <button onClick={carregarHistorico} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>

            {carregandoHist ? (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : historico.length === 0 ? (
              <p className="text-center text-gray-500 py-12">Nenhuma importação registrada ainda.</p>
            ) : (
              <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-50">
                      <tr className="border-b border-surface-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuário</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Criados</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Atualizados</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Erros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((h) => (
                        <tr key={h.id} className="border-b border-surface-100 last:border-0">
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {new Date(h.importado_em).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{h.importador_nome}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              h.tipo === "associados" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {h.tipo === "associados" ? "Associados" : "Dependentes"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">{h.criados}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{h.atualizados}</td>
                          <td className={`px-4 py-3 text-center font-medium ${h.total_erros > 0 ? "text-red-600" : "text-gray-400"}`}>
                            {h.total_erros}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}