// Lesson 5: a completion badge built from progress stored in this browser.
import { lessons } from "../lessons.mjs";
import { txUrl } from "../config.mjs";
import { all, markDone, reset } from "../progress.mjs";
import { track } from "../analytics.mjs";
import { h, short, toast } from "../ui.mjs";

export function render(root) {
  const p = all();
  const steps = lessons.filter((l) => l.id !== "certificate");
  const missing = steps.filter((l) => !p[l.id]);

  root.append(h("h2", "Your certificate"));
  if (missing.length) {
    root.append(
      h("p", "Finish these lessons to earn your Zec Start badge:"),
      ...missing.map((l) => h("a.card.lesson", { href: `#/${l.id}` },
        h("span.num", l.n), h("span", h("b", l.title)), h("span.arrow", "›"))),
    );
    return;
  }

  if (!p.certificate) { markDone("certificate"); track("course_finished"); }
  const date = new Date((p.certificate ?? { at: new Date().toISOString() }).at)
    .toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const proofs = [
    ["Shielded coins", p.shield?.txid],
    ["Paid a friend privately", p.friend?.txid],
    ["Donated privately", p.donate?.txid],
  ];
  const shareText = "I finished Zec Start: hands-on Zcash privacy lessons on the real testnet.";

  root.append(
    h("div.badge", h("div", h("span.shield", "🛡️"), h("span.title", "Zec Start"), h("span.small.muted", date))),
    h("p", { style: "text-align:center" }, "You shielded coins, paid privately, donated without revealing yourself, and audited a fund with a viewing key."),
    h("div.card",
      h("h3", "Your proof on the testnet"),
      proofs.map(([label, txid]) => h("div.kv", h("span", label),
        txid ? h("a.mono", { href: txUrl(txid), target: "_blank", rel: "noopener" }, short(txid, 6)) : h("b", "not yet"))),
      h("div.kv", h("span", "Audited with a viewing key"), h("b", "✓"))),
    h("button.btn.btn-hero", {
      onclick: async () => {
        if (navigator.share) { try { await navigator.share({ text: shareText, url: location.href.split("#")[0] }); } catch { /* cancelled */ } }
        else navigator.clipboard?.writeText(`${shareText} ${location.href.split("#")[0]}`).then(() => toast("Copied to clipboard"));
      },
    }, "Share"),
    h("div.card.tip", h("h3", "Next steps"),
      h("p", "Ready for real ZEC? Choose a wallet that shields by default, keep your funds in the shielded pool, and share a viewing key only with people you'd trust to see your payments.")),
    h("p.small.muted", { style: "text-align:center" }, "Progress is stored only in this browser. ",
      h("button.link-btn", { onclick: () => { reset(); location.hash = "#/"; } }, "Start over")),
  );
}
