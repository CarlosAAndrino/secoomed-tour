import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// Estratégia de sessão por aba:
// sessionStorage é preservado no F5 mas apagado ao fechar a aba/janela
// Se não há marcador no sessionStorage mas há token no localStorage
// significa que a aba foi reaberta (não atualizada) → limpa o token
const SESSION_MARKER = "secoomed_aba_ativa";

if (!sessionStorage.getItem(SESSION_MARKER)) {
  const keys = Object.keys(localStorage).filter(
    (k) => k.startsWith("sb-") && k.includes("-auth-token"),
  );
  keys.forEach((k) => localStorage.removeItem(k));
}

sessionStorage.setItem(SESSION_MARKER, "true");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
