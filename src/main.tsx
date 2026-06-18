import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// ─── Logout ao fechar a aba/janela (sem quebrar F5 nem múltiplas abas) ──────
//
// A sessão fica em localStorage (sobrevive a F5 e é compartilhada entre abas).
// Para ainda "deslogar ao fechar", ouvimos `pagehide` e, no momento em que a
// página está sendo descartada, decidimos se foi um RELOAD (F5) ou um
// fechamento/saída real:
//
// - Navigation Timing API: se a navegação ATUAL foi do tipo "reload", então
//   este pagehide pertence a um F5 → NÃO limpamos o token.
// - `event.persisted === true` significa que a página vai para o bfcache
//   (não é fechamento) → NÃO limpamos.
// - Caso contrário (fechar aba, fechar janela, navegar para outro site) →
//   limpamos o token de auth do localStorage, exigindo login no próximo acesso.
//
// Importante: trocar de aba NÃO dispara pagehide (dispara visibilitychange),
// então a sessão permanece intacta ao alternar abas.

function navegacaoAtualEhReload(): boolean {
  try {
    const entries = performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    if (entries.length > 0) {
      return entries[0].type === "reload";
    }
  } catch {
    /* ignora — em caso de dúvida, trata como não-reload */
  }
  return false;
}

function limparTokenAuth() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("sb-") && k.includes("-auth-token"))
    .forEach((k) => localStorage.removeItem(k));
}

window.addEventListener("pagehide", (event: PageTransitionEvent) => {
  // Página indo para bfcache (voltará intacta) → não é fechamento.
  if (event.persisted) return;
  // F5 / reload → mantém a sessão.
  if (navegacaoAtualEhReload()) return;
  // Fechamento real ou navegação para fora → desloga.
  limparTokenAuth();
});

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);