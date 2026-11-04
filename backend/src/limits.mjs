// Fixed-window rate limits for on-chain actions, keyed by IP and by the
// anonymous per-tab session id the frontend sends (X-Learner-Session).
import { config } from "./config.mjs";

const hits = new Map(); // key -> { start, count }

function take(key, max) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.start > config.limits.windowMs) {
    hits.set(key, { start: now, count: 1 });
    return true;
  }
  if (h.count >= max) return false;
  h.count++;
  return true;
}

export function allowAction(ip, sessionId) {
  const okIp = take(`ip:${ip}`, config.limits.perIp);
  const okSession = !sessionId || take(`s:${sessionId}`, config.limits.perSession);
  return okIp && okSession;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, h] of hits) if (now - h.start > config.limits.windowMs) hits.delete(k);
}, 10 * 60_000).unref();
