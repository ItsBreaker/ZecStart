// Lesson 4: the fund publishes its viewing key; anyone can audit the
// donations, but the key cannot spend.
import { api } from "../api.mjs";
import { txUrl } from "../config.mjs";
import { markDone, getDone } from "../progress.mjs";
import { track } from "../analytics.mjs";
import { h, zec, short, runAction, toast, recap, tip, nextButton } from "../ui.mjs";
import { FUND_NAME } from "./donate.mjs";

export async function render(root, ctx) {
  const mine = getDone("donate")?.txid;
  const keyBox = h("div.mono.cipher", "Loading the published key…");
  const load = h("button.btn.btn-hero", "👓 Load the viewing key");
  const results = h("div");
  let key = "";

  root.append(
    h("h2", `${ctx.lesson.n}. Verify the fund`),
    h("p", `Donors want proof that ${FUND_NAME} really received the money. So the journalist publishes the fund's viewing key. Anyone who loads it can see every donation and memo, but not who sent them, and the key cannot spend a single coin.`),
    h("div.card",
      h("h3", "The fund's published viewing key"),
      keyBox,
      h("button.link-btn", { onclick: () => navigator.clipboard?.writeText(key).then(() => toast("Viewing key copied")) }, "Copy key"),
      load),
    results,
  );

  const first = await api("/fund").catch((e) => { toast(e.message, { error: true }); return null; });
  if (first) { key = first.viewingKey; keyBox.textContent = key; }

  load.addEventListener("click", () => runAction(load, "Scanning the blockchain with the key…", async () => {
    const f = await api("/fund");
    load.remove();
    showFund(results, f, mine, ctx);
  }).catch(() => {}));
}

function showFund(root, f, mine, ctx) {
  const list = h("div", f.donations.map((d) => h("div.donation",
    h("span", h("b", zec(d.value)), d.txid === mine ? h("span", { style: "color:var(--accent)" }, "  ← yours") : null),
    h("a.small", { href: txUrl(d.txid), target: "_blank", rel: "noopener" }, short(d.txid, 5)),
    h("span.memo", d.memo ? `“${d.memo}”` : h("span.muted", "(no memo)")),
    h("span.small.muted", `Donor: not revealed · ${d.status === "confirmed" ? `block ${d.blockheight}` : "pending"}`),
  )));

  const spend = h("button.btn.danger", "Try to spend with the viewing key");
  const spendOut = h("div");
  root.append(
    h("div.card.fade-in",
      h("p.muted.small", "Total donations received"),
      h("div.total", zec(f.totalRaised)),
      h("p.small.muted", `${f.count} donations. Most recent:`),
      list),
    h("div.card.fade-in",
      h("h3", "Could someone steal from the fund with this key?"),
      h("p.small", "Let's find out: we'll ask the view-only wallet to send 0.0001 TAZ."),
      spend, spendOut),
  );

  spend.addEventListener("click", () => runAction(spend, "Trying…", async () => {
    const { error } = await api("/fund/try-spend", {});
    spend.remove();
    markDone("verify");
    track("step_finished", { lesson: ctx.lesson.n });
    spendOut.append(
      h("p.small.muted", "The real reply from the view-only wallet:"),
      h("div.error-box.fade-in", `Error: ${error}`),
      h("p", "❌ Refused. A viewing key can decrypt, but only the spending key can authorise a payment."),
    );
    root.append(
      recap("What just happened", [
        "The view-only wallet holds the fund's viewing key and no spending key.",
        "It scanned the blockchain and decrypted every payment to the fund: amounts, times and memos.",
        "Shielded payments don't carry the sender's address, so the key shows no donor identities.",
        "This kind of key (a full viewing key) can also show payments the fund sends, so supporters can see where the money goes.",
        "When asked to spend, the wallet refused: it has no spending key.",
      ]),
      tip("Memos are not secret from key holders", "Anything in a memo is visible to everyone who holds the viewing key. Here that's the whole internet. Never put your name, email or other identifying details in a donation memo."),
      tip("Watch-only wallet", "The same idea gives you a watch-only wallet on a second device: put your viewing key on a phone or laptop to check payments arrive, while the spending key stays safe somewhere else."),
      nextButton(ctx.nextHref, "Get my certificate →"),
    );
  }).catch(() => {}));
}
