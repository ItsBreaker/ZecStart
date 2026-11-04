// Lesson progress lives only in this browser (localStorage).
const KEY = "zecstart.progress.v1";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}

export function markDone(id, data = {}) {
  const p = read();
  p[id] = { at: new Date().toISOString(), ...data };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}

export const isDone = (id) => Boolean(read()[id]);
export const getDone = (id) => read()[id] ?? null;
export const all = () => read();
export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
