import { useState, useRef, useEffect } from "react";
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  mostrarEntrar?: boolean;
}

export default function Header({ mostrarEntrar = true }: HeaderProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const perfilRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { session, associado, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const primeiroNome = associado?.nome?.split(" ")[0] ?? "";

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (perfilRef.current && !perfilRef.current.contains(e.target as Node)) {
        setPerfilAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  function scrollPara(id: string) {
    if (location.pathname === "/") {
      const el = document.getElementById(id);
      if (el) {
        const topo = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: topo, behavior: "smooth" });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const topo = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: topo, behavior: "smooth" });
        }
      }, 300);
    }
    setMenuAberto(false);
  }

  async function handleSair() {
    setPerfilAberto(false);
    setMenuAberto(false);
    await signOut();
    // Tela branca com loading antes de redirecionar
    document.body.innerHTML = `
    <div style="
      position:fixed;inset:0;background:#fff;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:16px;
    ">
      <div style="
        width:40px;height:40px;border-radius:50%;
        border:4px solid #16a34a;
        border-top-color:transparent;
        animation:spin 0.8s linear infinite;
      "></div>
      <p style="font-family:sans-serif;font-size:14px;color:#6b7280;">Saindo...</p>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/">
            <img
              src="/images/Logo.png"
              alt="Secoomed Tour"
              className="h-30 md:h-36 w-auto object-contain"
            />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollPara("quem-somos")}
              className="text-gray-600 hover:text-green-700 font-medium transition-colors"
            >
              Quem somos
            </button>
            <button
              onClick={() => scrollPara("finalidade")}
              className="text-gray-600 hover:text-green-700 font-medium transition-colors"
            >
              Finalidade
            </button>

            {/* Aba Eventos — somente admin */}
            {session && isAdmin && (
              <Link
                to="/admin"
                className="text-gray-600 hover:text-green-700 font-medium transition-colors"
              >
                Eventos
              </Link>
            )}
          </nav>

          {/* Direita */}
          <div className="flex items-center gap-3">
            {/* Botão Entrar — somente quando não logado */}
            {!session && mostrarEntrar && (
              <a
                href="/entrar"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                Entrar
              </a>
            )}

            {/* Perfil — somente quando logado */}
            {session && (
              <div className="relative" ref={perfilRef}>
                <button
                  onClick={() => setPerfilAberto(!perfilAberto)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#16a34a" }}
                  >
                    <User size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {primeiroNome}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform hidden sm:block ${perfilAberto ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                {perfilAberto && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-modal border border-gray-100 py-1 animate-fade-in">
                    <Link
                      to="/area"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setPerfilAberto(false)}
                    >
                      <User size={15} className="text-gray-400" />
                      Minha área
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleSair}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Menu hamburguer mobile */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMenuAberto(!menuAberto)}
              aria-label="Menu"
            >
              {menuAberto ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile expandido */}
      {menuAberto && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-1 animate-fade-in">
          <button
            onClick={() => scrollPara("quem-somos")}
            className="text-left text-gray-700 font-medium py-2.5 border-b border-gray-100"
          >
            Quem somos
          </button>
          <button
            onClick={() => scrollPara("finalidade")}
            className="text-left text-gray-700 font-medium py-2.5 border-b border-gray-100"
          >
            Finalidade
          </button>
          {session && isAdmin && (
            <Link
              to="/admin"
              className="text-left text-gray-700 font-medium py-2.5 border-b border-gray-100 block"
              onClick={() => setMenuAberto(false)}
            >
              Eventos
            </Link>
          )}
          {session && (
            <>
              <Link
                to="/area"
                className="text-left text-gray-700 font-medium py-2.5 border-b border-gray-100 block"
                onClick={() => setMenuAberto(false)}
              >
                Minha area
              </Link>
              <button
                onClick={handleSair}
                className="text-left text-red-600 font-medium py-2.5"
              >
                Sair
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
