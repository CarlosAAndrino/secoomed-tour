import { useState } from "react";
import { Eye, EyeOff, KeyRound, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  visivel: boolean;
  onConcluido: () => void;
}

function validarSenha(senha: string): string | null {
  if (senha.length < 8)
    return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(senha))
    return "A senha deve conter ao menos uma letra maiúscula.";
  if (!/[a-z]/.test(senha))
    return "A senha deve conter ao menos uma letra minúscula.";
  if (!/[0-9]/.test(senha))
    return "A senha deve conter ao menos um número.";
  if (!/[^A-Za-z0-9]/.test(senha))
    return "A senha deve conter ao menos um caractere especial (ex: !@#$%).";
  return null;
}

export default function ModalPrimeiroAcesso({ visivel, onConcluido }: Props) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  if (!visivel) return null;

  // Indicadores de força da senha
  const checks = [
    { label: "Mínimo 8 caracteres", ok: novaSenha.length >= 8 },
    { label: "Letra maiúscula", ok: /[A-Z]/.test(novaSenha) },
    { label: "Letra minúscula", ok: /[a-z]/.test(novaSenha) },
    { label: "Número", ok: /[0-9]/.test(novaSenha) },
    { label: "Caractere especial", ok: /[^A-Za-z0-9]/.test(novaSenha) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const erroValidacao = validarSenha(novaSenha);
    if (erroValidacao) return setErro(erroValidacao);
    if (novaSenha !== confirmarSenha)
      return setErro("As senhas não coincidem.");

    setSalvando(true);

    try {
      // 1. Busca o usuário atual
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setErro("Sessão expirada. Faça login novamente.");
        setSalvando(false);
        return;
      }

      // 2. Atualiza primeiro_acesso no banco ANTES de mudar a senha
      //    Quando USER_UPDATED disparar no onAuthStateChange,
      //    o associado não será recarregado (tratamos esse evento no contexto)
      const { error: erroBanco } = await supabase
        .from("associados")
        .update({ primeiro_acesso: false })
        .eq("user_id", user.id);

      if (erroBanco) {
        setErro("Erro ao atualizar dados. Tente novamente.");
        setSalvando(false);
        return;
      }

      // 3. Atualiza a senha
      const { error: erroSenha } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (erroSenha) {
        // Reverte o banco se a senha falhou
        await supabase
          .from("associados")
          .update({ primeiro_acesso: true })
          .eq("user_id", user.id);
        setErro("Erro ao atualizar a senha. Tente novamente.");
        setSalvando(false);
        return;
      }

      // 4. Mostra mensagem de sucesso por 2 segundos antes de fechar
      setSalvando(false);
      setSucesso(true);
      setTimeout(() => {
        onConcluido();
      }, 2000);

    } catch {
      setErro("Erro inesperado. Tente novamente.");
      setSalvando(false);
    }
  }

  // Tela de sucesso
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
            Senha definida com sucesso!
          </h2>
          <p className="text-gray-500 text-sm">
            Bem-vindo ao Secoomed Tour. Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal p-8 max-w-md w-full mx-4 animate-slide-up">

        {/* Ícone */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#DCFCE7" }}
        >
          <KeyRound size={24} style={{ color: "#16a34a" }} />
        </div>

        {/* Título */}
        <h2 className="font-display text-xl font-bold text-gray-800 text-center mb-1">
          Bem-vindo ao Secoomed Tour!
        </h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          Este é seu primeiro acesso. Por segurança, defina uma nova senha antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Nova senha */}
          <div>
            <label className="label">Nova senha</label>
            <div className="relative">
              <input
                type={mostrarNova ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite sua nova senha"
                className="field pr-11"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setMostrarNova(!mostrarNova)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {mostrarNova ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Indicadores de força */}
          {novaSenha.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {checks.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.ok ? "#16a34a" : "#D1D5DB" }}
                  />
                  <span style={{ color: c.ok ? "#16a34a" : "#9CA3AF" }}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Confirmar senha */}
          <div>
            <label className="label">Confirmar nova senha</label>
            <div className="relative">
              <input
                type={mostrarConfirmar ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a senha"
                className="field pr-11"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {mostrarConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm text-center">{erro}</p>
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={salvando}
            className="btn-primary w-full mt-2"
            style={{ backgroundColor: salvando ? "#86efac" : "#16a34a" }}
          >
            {salvando ? "Salvando..." : "Definir nova senha"}
          </button>

        </form>
      </div>
    </div>
  );
}