// Lesson 2: a shielded payment with an encrypted memo.
import { api, getInfo, watchTx } from "../api.mjs";
import { markDone, getDone } from "../progress.mjs";
import { track } from "../analytics.mjs";
import { txUrl } from "../config.mjs";
import { h, zec, short, runAction, timeline, chime, explorerLink, recap, nextButton } from "../ui.mjs";
import { explorerData, explorerPane, explorerNote } from "./common.mjs";
import { ownWalletPanel } from "./own-wallet.mjs";

export async function render(root, ctx) {
  // Arriving through a friend's invite link (#/friend?invite=s101-xxxx).
  const invite = new URLSearchParams(location.hash.split("?")[1] ?? "").get("invite")?.match(/^s101-[a-z0-9]{4,10}$/)?.[0];
  const info = await getInfo();
  const amount = info?.amounts.friend ?? 50_000;

  const envelope = h("span.token", "✉️");
  const tag = h("span.label-public.private", "Shielded");
  const stage = h("div.stage", tag,
    h("div.actor.left", h("span.face", "🙂"), "You"),
    envelope,
    h("div.actor.right", h("span.face", "🧑"), "Your friend"));

  const memo = h("input", { type: "text", id: "memo", maxlength: 120, value: "Thanks for lunch! 🍜", autocomplete: "off" });
  const send = h("button.btn.btn-hero", `Send ${zec(amount)} privately`);
  const live = h("div");

  root.append(
    h("h2", `${ctx.lesson.n}. Pay a friend privately`),
    h("p", "When you send from a shielded address to a shielded address, the sender, the receiver, the amount and the memo are all encrypted on the blockchain. Anyone can see that a transaction happened, but only your friend's keys (and you, the sender) can read what's inside."),
    stage,
    h("div.card",
      h("label", { for: "memo" }, "Write a secret message (memo)"),
      memo,
      h("p.small.memo-warning", { role: "note" }, "⚠️ ", "This is a public demo wallet. Its viewing key is published, so anyone can read this message. Don't write anything personal."),
      send),
    live,
  );

  send.addEventListener("click", () => runAction(send, "Sending…", async () => {
    const { txid } = await api("/pay-friend", { memo: invite ? `${memo.value} [${invite}]` : memo.value });
    track("tx_sent", { lesson: ctx.lesson.n });
    send.remove();
    memo.disabled = true;
    envelope.textContent = "🔒";
    envelope.classList.add("travel");
    showProgress(live, txid, memo.value, ctx);
  }).catch(() => {}));

  if (invite) {
    root.querySelector("h2").after(h("div.card.tip", h("h3", "A friend invited you"),
      h("p", "Your payment and memo will reach the friend who shared this link. Their screen will light up when it arrives.")));
  }
  root.append(invitePanel());
  root.append(ownWalletPanel({
    to: info?.addresses.friend, zats: amount, memo: "Hi from my own wallet",
    watch: "friend",
  }));

  const prev = getDone("friend");
  if (prev?.txid) {
    root.append(h("p.small.muted", "You've done this lesson. Your last payment: ",
      h("a", { href: txUrl(prev.txid), target: "_blank", rel: "noopener" }, short(prev.txid, 8))));
  }
}

function showProgress(live, txid, sentMemo, ctx) {
  const tl = timeline(["Sent from your wallet", "Your friend's wallet decrypted it", "Confirmed in a block"]);
  const friendPane = h("div.pane.private", h("h3", "What your friend sees"),
    h("p.small.muted.pulse-slow", "Waiting for their wallet…"));
  let explorerPaneEl = explorerPane(null);
  const split = h("div.split", explorerPaneEl, friendPane);
  const after = h("div");
  live.append(h("div.card.fade-in", h("h3", "Live on the testnet"), tl.el), h("div.card.fade-in", split, explorerNote()), after);
  tl.start();

  let seenShown = false;
  watchTx(txid, (t) => {
    tl.update(t);
    if (t.seenAfter != null && !seenShown) {
      seenShown = true;
      chime();
      friendPane.replaceChildren(
        h("h3", "What your friend sees"),
        h("div.kv", h("span", "Amount"), h("b", zec(t.value ?? 0))),
        h("div.kv", h("span", "Memo"), h("b", t.memo ?? sentMemo)),
        h("div.kv", h("span", "From"), h("b.hidden-val", "not revealed")),
        h("p.small.muted", "Decrypted on their side with their viewing key. Even they don't learn your address unless you put it in the memo."),
      );
      markDone("friend", { txid });
      track("step_finished", { lesson: ctx.lesson.n });
      after.append(
        h("div.card.result.fade-in", h("div.big-check", "✅"),
          h("p", { style: "text-align:center" }, `Delivered privately in ${t.seenAfter}s.`),
          explorerLink(txid)),
        recap("What just happened", [
          "Our practice wallet built a shielded transaction: your payment and memo were encrypted to your friend's address.",
          "The network checked a zero-knowledge proof that the payment is valid, without seeing who paid whom or how much.",
          "Your friend's wallet tried its key on new transactions, found this one, and decrypted the amount and memo.",
          "The explorer shows only that a shielded transaction exists, its fee and its size.",
          "The memo is private from the public chain, not from viewing-key holders. This demo wallet's viewing key is published, so anyone holding it can read your message too.",
        ]),
        nextButton(ctx.nextHref),
      );
    }
    if (t.state === "confirmed") {
      explorerData(txid).then((d) => {
        const fresh = explorerPane(d);
        explorerPaneEl.replaceWith(fresh);
        explorerPaneEl = fresh;
      });
    }
  });
  // Show the explorer's view as soon as it has indexed the transaction.
  explorerData(txid, { tries: 30 }).then((d) => {
    if (!d) return;
    const fresh = explorerPane(d);
    explorerPaneEl.replaceWith(fresh);
    explorerPaneEl = fresh;
  });
}

/** Stretch goal: let two real learners pay each other with a shareable link. */
function invitePanel() {
  const panel = h("details.advanced", h("summary", "Invite a real friend to pay you"));
  const code = `s101-${Math.random().toString(36).slice(2, 8)}`;
  const link = `${location.href.split("#")[0]}#/friend?invite=${code}`;
  const status = h("p.small");
  panel.append(
    h("p.small", "Send this link to someone. When they pay through it, their memo appears here, decrypted by the receiving wallet. Both of you use our practice wallets, so you don't need your own."),
    h("div.mono.card.tight", link),
    h("button.btn.secondary", {
      onclick: async (e) => {
        if (navigator.share) { try { await navigator.share({ url: link, text: "Pay me privately on the Zcash testnet" }); } catch { /* cancelled */ } }
        else await navigator.clipboard?.writeText(link);
        e.target.textContent = "Waiting for your friend's payment…";
        e.target.disabled = true;
        for (let i = 0; i < 180; i++) {
          const r = await api(`/incoming?wallet=friend&code=${code}`).catch(() => null);
          if (r?.found) {
            chime();
            status.replaceChildren(`✅ Your friend paid you ${zec(r.value)}: “${r.memo.replace(` [${code}]`, "")}” `, explorerLink(r.txid));
            e.target.remove();
            return;
          }
          await new Promise((res) => setTimeout(res, 5000));
        }
      },
    }, "Share the link and wait"),
    status,
  );
  return panel;
}
