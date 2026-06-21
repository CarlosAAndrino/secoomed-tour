import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// ─── Detecção de fechamento de aba vs. F5 (via marcador de sessão) ──────────
//
// PROBLEMA: o navegador não fornece um sinal confiável para distinguir
// "fechar a aba" de "atualizar (F5)". O evento pagehide dispara nos dois
// casos e a Navigation Timing API não detecta reload dentro dele — foi por
// isso que a abordagem anterior apagava o token no F5.
//
// SOLUÇÃO: usar o sessionStorage como marcador de "sessão de página viva".
// - sessionStorage SOBREVIVE ao F5 (é a mesma sessão de página).
// - sessionStorage é APAGADO pelo navegador ao FECHAR a aba/janela.
// - sessionStorage permanece intacto ao trocar de aba.
//
// A decisão é tomada na INICIALIZAÇÃO (antes do React montar), que é o ponto
// onde a detecção é confiável — diferente do pagehide, onde ela falhava:
// - sessionStorage TEM o marcador  → é um F5 → MANTÉM a sessão.
// - sessionStorage VAZIO mas localStorage TEM token → a aba foi fechada e
//   reaberta → LIMPA o token, exigindo login.

const MARCADOR_ABA = "secoomed_aba_viva";

function limparTokenAuth() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("sb-") && k.includes("-auth-token"))
    .forEach((k) => localStorage.removeItem(k));
}

(function decidirSessaoNaInicializacao() {
  const marcadorPresente = sessionStorage.getItem(MARCADOR_ABA);
  const temToken = Object.keys(localStorage).some(
    (k) => k.startsWith("sb-") && k.includes("-auth-token")
  );

  // Sem marcador + com token = aba nova (fechada e reaberta) → limpa a sessão.
  if (!marcadorPresente && temToken) {
    limparTokenAuth();
  }

  // (Re)grava o marcador desta sessão de página.
  // Sobrevive ao F5; é apagado pelo navegador ao fechar a aba.
  sessionStorage.setItem(MARCADOR_ABA, "1");
})();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);