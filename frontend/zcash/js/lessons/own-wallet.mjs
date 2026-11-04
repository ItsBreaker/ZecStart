// "Use your own testnet wallet": an optional path for learners who already
// have one. Noir Wallet's testnet browser extension gets a one-tap button
// (it injects window.noirwallet); any other wallet can use the ZIP-321 link.
// A one-time code in the memo lets the receiving view-only wallet find the
// payment.
import { api } from "../api.mjs";
import { h, zec, toast, explorerLink, chime } from "../ui.mjs";

const NOIR_TESTNET = "https://github.com/NoirWallet/noir-wallet/releases";

function zip321(address, zats, memo) {
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(memo)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `zcash:${address}?amount=${toZecString(zats)}&memo=${b64}`;
}

const toZecString = (zats) => (zats / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");

export function ownWalletPanel({ to, zats, memo, watch }) {
  const panel = h("details.advanced", h("summary", "Advanced: use your own testnet wallet"));
  if (!to) return panel;
  const code = `s101-${Math.random().toString(36).slice(2, 8)}`;
  const fullMemo = `${memo} [${code}]`;
  const uri = zip321(to, zats, fullMemo);
  const status = h("p.small", "");
  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast("Copied"));
  let polling = false;

  async function watchForPayment(button) {
    if (polling) return;
    polling = true;
    if (button) { button.textContent = "Watching for your payment…"; button.disabled = true; }
    for (let i = 0; i < 120; i++) {
      try {
        const r = await api(`/incoming?wallet=${watch}&code=${code}`);
        if (r.found) {
          chime();
          status.replaceChildren(`✅ Received: “${r.memo}” (${r.status}) `, explorerLink(r.txid));
          button?.remove();
          return;
        }
      } catch (err) { status.textContent = err.message; }
      await new Promise((res) => setTimeout(res, 5000));
    }
    polling = false;
  }

  const noir = h("button.btn.secondary", {
    onclick: async (e) => {
      const wallet = window.noirwallet;
      if (!wallet?.zcash) {
        status.replaceChildren("Noir Wallet isn't installed in this browser. Get the testnet build (the release file ending ",
          h("b", "-testnet.zip"), ") from ", h("a", { href: NOIR_TESTNET, target: "_blank", rel: "noopener" }, "Noir Wallet releases"), ".");
        return;
      }
      // Noir's testnet extension can't report its network; only send to testnet addresses.
      if (!/^(utest1|ztestsapling)/.test(to)) return;
      try {
        await wallet.zcash.connect();
        const txid = await wallet.zcash.sendTransaction({
          to, amount: toZecString(zats), memo: fullMemo, fundingSource: "shielded",
        });
        status.replaceChildren("Sent from Noir Wallet. ", txid ? explorerLink(String(txid)) : "");
        watchForPayment(e.target);
      } catch (err) {
        status.textContent = `Noir Wallet: ${err?.message ?? "the payment was not sent"}`;
      }
    },
  }, "Pay with Noir Wallet (testnet extension)");

  panel.append(
    h("p.small", "Have your own testnet wallet? Pay from it instead. With the ",
      h("a", { href: NOIR_TESTNET, target: "_blank", rel: "noopener" }, "[Testnet] Noir Wallet"),
      " browser extension it's one tap. Zingo and other testnet wallets can open the payment link, or copy the details below."),
    noir,
    h("a.btn.secondary", { href: uri }, "Open in another wallet (ZIP-321 link)"),
    h("button.btn.secondary", { onclick: () => copy(uri) }, "Copy payment link"),
    h("div.card.tight",
      h("div.kv", h("span", "Address"), h("b.mono", to)),
      h("div.kv", h("span", "Amount"), h("b", zec(zats))),
      h("div.kv", h("span", "Memo"), h("b", fullMemo))),
    h("button.btn.secondary", { onclick: (e) => watchForPayment(e.target) }, "I've sent it: watch for my payment"),
    status,
  );
  return panel;
}
