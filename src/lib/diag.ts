// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIO DE DIAGNÓSTICO — TEMPORÁRIO
// Remover depois que a causa do congelamento pós-troca-de-aba for confirmada.
//
// Objetivo: reconstruir a sequência exata de eventos que leva uma AÇÃO a
// travar após voltar de outra aba. Loga de forma estruturada, com timestamp,
// origem, evento e payload. Mantém também um "estado vivo" inspecionável via
// window.__diag() no console.
// ─────────────────────────────────────────────────────────────────────────────

type DiagPayload = Record<string, unknown>;

interface DiagEntry {
  t: string; // timestamp ISO
  rel: number; // ms desde o load da página
  source: string;
  event: string;
  payload?: DiagPayload;
}

const inicioPagina = performance.now();

// Buffer circular dos últimos eventos (para inspeção via window.__diag()).
const buffer: DiagEntry[] = [];
const MAX_BUFFER = 500;

// Estado vivo — última foto de cada categoria relevante.
const estado = {
  ultimoEventoAuth: null as string | null,
  ultimaVisibilidade: document.visibilityState as string,
  ultimaAcaoIniciada: null as string | null,
  ultimaAcaoConcluida: null as string | null,
  getSessionEmVoo: 0, // quantas chamadas getSession estão pendentes agora
  getSessionTotalIniciadas: 0,
  getSessionTotalConcluidas: 0,
  acoesEmVoo: 0,
};

function agora(): { t: string; rel: number } {
  return {
    t: new Date().toISOString(),
    rel: Math.round(performance.now() - inicioPagina),
  };
}

export function diag(source: string, event: string, payload?: DiagPayload) {
  const { t, rel } = agora();
  const entry: DiagEntry = { t, rel, source, event, payload };
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  // Log colorido e legível no console.
  const prefixo = `%c[DIAG ${rel}ms] %c${source} %c${event}`;
  // eslint-disable-next-line no-console
  console.log(
    prefixo,
    "color:#888",
    "color:#16a34a;font-weight:bold",
    "color:#2563eb;font-weight:bold",
    payload ?? ""
  );
}

// ─── Marcadores de loading por ação ─────────────────────────────────────────

export function loadingStart(component: string, action: string, payload?: DiagPayload) {
  estado.ultimaAcaoIniciada = `${component}:${action}`;
  estado.acoesEmVoo += 1;
  diag(component, "LOADING_START", { action, acoesEmVoo: estado.acoesEmVoo, ...payload });
}

export function loadingEnd(component: string, action: string, payload?: DiagPayload) {
  estado.ultimaAcaoConcluida = `${component}:${action}`;
  estado.acoesEmVoo = Math.max(0, estado.acoesEmVoo - 1);
  diag(component, "LOADING_END", { action, acoesEmVoo: estado.acoesEmVoo, ...payload });
}

export function loadingError(component: string, action: string, payload?: DiagPayload) {
  estado.acoesEmVoo = Math.max(0, estado.acoesEmVoo - 1);
  diag(component, "LOADING_ERROR", { action, acoesEmVoo: estado.acoesEmVoo, ...payload });
}

// ─── Marcadores de getSession (o ponto crítico da hipótese) ─────────────────

export function getSessionStart(origem: string) {
  estado.getSessionEmVoo += 1;
  estado.getSessionTotalIniciadas += 1;
  diag("supabase.auth", "GET_SESSION_START", {
    origem,
    emVoo: estado.getSessionEmVoo,
    totalIniciadas: estado.getSessionTotalIniciadas,
  });
}

export function getSessionEnd(origem: string, ok: boolean, ms: number) {
  estado.getSessionEmVoo = Math.max(0, estado.getSessionEmVoo - 1);
  estado.getSessionTotalConcluidas += 1;
  diag("supabase.auth", "GET_SESSION_END", {
    origem,
    ok,
    ms: Math.round(ms),
    emVoo: estado.getSessionEmVoo,
    totalConcluidas: estado.getSessionTotalConcluidas,
  });
}

// ─── Registro global para inspeção manual no console ────────────────────────

declare global {
  interface Window {
    __diag?: () => void;
    __diagBuffer?: DiagEntry[];
  }
}

if (typeof window !== "undefined") {
  window.__diagBuffer = buffer;
  window.__diag = () => {
    // eslint-disable-next-line no-console
    console.table(buffer.slice(-50));
    // eslint-disable-next-line no-console
    console.log("[DIAG] Estado vivo:", JSON.parse(JSON.stringify(estado)));
    // eslint-disable-next-line no-console
    console.log(
      "[DIAG] getSession pendentes AGORA:",
      estado.getSessionEmVoo,
      "| ações pendentes AGORA:",
      estado.acoesEmVoo
    );
  };
}

// ─── Eventos do navegador (visibilidade / foco) ─────────────────────────────

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    estado.ultimaVisibilidade = document.visibilityState;
    diag("browser", "VISIBILITYCHANGE", {
      visibilityState: document.visibilityState,
      getSessionEmVoo: estado.getSessionEmVoo,
      acoesEmVoo: estado.acoesEmVoo,
    });
  });

  window.addEventListener("focus", () =>
    diag("browser", "FOCUS", { getSessionEmVoo: estado.getSessionEmVoo })
  );
  window.addEventListener("blur", () =>
    diag("browser", "BLUR", { getSessionEmVoo: estado.getSessionEmVoo })
  );
  window.addEventListener("pageshow", (e) =>
    diag("browser", "PAGESHOW", { persisted: (e as PageTransitionEvent).persisted })
  );
  window.addEventListener("pagehide", (e) =>
    diag("browser", "PAGEHIDE", { persisted: (e as PageTransitionEvent).persisted })
  );
}