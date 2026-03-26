import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function formatarCpf(valor: string) {
    const digits = valor.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      setErro("CPF invalido. Digite os 11 digitos.");
      return;
    }
    if (!senha) {
      setErro("Digite sua senha.");
      return;
    }

    setCarregando(true);
    const resultado = await signIn(cpfLimpo, senha);
    setCarregando(false);

    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }

    navigate("/entrar", { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header mostrarEntrar={false} />

      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-12 min-h-screen">
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20">
          {/* FORMULARIO */}
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-card p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="label" htmlFor="cpf">
                  CPF
                </label>
                <input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="123.456.789-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                  className="field"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="label" htmlFor="senha">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="field pr-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {erro && <p className="text-red-600 text-sm">{erro}</p>}

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-colors"
                style={{ backgroundColor: carregando ? "#86efac" : "#16a34a" }}
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>

              <a
                href="/esqueci-a-senha"
                className="text-sm text-gray-600 underline text-center hover:text-green-700 transition-colors"
              >
                Esqueceu a senha?
              </a>
            </form>
          </div>

          {/* QR CODES */}
          <div className="flex flex-col items-center md:items-start gap-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-gray-800 mb-1">
                Ainda não é um associado?
              </h2>
              <p className="text-gray-500 text-sm">
                Leia o QR Code ou clique para baixar
              </p>
            </div>

            <div className="flex gap-6">
              {/* Google Play */}
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white rounded-xl shadow-card p-3 border border-gray-200">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://play.google.com"
                    alt="QR Code Google Play"
                    className="w-28 h-28"
                  />
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className="text-xs font-medium text-gray-700">
                      Google Play
                    </span>
                  </div>
                </div>
                <a
                  href="https://play.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-white px-5 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: "#16a34a" }}
                >
                  Clique aqui!
                </a>
              </div>

              {/* App Store */}
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white rounded-xl shadow-card p-3 border border-gray-200">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://apps.apple.com"
                    alt="QR Code App Store"
                    className="w-28 h-28"
                  />
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className="text-xs font-medium text-gray-700">
                      App Store
                    </span>
                  </div>
                </div>
                <a
                  href="https://apps.apple.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-white px-5 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: "#16a34a" }}
                >
                  Clique aqui!
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
