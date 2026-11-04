// Lesson 1: coins arrive at a public (transparent) address, then the learner
// shields them into the shielded pool.
import { api, getInfo, watchTx } from "../api.mjs";
import { addressUrl } from "../config.mjs";
import { markDone } from "../progress.mjs";
import { track } from "../analytics.mjs";
import { h, zec, short, runAction, timeline, chime, explorerLink, recap, nextButton, addressRow } from "../ui.mjs";
import { zecCoin, walletIcon, exchangeIcon } from "../icons.mjs";
import { explorerData } from "./common.mjs";

const kv = (k, v, cls = "") => h("div.kv", h("span", k), h(`b${cls}`, v));

export async function render(root, ctx) {
  const info = await getInfo();
  const amount = info?.amounts.withdraw ?? 100_000;
  const taddr = info?.addresses.learnerTransparent ?? "";

  const coin = h("span.token", zecCoin());
  const tag = h("span.label-public", "Public: anyone can see this");
  const stage = h("div.stage", tag,
    h("div.actor.left", h("span.face", exchangeIcon()), "Exchange"),
    coin,
    h("div.actor.right", h("span.face", walletIcon()), "Your public address"));

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
    addressRow("To address", taddr, addressUrl(taddr)), kv("Amount", zec(amount)),
    h("p.small.muted", { style: "margin-top:8px" }, "This address and its balance are now public, forever."));
  const shieldBtn = h("button.btn.btn-hero", { disabled: true }, "Waiting for 1 confirmation…");
  const card = h("div.card.fade-in", h("h3", "Your withdrawal"), tl.el, pub,
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
    scene.stage.replaceWith(poolScene(taddr, amount));
    shieldProgress(live, r, txid, ctx);
  }).catch(() => {}));
}

/**
 * The shielded pool: many identical encrypted notes. Your coin arrives still
 * wearing its public label (address and amount), the label is stripped at
 * the edge of the pool, and inside it looks like every other note.
 */
function poolScene(taddr, amount) {
  const others = Array.from({ length: 8 }, (_, i) =>
    h("span.orbit-coin", { style: `--a:${i * 45}deg` }, zecCoin()));
  const mine = h("span.orbit-coin.mine", { style: "--a:22deg" }, zecCoin());
  const incoming = h("div.incoming", zecCoin(), h("span.tag", `${short(taddr, 4)} · ${zec(amount)}`));
  const caption = h("ol.pool-steps");
  const steps = [
    "Your coin leaves the public address. This step is visible: anyone can see the address and the amount going in.",
    "At the edge of the pool its public label is gone. Inside, every note is encrypted.",
    "Now it looks like every other note in the pool. Only your keys can find it and spend it.",
  ];
  const scene = h("div.pool-card.fade-in",
    h("div.pool",
      h("span.label-public", "Public until it enters"),
      h("div.ring", h("div.orbit", others, mine), h("div.pool-label", "Shielded", h("br"), "pool")),
      incoming),
    caption);
  const show = (i) => caption.append(h("li.fade-in", steps[i]));
  // Start once the scene is in the page.
  setTimeout(() => {
    show(0);
    setTimeout(() => incoming.classList.add("enter"), 300);
    setTimeout(() => { show(1); scene.querySelector(".label-public").textContent = "Shielded: private from here on"; scene.querySelector(".label-public").classList.add("private"); }, 1700);
    setTimeout(() => { incoming.classList.add("gone"); mine.classList.add("arrived"); }, 2100);
    setTimeout(() => { show(2); mine.classList.add("settled"); mine.classList.remove("arrived"); }, 4200);
  }, 50);
  return scene;
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
