import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// ─── Limpeza de sessão ao fechar aba ────────────────────────────────────────
// sessionStorage: persiste no F5, apaga ao fechar aba.
// Se aba é nova (sem marcador) e há tokens → aba anterior foi fechada → limpa.
// Trocar de aba NÃO re-executa este código (é SPA, client-side navigation).
const SESSION_MARKER = "secoomed_aba_ativa";

if (!sessionStorage.getItem(SESSION_MARKER)) {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("sb-") && k.includes("-auth-token"))
    .forEach((k) => localStorage.removeItem(k));
}
sessionStorage.setItem(SESSION_MARKER, "1");

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
