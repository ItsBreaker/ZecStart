// Pieces shared by several lessons.
import { api } from "../api.mjs";
import { h, zec } from "../ui.mjs";

/** Poll the backend's explorer view of a tx until the explorer has indexed it. */
export async function explorerData(txid, { tries = 40, everyMs = 5000 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const d = await api(`/explorer?txid=${txid}`);
      if (d.found) return d;
    } catch { /* keep trying */ }
    await new Promise((r) => setTimeout(r, everyMs));
  }
  return null;
}

const kv = (k, v, cls = "") => h("div.kv", h("span", k), h(`b${cls}`, v));

/** "What the explorer sees" pane for a shielded transaction. */
export function explorerPane(d) {
  const pane = h("div.pane.public", h("h3", "What anyone can see"));
  if (!d) {
    pane.append(h("p.small.muted.pulse-slow", "Waiting for the explorer to index it…"));
    return pane;
  }
  pane.append(
    kv("Block", d.blockHeight ?? "pending"),
    kv("Fee", zec(d.feeZat)),
    kv("Shielded actions", d.ironwoodActions + d.orchardActions),
    kv("Sender", "—", ".hidden-val"),
    kv("Receiver", "—", ".hidden-val"),
    kv("Amount", "—", ".hidden-val"),
    kv("Memo", "—", ".hidden-val"),
  );
  if (d.hexSample) {
    pane.append(
      h("p.small.muted", { style: "margin-top:8px" }, "Raw bytes on chain:"),
      h("div.mono.cipher", d.hexSample),
    );
  }
  return pane;
}

export const explorerNote = () =>
  h("p.small.muted",
    "Note: on today's testnet, shielded payments use Zcash's new ",
    h("b", "Ironwood"),
    " pool, the successor to Orchard added in the NU6.3 upgrade. Some explorers still count these under “Orchard”, or show 0 there.");
