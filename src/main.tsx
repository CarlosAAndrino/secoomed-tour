import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
//import { supabase } from "./lib/supabase";

// Desloga ao fechar o browser/aba
window.addEventListener("beforeunload", () => {
  // Remove a sessão do localStorage diretamente
  // O signOut assíncrono não termina antes da aba fechar
  const keys = Object.keys(localStorage).filter(
    (k) => k.startsWith("sb-") && k.includes("-auth-token"),
  );
  keys.forEach((k) => localStorage.removeItem(k));
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
