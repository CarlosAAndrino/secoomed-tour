import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// A sessão é persistida em localStorage pelo cliente Supabase (ver src/lib/supabase.ts).
// localStorage sobrevive a F5, à troca de abas e à navegação entre rotas —
// exatamente o comportamento esperado: o usuário permanece autenticado.
//
// A sessão só é encerrada em:
// 1. Logout explícito (signOut no AuthContext).
// 2. Sessão realmente inválida / expirada (o Supabase emite SIGNED_OUT,
//    tratado no AuthContext).
//
// NÃO há nenhum código aqui apagando o token de auth na inicialização,
// no pagehide, no beforeunload ou no unload. Toda tentativa anterior de
// "deslogar ao fechar a aba" apagava o token no momento do F5, porque é
// impossível distinguir de forma confiável "atualizar a página" de "fechar
// a aba" — tanto dentro de eventos de descarregamento quanto na carga inicial
// (o sessionStorage não devolve o marcador de forma confiável no F5).

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);