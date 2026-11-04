// DOM helpers and shared UI pieces.
import { txUrl } from "./config.mjs";

/** h("div.card", {onclick}, child, ...) creates an element. */
export function h(tag, attrs, ...children) {
  const [name, ...classes] = tag.split(".");
  const el = document.createElement(name || "div");
  if (classes.length) el.className = classes.join(" ");
  if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) {
    children.unshift(attrs);
    attrs = null;
  }
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export const zec = (zats) => `${(zats / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "")} TAZ`;
export const short = (s, n = 10) => (s && s.length > 2 * n ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

export function explorerLink(txid, label = "View on the block explorer ↗") {
  return h("a.btn.secondary", { href: txUrl(txid), target: "_blank", rel: "noopener" }, label);
}

let toastEl = null;
/** A friendly message at the bottom of the screen, optionally with Retry. */
export function toast(message, { retry, error = false } = {}) {
  toastEl?.remove();
  const root = document.querySelector(".s101") ?? document.body;
  toastEl = h(`div.toast.fade-in${error ? ".error" : ""}`, { role: "status" },
    h("span", message),
    retry ? h("button", { onclick: () => { toastEl.remove(); retry(); } }, "Retry") : null,
  );
  root.append(toastEl);
  if (!retry) setTimeout(() => toastEl?.remove(), 5000);
}

/**
 * Run an async action from a button: disables it, shows a working label,
 * and on failure shows the error with a Retry button.
 */
export async function runAction(button, workingLabel, fn) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = workingLabel;
  try {
    return await fn();
  } catch (e) {
    toast(e.message, { error: true, retry: () => button.click() });
    throw e;
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

/** sent → seen → confirmed timeline with live seconds. */
export function timeline(labels = ["Sent", "Seen by the receiving wallet", "Confirmed in a block"]) {
  const items = labels.map((l) => h("li", h("span.dot"), h("span", l), h("span.t")));
  const hint = h("p.small.muted.confirm-hint", { hidden: true },
    "Testnet blocks arrive about every 25 seconds on average, but irregularly, so this step can take from a few seconds to a couple of minutes.");
  const el = h("div", h("ol.timeline", items), hint);
  let t0 = Date.now();
  let timer = null;
  const set = (i, state, secs) => {
    items[i].className = state;
    if (secs != null) items[i].querySelector(".t").textContent = `${secs}s`;
  };
  return {
    el,
    start() {
      t0 = Date.now();
      set(0, "done", 0);
      set(1, "active");
      timer = setInterval(() => {
        const live = items.find((x) => x.className === "active");
        if (live) live.querySelector(".t").textContent = `${Math.round((Date.now() - t0) / 1000)}s`;
      }, 500);
    },
    update(t) {
      if (t.seenAfter != null) {
        set(1, "done", t.seenAfter);
        if (t.state !== "confirmed") { set(2, "active"); hint.hidden = false; }
      }
      if (t.state === "confirmed") {
        set(1, "done", t.seenAfter ?? t.confirmedAfter);
        set(2, "done", t.confirmedAfter);
        hint.hidden = true;
        clearInterval(timer);
      }
    },
  };
}

/** A short two-note chime, generated in the browser (no audio files). */
export function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      const t = ctx.currentTime + i * 0.14;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.55);
    });
  } catch { /* audio unavailable */ }
}

export function recap(title, points) {
  return h("div.card.recap.fade-in", h("h3", title), h("ol", points.map((p) => h("li", p))));
}

export function tip(title, text) {
  return h("div.card.tip.fade-in", h("h3", title), h("p", text));
}

/** The "Next lesson" button at the end of an activity. */
export function nextButton(href, label = "Next lesson →") {
  return h("a.btn.btn-hero", { href }, label);
}

/** An address with a copy button and a link to it on the explorer. */
export function addressRow(label, address, url) {
  return h("div.kv.address-row",
    h("span", label),
    h("span.addr",
      h("b.mono", { title: address }, short(address, 8)),
      h("button.icon-btn", {
        "aria-label": "Copy address", title: "Copy address",
        onclick: () => navigator.clipboard?.writeText(address).then(() => toast("Address copied")),
      }, "⧉"),
      url ? h("a.icon-btn", { href: url, target: "_blank", rel: "noopener", "aria-label": "View address on the explorer", title: "View on the explorer" }, "↗") : null));
}
