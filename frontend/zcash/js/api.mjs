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

export async function api(path, body) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "X-Learner-Session": sessionId() },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the testnet wallet service. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
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
