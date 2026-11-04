// Lesson 3: a private donation to a fictional journalist's fund.
import { api, getInfo, watchTx } from "../api.mjs";
import { markDone } from "../progress.mjs";
import { track } from "../analytics.mjs";
import { h, zec, runAction, timeline, chime, explorerLink, recap, tip, nextButton } from "../ui.mjs";
import { explorerData, explorerPane } from "./common.mjs";
import { ownWalletPanel } from "./own-wallet.mjs";

export const FUND_NAME = "The Lantern Fund";

export async function render(root, ctx) {
  const info = await getInfo();
  const choices = info?.amounts.donate ?? [20_000, 50_000, 100_000];
  let zats = choices[1];

  const envelope = h("span.token", "🔒");
  const stage = h("div.stage", h("span.label-public.private", "Shielded donation"),
    h("div.actor.left", h("span.face", "🙂"), "You"),
    envelope,
    h("div.actor.right", h("span.face", "📰"), FUND_NAME));

  const chips = h("div.chips", choices.map((z) => {
    const b = h("button.chip", { "aria-pressed": String(z === zats), onclick: () => {
      zats = z;
      chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
      give.textContent = `Donate ${zec(zats)} privately`;
    } }, zec(z));
    return b;
  }));
  const memo = h("input", { type: "text", id: "dmemo", maxlength: 120, placeholder: "Keep up the good work!", autocomplete: "off" });
  const give = h("button.btn.btn-hero", `Donate ${zec(zats)} privately`);
  const live = h("div");

  root.append(
    h("h2", `${ctx.lesson.n}. Donate privately`),
    h("p", `${FUND_NAME} is a fictional fund for an independent journalist. Supporters of reporters can face pressure if their names leak. A shielded donation keeps your address, the fund's address and the amount off the public record.`),
    stage,
    h("div.card",
      h("label", "Amount"), chips,
      h("label", { for: "dmemo" }, "Message to the journalist (optional)"), memo,
      h("p.small.memo-warning", { role: "note" }, "⚠️ ", "This is a public demo wallet. Its viewing key is published, so anyone can read this message. Don't write anything personal.", " In the next lesson you'll see why."),
      give),
    live,
  );

  give.addEventListener("click", () => runAction(give, "Donating…", async () => {
    const { txid } = await api("/donate", { zats, memo: memo.value });
    track("tx_sent", { lesson: ctx.lesson.n });
    give.closest(".card").remove();
    envelope.classList.add("travel");
    progress(live, txid, ctx);
  }).catch(() => {}));

  root.append(ownWalletPanel({ to: info?.addresses.journalist, zats, memo: "Donation from my own wallet", watch: "journalist" }));
}

function progress(live, txid, ctx) {
  const tl = timeline(["Donation sent", "The fund's wallet received it", "Confirmed in a block"]);
  let pane = explorerPane(null);
  const cannot = h("div.pane.private", h("h3", "What nobody else can see"),
    h("ul.small", { style: "padding-left:1.1em;margin:4px 0" },
      h("li", "Who donated (your address)"),
      h("li", "The fund's address"),
      h("li", "How much you gave"),
      h("li", "Your message")));
  const after = h("div");
  live.append(h("div.card.fade-in", tl.el), h("div.card.fade-in", h("div.split", pane, cannot)), after);
  tl.start();

  let done = false;
  watchTx(txid, (t) => {
    tl.update(t);
    if (!done && t.seenAfter != null) {
      done = true;
      chime();
      markDone("donate", { txid });
      track("step_finished", { lesson: ctx.lesson.n });
      after.append(
        h("div.card.result.fade-in", h("div.big-check", "✅"),
          h("p", { style: "text-align:center" }, `Donation received in ${t.seenAfter}s.`),
          explorerLink(txid)),
        recap("What just happened", [
          "You sent a fully shielded payment to the fund's shielded address.",
          "On the explorer it is one more shielded transaction: no sender, no receiver, no amount, no readable memo.",
          "The fund's wallet decrypted it with its own key and added it to the total.",
        ]),
        tip("Privacy tip", "Amounts are visible whenever coins enter or leave the shielded pool. Shielding 0.5 ZEC and minutes later sending 0.5 ZEC out to a public address is easy to link. Keep your funds shielded and give from there."),
        nextButton(ctx.nextHref),
      );
    }
  });
  explorerData(txid).then((d) => { if (d) { const p = explorerPane(d); pane.replaceWith(p); pane = p; } });
}
