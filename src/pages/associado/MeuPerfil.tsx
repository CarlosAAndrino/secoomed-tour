import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Building2,
  CalendarDays,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Users,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Funções utilitárias ──────────────────────────────────────────────────────

function formatarCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarData(data: string): string {
  return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
}

function formatarCelular(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validarSenha(senha: string): string[] {
  const erros: string[] = [];
  if (senha.length < 8) erros.push("Mínimo de 8 caracteres");
  if (!/[A-Z]/.test(senha)) erros.push("Uma letra maiúscula");
  if (!/[a-z]/.test(senha)) erros.push("Uma letra minúscula");
  if (!/[0-9]/.test(senha)) erros.push("Um número");
  if (!/[^A-Za-z0-9]/.test(senha)) erros.push("Um caractere especial");
  return erros;
}

// ─── MeuPerfil ────────────────────────────────────────────────────────────────

export default function MeuPerfil() {
  const navigate = useNavigate();
  const { associado } = useAuth();

  // ─── Estado do celular ────────────────────────────────────────────────────
  const [celularExibido, setCelularExibido] = useState(
    associado?.celular ?? ""
  );
  const [celularInput, setCelularInput] = useState(associado?.celular ?? "");
  const [editandoCelular, setEditandoCelular] = useState(false);
  const [salvandoCelular, setSalvandoCelular] = useState(false);

  // ─── Estado da senha ──────────────────────────────────────────────────────
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [editandoSenha, setEditandoSenha] = useState(false);

  // ─── Feedback e erro ──────────────────────────────────────────────────────
  const [feedback, setFeedback] = useState("");
  const [erro, setErro] = useState("");

  if (!associado) return null;

  function mostrarFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3000);
  }

  // ─── Salvar celular ───────────────────────────────────────────────────────

  async function handleSalvarCelular() {
    const celularLimpo = celularInput.replace(/\D/g, "");

    if (celularLimpo.length > 0 && celularLimpo.length < 10) {
      setErro("Celular deve ter 10 ou 11 dígitos.");
      return;
    }

    setSalvandoCelular(true);
    setErro("");

    const { error } = await supabase
      .from("associados")
      .update({ celular: celularLimpo || null })
      .eq("id", associado.id);

    if (error) {
      setErro("Não foi possível atualizar. Tente novamente.");
    } else {
      setCelularExibido(celularLimpo);
      setEditandoCelular(false);
      mostrarFeedback("Celular atualizado com sucesso.");
    }
    setSalvandoCelular(false);
  }

  function handleCancelarCelular() {
    setCelularInput(celularExibido);
    setEditandoCelular(false);
    setErro("");
  }

  // ─── Alterar senha ────────────────────────────────────────────────────────

  async function handleAlterarSenha() {
    setErro("");

    if (!senhaAtual.trim()) {
      setErro("Informe a senha atual.");
      return;
    }

    const errosSenha = validarSenha(novaSenha);
    if (errosSenha.length > 0) {
      setErro("A nova senha precisa ter: " + errosSenha.join(", ") + ".");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }

    setSalvandoSenha(true);

    // Verifica senha atual fazendo login
    const email = `${associado.cpf}@secoomed.local`;
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: senhaAtual,
    });

    if (loginError) {
      setErro("Senha atual incorreta.");
      setSalvandoSenha(false);
      return;
    }

    // Atualiza para nova senha
    const { error: updateError } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (updateError) {
      setErro("Não foi possível alterar a senha. Tente novamente.");
    } else {
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setEditandoSenha(false);
      mostrarFeedback("Senha alterada com sucesso.");
    }
    setSalvandoSenha(false);
  }

  function handleCancelarSenha() {
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
    setEditandoSenha(false);
    setErro("");
  }

  // ─── Indicador de força da senha ──────────────────────────────────────────

  const errosSenha = novaSenha.length > 0 ? validarSenha(novaSenha) : [];
  const forcaSenha = novaSenha.length === 0 ? 0 : 5 - errosSenha.length;

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

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 pt-28 pb-12">
        <button
          onClick={() => navigate("/area")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para eventos
        </button>

        <h1 className="font-display text-2xl font-bold text-gray-800 mb-8">
          Meus dados
        </h1>

        {/* ─── Card de dados pessoais ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
          {/* Avatar + Nome */}
          <div className="px-6 pt-6 pb-4 flex items-center gap-4 border-b border-surface-100">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#16a34a" }}
            >
              <User size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-gray-800">
                {associado.nome}
              </h2>
              <p className="text-sm text-gray-500">
                Matrícula #{associado.nr_inscricao}
                {!associado.ativo && (
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                    Inativo
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Campos */}
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <CreditCard size={18} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">CPF</p>
                <p className="text-sm text-gray-800 font-medium">
                  {formatarCpf(associado.cpf)}
                </p>
              </div>
            </div>

            {associado.empresa && (
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Empresa</p>
                  <p className="text-sm text-gray-800 font-medium">
                    {associado.empresa}
                  </p>
                </div>
              </div>
            )}

            {associado.data_nascimento && (
              <div className="flex items-center gap-3">
                <CalendarDays
                  size={18}
                  className="text-gray-400 flex-shrink-0"
                />
                <div>
                  <p className="text-xs text-gray-400">Data de nascimento</p>
                  <p className="text-sm text-gray-800 font-medium">
                    {formatarData(associado.data_nascimento)}
                  </p>
                </div>
              </div>
            )}

            {/* Celular — editável */}
            <div className="flex items-start gap-3">
              <Phone size={18} className="text-gray-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-xs text-gray-400">Celular</p>
                {editandoCelular ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatarCelular(celularInput)}
                    onChange={(e) => setCelularInput(e.target.value)}
                    className="field text-sm mt-1 w-full"
                    placeholder="(41) 99999-9999"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm text-gray-800 font-medium">
                    {celularExibido
                      ? formatarCelular(celularExibido)
                      : "Não informado"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ações celular */}
          <div className="px-6 py-4 bg-gray-50 border-t border-surface-100 flex justify-end gap-3">
            {editandoCelular ? (
              <>
                <button
                  onClick={handleCancelarCelular}
                  disabled={salvandoCelular}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarCelular}
                  disabled={salvandoCelular}
                  className="btn-primary"
                  style={{
                    backgroundColor: salvandoCelular ? "#86efac" : "#16a34a",
                  }}
                >
                  {salvandoCelular ? "Salvando..." : "Salvar"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditandoCelular(true)}
                className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-colors hover:opacity-90"
                style={{ backgroundColor: "#16a34a" }}
              >
                Editar celular
              </button>
            )}
          </div>
        </div>

        {/* ─── Card de alteração de senha ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden mt-6">
          <div className="px-6 py-4 flex items-center gap-3 border-b border-surface-100">
            <KeyRound size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Alterar senha</h2>
          </div>

          {editandoSenha ? (
            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Senha atual */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Senha atual
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenhaAtual ? "text" : "password"}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="field text-sm w-full pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenhaAtual ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* Nova senha */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={mostrarNovaSenha ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="field text-sm w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarNovaSenha ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>

                {/* Indicador de força */}
                {novaSenha.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className="h-1.5 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor:
                              n <= forcaSenha
                                ? forcaSenha <= 2
                                  ? "#ef4444"
                                  : forcaSenha <= 4
                                  ? "#f59e0b"
                                  : "#16a34a"
                                : "#e5e7eb",
                          }}
                        />
                      ))}
                    </div>
                    {errosSenha.length > 0 && (
                      <p className="text-xs text-gray-400">
                        Falta: {errosSenha.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Confirmar senha */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="field text-sm w-full"
                />
                {confirmarSenha.length > 0 && confirmarSenha !== novaSenha && (
                  <p className="text-xs text-red-500 mt-1">
                    As senhas não conferem
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="px-6 py-5">
              <p className="text-sm text-gray-500">
                Altere sua senha periodicamente para manter sua conta segura.
              </p>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="px-6 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle
                  size={16}
                  className="text-red-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-red-600 text-sm">{erro}</p>
              </div>
            </div>
          )}

          {/* Ações senha */}
          <div className="px-6 py-4 bg-gray-50 border-t border-surface-100 flex justify-end gap-3">
            {editandoSenha ? (
              <>
                <button
                  onClick={handleCancelarSenha}
                  disabled={salvandoSenha}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAlterarSenha}
                  disabled={salvandoSenha}
                  className="btn-primary"
                  style={{
                    backgroundColor: salvandoSenha ? "#86efac" : "#16a34a",
                  }}
                >
                  {salvandoSenha ? "Alterando..." : "Alterar senha"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditandoSenha(true)}
                className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-colors hover:opacity-90"
                style={{ backgroundColor: "#16a34a" }}
              >
                Alterar senha
              </button>
            )}
          </div>
        </div>

        {/* Aviso */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-700 flex items-start gap-2">
          <Users size={16} className="flex-shrink-0 mt-0.5" />
          <p>
            Os dados de nome, CPF, empresa e dependentes são gerenciados pelo
            SECOOMED. Caso precise atualizar alguma informação, entre em contato
            com a administração.
          </p>
        </div>
      </main>
    </div>
  );
}
