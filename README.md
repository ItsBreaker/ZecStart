# Zec Start

> Five hands-on lessons that take someone who has never made a shielded payment from public coins to a private payment, a private donation and a viewing-key audit. They run on the real Zcash testnet, on a phone, with nothing to install, in about ten minutes.

| | |
|---|---|
| **Track** | Privacy |
| **Privacy theme** | 2. The first five minutes |
| **What it is** | Web app (static frontend + small wallet backend) |
| **Live URL** | https://zecstart.jayden-3af.workers.dev/zcash/ |
| **Demo video** | `[VIDEO_URL]` |
| **Testnet txid** | [`e3d7a1be977345372a9a2de427451df8e3cf1c2362a49d97f42b316e6dbb84c8`](https://zexplorer.app/testnet/tx/e3d7a1be977345372a9a2de427451df8e3cf1c2362a49d97f42b316e6dbb84c8): a shielded `utest1` → `utest1` payment with a memo, made by the app. More in [SUBMISSION.md](SUBMISSION.md). |
| **Team** | `[TEAM]` |

---

## 1. The problem and who it's for

- **User:** people at their first Zcash event or workshop, like the attendees of Free Society Hack in Mumbai, who have never sent a shielded payment and are often on a phone.
- **Problem:** before you can see what shielding does, you need an NU7-capable wallet, testnet coins and a way to check the result. Each step has its own friction, so most first-timers never get as far as the "aha".
- **Evidence** (from the organisers' brief, saved unchanged as [AGENTS.md](AGENTS.md); source: [llms.txt](https://stadium.joinwebzero.com/programs/free-society-hack-2026/privacy/llms.txt)):
  - The track has a theme for exactly this: *"The first five minutes: onboarding to a first shielded payment in minutes, paying a name, plain confirmation screens, translations, low-end phones."*
  - Getting a wallet: *"There is no pure JavaScript or Python way to create an Ironwood address"*. The options are a Rust tool (a 15–30 minute build) or a browser extension loaded unpacked. WebZjs and the crates.io zcli can't receive Ironwood funds.
  - Getting coins: the Valar faucet gives 0.125 TAZ *"per IP per day, so at the venue it works once for the whole room"*, and the Jino Labs faucet *"is paused for NU7"*.
  - Checking the result: `testnet.zcashexplorer.app` *"blocks scripted requests"*. On that explorer, these transactions show "Orchard Action transfers: 0" and no Ironwood section (see [FEEDBACK.md](FEEDBACK.md)), which a newcomer can easily misread.
  - `[ADD: what people at the venue said, with their permission. Real conversations only.]`

Zec Start removes all three barriers. We run practice wallets, pre-split into many notes so a room full of people can act at once. Every step gives you a real txid and an explorer link, and the app shows what the explorer can and can't see.

## 2. What it does

| # | Lesson | One button | What you see |
|---|---|---|---|
| 1 | Shield your coins | "Withdraw from the exchange", then "Shield my coins" | Coins land at a public `tm…` address (address and amount visible), then move into the shielded (Ironwood) pool |
| 2 | **Pay a friend privately** (core flow) | "Send 0.0005 TAZ privately", with your memo | A sent → seen → confirmed timeline, and side by side: what the explorer sees (fee, 2 shielded actions, unreadable bytes) and what your friend's wallet decrypts (amount, memo, "from: not revealed") |
| 3 | Donate privately | "Donate privately" to a fictional journalist's fund | What the public can and can't see |
| 4 | Verify the fund | "Load the viewing key", then "Try to spend with the viewing key" | Every donation and memo, with no donor identities; then zingo-cli's real error: *No spend capability* |
| 5 | Certificate | n/a | A badge plus your txids, stored only in your browser |

Each lesson has a 2–3 sentence explanation, one big button, a live animation, the real result, an explorer link and a "what just happened" recap. Lesson 4 adds two lessons: anything in a memo is visible to viewing-key holders, and the same idea gives you a watch-only wallet on a second device.

Optional paths: **"Use your own testnet wallet"** (Noir Wallet's testnet extension first, with a one-tap `sendTransaction`; any other wallet through a ZIP-321 link with a one-time memo code the receiving view-only wallet watches for), and **"Invite a real friend"** (a shareable link so two learners can pay each other).

## 3. Try it in 5 minutes

**Without installing anything:**
1. Open https://zecstart.jayden-3af.workers.dev/zcash/ on a phone.
2. Tap **Start lesson 1**, or go straight to lesson 2: type a memo and tap **Send privately**.
3. Within about 20 s you'll see ✅ and your memo, decrypted by your friend's wallet, next to what the explorer sees. Tap the explorer link to check the txid yourself.

**Run it locally:** see [Run and deploy](#run-and-deploy) below.

**Requirements:** Node 20+, Python 3, a `zingo-cli` build ([zingolib](https://github.com/zingolabs/zingolib), Ironwood-capable).

**Test funds:** none needed to use the app. To run your own backend, fund the learner wallet's `utest1` address from [Fauzec](https://fauzec.com) (1 TAZ per address per day), then split it into notes (below).

## 4. What actually works

| Step in the core flow (lesson 2) | Status | Evidence |
|---|---|---|
| Learner's memo sent from the custodial learner wallet as a shielded payment (`utest1` → `utest1`, Ironwood) | ✅ real | [`e3d7a1be…`](https://zexplorer.app/testnet/tx/e3d7a1be977345372a9a2de427451df8e3cf1c2362a49d97f42b316e6dbb84c8), also `2a498118…` sent through the frontend |
| Detected and decrypted by the friend's view-only wallet (mempool) | ✅ real | seen 1–10 s after sending; memo and amount shown in the app |
| Confirmed in a block | ✅ real | 17 s after sending, block 4582305 |
| Explorer view (fee, shielded actions, raw bytes) | ✅ real | read from CipherScan's public testnet API |
| Lessons 1, 3, 4 | ✅ real | txids in [SUBMISSION.md](SUBMISSION.md) |
| Deployed app end to end (Cloudflare Workers frontend → Railway backend) | ✅ real | all four lessons on 4 Nov, 21:45–21:50 IST; lesson 2 txid [`8d1b41e0…`](https://zexplorer.app/testnet/tx/8d1b41e008cd6c53ea592936430e235e1c1a3650c8f98fc79d71fa5dba607dc2) |

No core step is mocked or manual. **Known limitations:** the wallets are custodial by design (see the trust note). Lesson 4's "try to spend" needs the fund to hold confirmed coins; if its newest donations are still confirming, the app says so and offers Retry rather than showing a misleading error. Transaction tracking is in memory, so a backend restart forgets in-flight timelines (the transactions themselves are unaffected).

## 5. Privacy and trust

Full note: [PRIVACY.md](PRIVACY.md).

1. **What stays private?** In lessons 2–4, sender, receiver, amount and memo are encrypted on-chain. The public sees that a shielded transaction happened, its time, fee, size and number of actions. In lesson 1, the transparent withdrawal (address and amount) and the amount entering the pool are public. That's what the lesson teaches.
2. **What does the app reveal, and to whom?**
   - **Our backend (the operator)** creates every transaction, so it knows each memo and amount. It sees learners' IPs and a per-tab random id, held **in memory only** for rate limiting (up to 1 hour), never written to disk. Logs contain no IPs and no memo contents.
   - **The light-wallet server** (`testnet.zec.rocks`) sees the backend's IP and sync timing, not learners'. Our zingo-cli build connects without the Nym mixnet.
   - **CipherScan's API** sees which txids the backend looks up.
   - **Cloudflare** (Workers) sees learners' IPs when they load the site; **Railway** (the API host) sees their IPs and API requests, and hosts the volume with the custodial testnet wallets.
   - **Anyone** can read the journalist fund's activity, because its viewing key is published on purpose (lesson 4).
   - The browser stores progress and txids in `localStorage` only. There are no analytics, cookies or third-party scripts.
3. **Who do users have to trust?** Us as operator (custodial testnet wallets), Railway, Cloudflare, `testnet.zec.rocks` and CipherScan, each for the data above.
4. **What would we fix next?** Route the backend's light-wallet traffic through Nym, and move to non-custodial learner wallets so the operator no longer sees memos.

**Viewing key (receiving demo wallet, "friend"):** in [SUBMISSION.md](SUBMISSION.md), with birth height 4582081.

## 6. How it's built

- **Technologies used:**
  - Zcash testnet (NU7, Ironwood pool), light-wallet server `https://testnet.zec.rocks:443` (lightwalletd v0.5.4 in front of Zebra 7.0.0, per the brief)
  - [zingo-cli](https://github.com/zingolabs/zingolib) from zingolib commit `3f2529e22` (2 Nov 2026), built with the `nakednet-test-mode` feature (no mixnet)
  - Node.js (tested on v26.13.0; needs 20+), no npm dependencies; Python 3.9 for the pty bridge
  - Plain HTML, CSS and ES modules (no framework, no build step); Inter and Alegreya SC fonts (SIL OFL), self-hosted
  - Cloudflare Workers static assets (`wrangler.jsonc`) for the frontend; [Railway](https://railway.com) (Docker, `rust:1-bookworm` build stage with Rust 1.99.0 from zingolib's `rust-toolchain.toml`, `node:22-bookworm-slim` runtime, a persistent volume) for the backend
  - [testnet.zcashexplorer.app](https://testnet.zcashexplorer.app) for in-app explorer links (Zexplorer's index returned "Transaction not found" for some of our confirmed transactions); [CipherScan](https://api.testnet.cipherscan.app) public testnet API for the in-page explorer view
  - [Noir Wallet](https://github.com/NoirWallet/noir-wallet/releases) testnet extension (optional own-wallet path, via `window.noirwallet`)
  - ZIPs: [316](https://zips.z.cash/zip-0316) (unified addresses and viewing keys), [317](https://zips.z.cash/zip-0317) (fees, always computed by the wallet), [302](https://zips.z.cash/zip-0302) (memos), [321](https://zips.z.cash/zip-0321) (payment links), [229](https://zips.z.cash/zip-0229)/[258](https://zips.z.cash/zip-0258)/[318](https://zips.z.cash/zip-0318) (Ironwood)
- **Architecture:**

  ```
  [Learner's phone] → [Static site on Cloudflare]  ──HTTPS──▶ [Railway: Node API + zingo-cli, wallets on a volume]
                                                                                       │ one zingo-cli session per wallet
                                                                                       ▼
                                                              [testnet.zec.rocks lightwalletd] → [Zcash testnet]
  ```

  Wallets (custodial, testnet, gitignored): **learner** (sends for everyone, about 30 notes so many learners can act at once; plus a transparent address for lesson 1), **friend** + **friend-view** (receiver and its view-only twin, which detects and decrypts), **journalist** + **journalist-view** (the fund and the view-only wallet built from its published key). A sweep every 15 minutes returns the friend's and journalist's funds to the learner wallet.

- **Design decisions:**
  - **Custodial testnet wallets.** This is the only way a first-timer can finish with no install and no faucet, which is what Theme 2 is about. TAZ is worthless, and seeds never leave the backend machine.
  - **Detection by txid.** The backend knows the txid it sent, so the receiving view-only wallet just watches for it (seen = mempool, confirmed = mined). Payments from learners' own wallets are matched by a one-time code in the memo, because zingo-cli's view-only wallets don't report which diversified address received a note. We chose this over CipherPay: no third party holds a viewing key, and it's what we had already proven on testnet.
  - **Confirmation threshold: 1 block.** Lessons show ✅ when the receiving wallet sees the payment, then "confirmed" once it is mined. Nothing of value is released, so 1 block is enough. The learner wallet spends after 1 confirmation instead of zingo's default 3 so that each lesson fits in about two minutes.
  - **Fees are never hard-coded.** zingo-cli computes the ZIP-317 fee for every send; the sweep sizes itself with `max_send_value`.
  - **No framework.** A first visit to the core lesson loads about 114 KB in total, fonts included. Layouts are mobile-first for screens 360 px wide, with large text and tap targets of at least 44 px. All styles are scoped under `.s101` and routes use the URL hash, so the module can be mounted at `/zcash` on any site.
  - **Honest explorer view.** The backend fetches public explorer data itself, so the learner's browser contacts no third party unless they click a link.
- **Code worth reading:**
  - [`backend/zingo/`](backend/zingo/): **zingo-session**, a reusable, dependency-free Node driver for zingo-cli (long-lived sessions, command queue, seed masking, output parsers), with its own [README](backend/zingo/README.md).
  - [`backend/src/wallets.mjs`](backend/src/wallets.mjs): sending, sent → seen → confirmed tracking, the fund view, the sweep.
  - [`frontend/zcash/js/lessons/friend.mjs`](frontend/zcash/js/lessons/friend.mjs): the core lesson.
- **Built during the hack vs before:** everything in this repository was written on 4 Nov 2026 during the hack (see the commit history). zingo-cli was built from unmodified upstream zingolib.
- **Reusable parts:** `backend/zingo/` (zingo-session); `FEEDBACK.md` documents zingo-cli behaviours other builders will hit.

## 7. What's next (30 days)

`[NEXT_STEP: to be filled in with links]`

- **Next milestone:** `[TBD]`
- **Who benefits:** `[TBD]`
- **Already started:** `[links: issue, PR, forum post, partner message]`

## 8. Links

- Repo: https://github.com/ItsBreaker/ZecStart
- Demo video: `[VIDEO_URL]`
- Live app: https://zecstart.jayden-3af.workers.dev/zcash/

## Run and deploy

```sh
git clone https://github.com/ItsBreaker/ZecStart && cd ZecStart/backend
cp .env.example .env        # ZINGO_BIN, ALLOWED_ORIGINS, TRUST_PROXY (see comments in the file)
```

1. **Create the wallets** (once; each command makes a new testnet wallet in the gitignored `wallets/`):

   ```sh
   Z=/path/to/zingo-cli; S=https://testnet.zec.rocks:443
   for w in learner friend journalist; do $Z --chain testnet --server $S --data-dir wallets/$w addresses; done
   for w in friend journalist; do
     $Z --chain testnet --server $S --data-dir wallets/$w export_ufvk | grep -o 'uviewtest1[0-9a-z]*' > wallets/$w.ufvk
     B=$($Z --chain testnet --server $S --data-dir wallets/$w birthday | grep -o '^[0-9]*')
     $Z --chain testnet --server $S --data-dir wallets/$w-view --viewkey "$(cat wallets/$w.ufvk)" --birthday $B wallet_kind
   done
   ```

2. **Fund and split.** Send TAZ to the learner's `utest1` address (for example from Fauzec). Once it has confirmed, run `node scripts/split-notes.mjs 30` with the API stopped.
3. **Start the API:** `npm start`. It listens on `127.0.0.1:8787` under `/zcash/api`; check `/zcash/api/health`.
4. **Serve the frontend locally:** `cd ../frontend && python3 -m http.server 8080`, then open http://localhost:8080/zcash/.

**Deploy:**
- **Frontend:** connect the repo to Cloudflare. As a Worker, `wrangler.jsonc` serves `frontend/` as static assets; as Pages, set no build command and output directory `frontend`. Set `apiUrl` in [`frontend/zcash/config.js`](frontend/zcash/config.js) to the backend's public URL.
- **Backend (Railway):** `backend/Dockerfile` builds zingo-cli from upstream zingolib (pinned commit, no mixnet) and runs the API as a non-root user. On first boot it creates the five wallets on the volume.
  1. Railway → **New Project** → **Deploy from GitHub repo** → pick this repo. In the service's **Settings**, set **Root Directory** to `backend` (it then uses `backend/Dockerfile` and `backend/railway.json`).
  2. **Add a volume** to the service with mount path `/data` (wallets live in `/data/wallets`).
  3. **Variables:** `ALLOWED_ORIGINS=https://zecstart.jayden-3af.workers.dev`, `TRUST_PROXY=railway`, `INDEXER=https://testnet.zec.rocks:443`, `ADMIN_TOKEN=<random, 24+ characters>`. Railway sets `PORT`.
  4. **Settings → Networking → Generate Domain**, then set `apiUrl` in `frontend/zcash/config.js` to `https://<domain>/zcash/api`.
  5. Open `https://<domain>/zcash/api/health`. Once `ready` is true it shows `learnerAddress`: fund it, wait for one confirmation, then split it into notes with `curl -X POST https://<domain>/zcash/api/admin/split -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"count":30}'`.
- **Backend (any machine):** `npm start`, then expose it with `cloudflared tunnel --url http://127.0.0.1:8787` and set `TRUST_PROXY=cloudflare`.

**Safety controls:** fixed amounts (donations are one of three presets); memos are capped at 200 bytes and sanitised (the protocol limit is 512); rate limits per IP (40 per hour) and per browser tab (12 per hour), held in memory; a CORS allow-list; friendly errors with Retry; seed-like output is masked before it reaches the service.

## Feedback

See [FEEDBACK.md](FEEDBACK.md).

## Licence

MIT, see [LICENSE](LICENSE). Fonts: Inter and Alegreya SC, SIL Open Font License 1.1 (`frontend/zcash/fonts/`).

## Resources used

- Privacy track brief: [AGENTS.md](AGENTS.md) (from https://stadium.joinwebzero.com/programs/free-society-hack-2026/privacy/llms.txt)
- Testnet faucet: https://fauzec.com
- Testnet explorer: https://zexplorer.app (`/testnet/tx/<txid>`)
- zingolib / zingo-cli: https://github.com/zingolabs/zingolib
