// Lesson 1: coins arrive at a public (transparent) address, then the learner
// shields them into the shielded pool.
import { api, watchTx } from "../api.mjs";
import { addressUrl } from "../config.mjs";
import { markDone } from "../progress.mjs";
import { track } from "../analytics.mjs";
import { h, zec, short, runAction, timeline, chime, explorerLink, recap, nextButton } from "../ui.mjs";
import { explorerData } from "./common.mjs";

const kv = (k, v, cls = "") => h("div.kv", h("span", k), h(`b${cls}`, v));

export async function render(root, ctx) {
  const info = await api("/info").catch(() => null);
  const amount = info?.amounts.withdraw ?? 100_000;
  const taddr = info?.addresses.learnerTransparent ?? "";

  const coin = h("span.token", "🪙");
  const tag = h("span.label-public", "Public: anyone can see this");
  const stage = h("div.stage", tag,
    h("div.actor.left", h("span.face", "🏦"), "Exchange"),
    coin,
    h("div.actor.right", h("span.face", "👛"), "Your public address"));

  const withdraw = h("button.btn.btn-hero", `Withdraw ${zec(amount)} from the exchange`);
  const live = h("div");
  root.append(
    h("h2", `${ctx.lesson.n}. Shield your coins`),
    h("p", "Many people get their first ZEC from an exchange, which often sends it to a transparent address. Transparent Zcash works like Bitcoin: the addresses and amounts are public for anyone to look up. Shielding moves the coins into the shielded pool, where what you do next is private."),
    stage,
    h("div.card", h("p.small.muted", "Step 1 of 2. We play the exchange and send practice TAZ to your wallet's transparent address."), withdraw),
    live,
  );

  withdraw.addEventListener("click", () => runAction(withdraw, "Withdrawing…", async () => {
    const { txid } = await api("/withdraw", {});
    track("tx_sent", { lesson: ctx.lesson.n, step: 1 });
    withdraw.closest(".card").remove();
    coin.classList.add("travel");
    depositProgress(live, txid, taddr, amount, ctx, { coin, tag, stage });
  }).catch(() => {}));
}

function depositProgress(live, txid, taddr, amount, ctx, scene) {
  const tl = timeline(["Exchange sent it", "Seen by the network", "Confirmed: ready to shield"]);
  const pub = h("div.pane.public", h("h3", "What anyone can see"),
    kv("To address", short(taddr, 8)), kv("Amount", zec(amount)),
    h("p.small.muted", { style: "margin-top:8px" }, "This address and its balance are now public, forever."));
  const shieldBtn = h("button.btn.btn-hero", { disabled: true }, "Waiting for 1 confirmation…");
  const card = h("div.card.fade-in", h("h3", "Your withdrawal"), tl.el, pub,
    h("a.btn.secondary", { href: addressUrl(taddr), target: "_blank", rel: "noopener", style: "margin-top:10px" }, "Look up your public address ↗"),
    explorerLink(txid, "View the withdrawal ↗"));
  const step2 = h("div.card.fade-in",
    h("p.small.muted", "Step 2 of 2. Shielding usually takes 1–2 minutes to confirm the withdrawal first. Notice how much a stranger could learn while you wait."),
    shieldBtn);
  live.append(card, step2);
  tl.start();

  watchTx(txid, (t) => {
    tl.update(t);
    if (t.state === "confirmed") {
      shieldBtn.disabled = false;
      shieldBtn.textContent = "🛡️ Shield my coins";
    }
  });

  shieldBtn.addEventListener("click", () => runAction(shieldBtn, "Shielding…", async () => {
    const r = await api("/shield", { depositTxid: txid });
    track("tx_sent", { lesson: ctx.lesson.n, step: 2 });
    step2.remove();
    scene.stage.append(h("div.actor.center", h("span.face", "🛡️"), "Shielded pool"));
    scene.coin.classList.remove("travel");
    scene.coin.classList.add("to-center");
    setTimeout(() => scene.coin.classList.add("vanish"), 1400);
    scene.tag.textContent = "Shielded: private from here on";
    scene.tag.classList.add("private");
    shieldProgress(live, r, txid, ctx);
  }).catch(() => {}));
}

function shieldProgress(live, { txid, shared }, depositTxid, ctx) {
  const tl = timeline(["Shield transaction sent", "Seen by the network", "Confirmed in a block"]);
  const view = h("div.pane", h("h3", "The shielding transaction, publicly"), h("p.small.muted.pulse-slow", "Waiting for the explorer…"));
  const after = h("div");
  live.append(
    h("div.card.fade-in", h("h3", "Shielding"), tl.el,
      shared ? h("p.small.muted", "Another learner's shield picked up your coins too: one transaction can shield several transparent coins at once.") : null,
      view),
    after);
  tl.start();
  let done = false;
  watchTx(txid, (t) => {
    tl.update(t);
    if (!done && (t.seenAfter != null || t.state === "confirmed")) {
      done = true;
      chime();
      markDone("shield", { txid, depositTxid });
      track("step_finished", { lesson: ctx.lesson.n });
      after.append(
        h("div.card.result.fade-in", h("div.big-check", "✅"),
          h("p", { style: "text-align:center" }, "Your coins are in the shielded pool."),
          explorerLink(txid, "View the shield transaction ↗"),
          explorerLink(depositTxid, "View the public withdrawal ↗")),
        recap("What just happened", [
          "The withdrawal landed at a transparent address: anyone can see that address, the amount it received and its balance.",
          "Shielding spent those coins into the shielded pool. That one transaction still shows the transparent address it came from, and the amount entering the pool.",
          "From now on, payments from the shielded pool hide the sender, the receiver, the amount and the memo.",
          "Tip: waiting a while before shielding, and not moving the same amount out again soon after, makes your transactions harder to link.",
        ]),
        nextButton(ctx.nextHref),
      );
    }
  });
  explorerData(txid).then((d) => {
    if (!d) return;
    const ins = d.transparentInputs;
    view.replaceChildren(
      h("h3", "The shielding transaction, publicly"),
      kv("Transparent inputs", ins.length ? ins.map((i) => `${short(i.address, 6)} · ${zec(i.valueZat)}`).join(", ") : String(ins.length)),
      kv("Went to", "the shielded pool", ".hidden-val"),
      kv("Entered the pool", zec(Math.max(0, -d.valueBalanceIronwoodZat))),
      kv("Fee", zec(d.feeZat)),
    );
  });
}
