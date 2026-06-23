import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  UserCheck,
  UserX,
  KeyRound,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Upload,
  Users,
  ShieldCheck,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { Associado } from "@/types/database";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AdminInfo {
  user_id: string;
  email: string;
  nome: string;
  cpf: string;
}

type TipoConfirmacao = "inativar" | "ativar" | "senha";

interface ConfirmacaoState {
  id: string;
  tipo: TipoConfirmacao;
}

function formatarCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// ─── CardAssociado ────────────────────────────────────────────────────────────

interface CardAssociadoProps {
  associado: Associado;
  confirmando: ConfirmacaoState | null;
  processando: boolean;
  onVerDependentes: (id: string) => void;
  onConfirmar: (id: string, tipo: TipoConfirmacao) => void;
  onCancelarConfirmacao: () => void;
  onAtivarInativar: (associado: Associado) => void;
  onRedefinirSenha: (associado: Associado) => void;
}

function CardAssociado({
  associado,
  confirmando,
  processando,
  onVerDependentes,
  onConfirmar,
  onCancelarConfirmacao,
  onAtivarInativar,
  onRedefinirSenha,
}: CardAssociadoProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${!associado.ativo ? "opacity-60" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-gray-800 text-base">
            {associado.nome}
          </span>
          {associado.primeiro_acesso && (
            <span className="badge-amber">Aguardando 1º acesso</span>
          )}
          {!associado.ativo && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Inativo
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span>ID associado #{associado.nr_inscricao}</span>
          <span>CPF: {formatarCpf(associado.cpf)}</span>
          {associado.empresa && <span>{associado.empresa}</span>}
          {associado.celular && <span>{associado.celular}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          title="Ver dependentes"
          onClick={() => onVerDependentes(associado.id)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#16a34a" }}
        >
          <Users size={16} />
        </button>

        <button
          title="Redefinir senha para CPF"
          onClick={() => onConfirmar(associado.id, "senha")}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#16a34a" }}
        >
          <KeyRound size={16} />
        </button>

        {associado.ativo ? (
          <button
            title="Inativar associado"
            onClick={() => onConfirmar(associado.id, "inativar")}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            <UserX size={16} />
          </button>
        ) : (
          <button
            title="Reativar associado"
            onClick={() => onConfirmar(associado.id, "ativar")}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#16a34a" }}
          >
            <UserCheck size={16} />
          </button>
        )}
      </div>

      {confirmando?.id === associado.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-modal p-8 max-w-sm w-full mx-4 text-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmando.tipo === "inativar" ? "bg-red-100" : "bg-green-100"}`}
            >
              {confirmando.tipo === "senha" ? (
                <KeyRound size={22} className="text-green-700" />
              ) : confirmando.tipo === "inativar" ? (
                <UserX size={22} className="text-red-600" />
              ) : (
                <UserCheck size={22} className="text-green-700" />
              )}
            </div>
            <h2 className="font-display text-lg font-bold text-gray-800 mb-2">
              {confirmando.tipo === "senha"
                ? "Redefinir senha?"
                : confirmando.tipo === "inativar"
                  ? "Inativar associado?"
                  : "Reativar associado?"}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {confirmando.tipo === "senha" ? (
                <>
                  A senha de <strong>{associado.nome.split(" ")[0]}</strong>{" "}
                  será redefinida para o CPF e será solicitada nova senha no
                  próximo acesso.
                </>
              ) : confirmando.tipo === "inativar" ? (
                <>
                  <strong>{associado.nome.split(" ")[0]}</strong> não poderá se
                  inscrever em novos eventos, mas mantém acesso às suas
                  inscrições existentes.
                </>
              ) : (
                <>
                  <strong>{associado.nome.split(" ")[0]}</strong> voltará a ter
                  acesso completo ao sistema.
                </>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancelarConfirmacao}
                disabled={processando}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                disabled={processando}
                onClick={() =>
                  confirmando.tipo === "senha"
                    ? onRedefinirSenha(associado)
                    : onAtivarInativar(associado)
                }
                className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors"
                style={{
                  backgroundColor:
                    confirmando.tipo === "inativar" ? "#ef4444" : "#16a34a",
                }}
              >
                {processando
                  ? "Aguarde..."
                  : confirmando.tipo === "senha"
                    ? "Redefinir"
                    : confirmando.tipo === "inativar"
                      ? "Inativar"
                      : "Reativar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AdminAssociados ──────────────────────────────────────────────────────────

export default function AdminAssociados() {
  const navigate = useNavigate();
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [mostrarAdmins, setMostrarAdmins] = useState(false);
  const [confirmando, setConfirmando] = useState<ConfirmacaoState | null>(null);
  const [processando, setProcessando] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [resultadoImport,] = useState<{
    criados: number;
    atualizados: number;
    inativados: number;
    erros: unknown[];
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // ─── Busca ────────────────────────────────────────────────────────────────────
  // As duas chamadas são DESACOPLADAS: a lista de associados é o essencial e
  // controla o estado de loading. A lista de admins é secundária — se falhar
  // (ex: 400), não trava a tela; apenas os admins não aparecem na seção própria.
  useEffect(() => {
    let mounted = true;

    const buscar = async () => {
      setCarregando(true);
      setErro("");

      // 1. ESSENCIAL: lista de associados
      try {
        const { data, error } = await supabase
          .from("associados")
          .select("*")
          .order("nome");

        if (!mounted) return;

        if (error) {
          if (error.code === "PGRST301" || error.message?.includes("JWT")) {
            window.location.href = "/entrar";
            return;
          }
          setErro("Não foi possível carregar os associados.");
          setCarregando(false);
          return;
        }

        setAssociados((data as Associado[]) ?? []);
      } catch {
        if (!mounted) return;
        setErro("Erro de conexão. Verifique sua internet.");
        setCarregando(false);
        return;
      }

      // Lista principal OK → libera a tela imediatamente
      if (mounted) setCarregando(false);

      // 2. SECUNDÁRIO: lista de admins (não bloqueia a tela)
      try {
        const { data: adminsData, error: adminsError } =
          await supabase.rpc("listar_admins");
        if (!mounted) return;
        if (!adminsError && adminsData) {
          setAdmins(adminsData as AdminInfo[]);
        }
      } catch {
        /* admins é opcional — ignora falha */
      }
    };

    buscar();

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  // ─── Filtros ──────────────────────────────────────────────────────────────────
  const adminIds = new Set(admins.map((a) => a.user_id));

  const filtrados = associados.filter((a) => {
    const termo = busca.toLowerCase();
    return (
      !adminIds.has(a.user_id ?? "") &&
      (a.nome.toLowerCase().includes(termo) ||
        a.cpf.includes(termo.replace(/\D/g, "")))
    );
  });

  const ativos = filtrados.filter((a) => a.ativo);
  const inativos = filtrados.filter((a) => !a.ativo);

  function mostrarFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3000);
  }

  // ─── Ações ───────────────────────────────────────────────────────────────────
  async function handleAtivarInativar(associado: Associado) {
    setProcessando(true);
    const { error } = await supabase
      .from("associados")
      .update({ ativo: !associado.ativo })
      .eq("id", associado.id);

    if (error) {
      mostrarFeedback("Erro ao atualizar. Tente novamente.");
    } else {
      setAssociados((prev) =>
        prev.map((a) =>
          a.id === associado.id ? { ...a, ativo: !a.ativo } : a,
        ),
      );
      mostrarFeedback(
        associado.ativo
          ? `${associado.nome.split(" ")[0]} inativado.`
          : `${associado.nome.split(" ")[0]} reativado.`,
      );
    }
    setProcessando(false);
    setConfirmando(null);
  }

  async function handleRedefinirSenha(associado: Associado) {
    setProcessando(true);
    const { data, error } = await supabase.rpc("admin_redefinir_senha", {
      p_cpf: associado.cpf,
    });

    if (error || data !== "Senha redefinida com sucesso") {
      mostrarFeedback("Erro ao redefinir senha.");
    } else {
      setAssociados((prev) =>
        prev.map((a) =>
          a.id === associado.id ? { ...a, primeiro_acesso: true } : a,
        ),
      );
      mostrarFeedback(
        `Senha de ${associado.nome.split(" ")[0]} redefinida para o CPF.`,
      );
    }
    setProcessando(false);
    setConfirmando(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl font-bold text-gray-800">
            Associados
          </h1>
          <button
            onClick={() => navigate("/admin/importar")}
            className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors cursor-pointer hover:opacity-90"
            style={{ backgroundColor: "#16a34a" }}
          >
            <Upload size={16} />
            Importar base
          </button>
        </div>

        {resultadoImport && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6 text-sm text-green-800">
            <p className="font-semibold mb-1">
              Importação realizada com sucesso
            </p>
            <p>
              {resultadoImport.criados} criados · {resultadoImport.atualizados}{" "}
              atualizados · {resultadoImport.inativados} inativados ·{" "}
              {resultadoImport.erros?.length ?? 0} erros
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 text-xs text-blue-700">
          <strong>Formato CSV esperado:</strong> nr_inscricao, nome, cpf,
          celular, empresa, data_nascimento
          <br />
          Associados ausentes na nova base serão inativados automaticamente.
        </div>

        <div className="relative w-full sm:w-72 mb-8">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="field pl-9 w-full"
          />
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

        {!carregando && !erro && (
          <div className="flex flex-col gap-3">
            {ativos.length === 0 && (
              <p className="text-center text-gray-500 py-12">
                Nenhum associado encontrado.
              </p>
            )}
            {ativos.map((a) => (
              <CardAssociado
                key={a.id}
                associado={a}
                confirmando={confirmando}
                processando={processando}
                onVerDependentes={(id) => navigate(`/admin/dependentes/${id}`)}
                onConfirmar={(id, tipo) => setConfirmando({ id, tipo })}
                onCancelarConfirmacao={() => setConfirmando(null)}
                onAtivarInativar={handleAtivarInativar}
                onRedefinirSenha={handleRedefinirSenha}
              />
            ))}
          </div>
        )}

        {!carregando && !erro && inativos.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setMostrarInativos(!mostrarInativos)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              {mostrarInativos ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
              Associados inativos ({inativos.length})
            </button>
            {mostrarInativos && (
              <div className="flex flex-col gap-3">
                {inativos.map((a) => (
                  <CardAssociado
                    key={a.id}
                    associado={a}
                    confirmando={confirmando}
                    processando={processando}
                    onVerDependentes={(id) =>
                      navigate(`/admin/dependentes/${id}`)
                    }
                    onConfirmar={(id, tipo) => setConfirmando({ id, tipo })}
                    onCancelarConfirmacao={() => setConfirmando(null)}
                    onAtivarInativar={handleAtivarInativar}
                    onRedefinirSenha={handleRedefinirSenha}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!carregando && !erro && admins.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setMostrarAdmins(!mostrarAdmins)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              {mostrarAdmins ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
              <ShieldCheck size={16} />
              Administradores ({admins.length})
            </button>
            {mostrarAdmins && (
              <div className="flex flex-col gap-3">
                {admins.map((admin) => (
                  <div
                    key={admin.user_id}
                    className="bg-white rounded-2xl shadow-card border border-surface-200 px-6 py-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">
                        {admin.nome}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Admin
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>CPF: {formatarCpf(admin.cpf)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
