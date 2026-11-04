// Small client for the wallet backend.
import { API_URL } from "./config.mjs";

// An anonymous id for this tab only, used for per-session rate limiting.
function sessionId() {
  try {
    let id = sessionStorage.getItem("shielded101.session");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("shielded101.session", id);
    }
    return id;
  } catch {
    return "";
  }
}

const UNREACHABLE = "Can't reach the testnet wallet service right now. Check your connection and try again.";

export async function api(path, body, { timeoutMs = body ? 90_000 : 20_000 } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "X-Learner-Session": sessionId() },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error(UNREACHABLE);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? (res.status >= 502 ? UNREACHABLE : "Something went wrong. Please try again."));
  return data;
}

/** Addresses and amounts, fetched once per page load; never blocks a lesson for long. */
let infoPromise = null;
export function getInfo() {
  infoPromise ??= api("/info", undefined, { timeoutMs: 6000 }).catch(() => { infoPromise = null; return null; });
  return infoPromise;
}

/** Poll a transaction until it is confirmed, calling onUpdate on every change. */
export function watchTx(txid, onUpdate, { everyMs = 2000, timeoutMs = 10 * 60_000 } = {}) {
  let stopped = false;
  let last = "";
  const started = Date.now();
  (async function loop() {
    while (!stopped && Date.now() - started < timeoutMs) {
      try {
        const t = await api(`/tx?txid=${txid}`);
        const key = JSON.stringify(t);
        if (key !== last) { last = key; onUpdate(t); }
        if (t.state === "confirmed") return;
      } catch { /* transient: keep polling */ }
      await new Promise((r) => setTimeout(r, everyMs));
    }
  })();
  return () => { stopped = true; };
}
