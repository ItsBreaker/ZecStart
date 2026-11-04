# Shielded 101

**Learn Zcash privacy by doing it, on the real testnet, in about ten minutes.**

Shielded 101 is a public web page at `/zcash` with five short, visual lessons. Each lesson sends a real transaction on the Zcash testnet and gives you a block-explorer link so you can check it yourself. You don't need a wallet install, a sign-up or a faucet. A first-timer on a phone should be able to finish it without help.

| # | Lesson | What you do | What you learn |
|---|--------|-------------|----------------|
| 1 | Shield your coins | An "exchange" withdraws TAZ to a transparent address, then you press **Shield** | Transparent Zcash is public; shielding moves funds into the shielded pool |
| 2 | Pay a friend privately | Type a memo and send a shielded payment | Sender, receiver, amount and memo are encrypted; only the recipient's keys read them |
| 3 | Donate privately | Give to a fictional journalist's fund | What the public can and can't see about a shielded donation |
| 4 | Verify the fund | Load the fund's published viewing key, then try to spend with it | Viewing keys reveal payments and memos (but not donors) and cannot spend |
| 5 | Certificate | Collect a "Shielded 101" badge | Progress is stored only in your browser |

Each lesson has a 2–3 sentence explanation, one big button, a live animation, the real on-chain result, an explorer link and a "what just happened" recap. Lessons 2 and 3 also have an optional **"use your own testnet wallet"** path that uses a ZIP-321 payment link.

## Why it matters

Zcash's privacy only helps people who use it, and most people's first contact with crypto is a transparent, Bitcoin-like transaction. Shielded 101 shows the difference rather than describing it: you watch the same kind of payment be public in one lesson and sealed in the next, then use a viewing key to see why selective disclosure, not secrecy from everyone, is the useful property. The donation lessons use a realistic scenario where privacy protects people: supporting a journalist without exposing your identity.

## Architecture

```
 Browser (static site, Cloudflare Pages)        Laptop or Linux server
 ┌───────────────────────────────┐   HTTPS   ┌──────────────────────────────────┐
 │ frontend/zcash/  (no build)   │ ───────▶  │ cloudflared tunnel               │
 │  hash routes #/shield, #/…    │           │   ▼                              │
 │  progress in localStorage     │           │ backend/ (Node, no npm deps)     │
 └───────────────────────────────┘           │   JSON API under /zcash/api      │
            │ explorer links                  │   one zingo-cli session / wallet │
            ▼                                 │   via pty_bridge.py              │
  testnet.zcashexplorer.app                   │   ▼                              │
                                              │ testnet indexer (lightwalletd)   │
                                              └──────────────────────────────────┘
```

- **Frontend** (`frontend/`): plain HTML, CSS and ES modules with no framework and no build step. Everything lives under `frontend/zcash/` and every style is scoped under `.s101`, so the module can be mounted inside a bigger site. Routing uses the URL hash, so it works under any base path without server rewrites. The deployment settings (API URL and explorer URL pattern) live in one file, `frontend/zcash/config.js`.
- **Backend** (`backend/`): a small Node service wrapping [zingo-cli](https://github.com/zingolabs/zingolib). zingo-cli is a native binary, so this can't run on Workers. It runs on a laptop or any Linux box behind a Cloudflare Tunnel. Each wallet keeps one long-lived interactive zingo-cli session (`backend/src/session.mjs`) so it doesn't resync for every request.
- **Wallets** (custodial, testnet only, under `backend/wallets/`, gitignored):
  - `learner`: sends on every learner's behalf; it holds a shielded balance split into many notes so several learners can act at once, plus a transparent address for lesson 1
  - `friend` and `friend-view`: the payment recipient and its view-only twin, which detects and decrypts payments
  - `journalist` and `journalist-view`: the fund and the view-only wallet built from its published viewing key
- **Detection**: when the backend sends, it records the txid. The receiving view-only wallet then syncs every few seconds and reports when the transaction is **seen** (in the mempool) and **confirmed** (mined). On testnet that's typically about 15–20 s and 1.5–2.5 min after sending.
- **Recycling**: every 15 minutes a sweep sends the friend's and journalist's balances back to the learner wallet. The journalist keeps a small float so the view-only "try to spend" demo always has funds to refuse.
- **Explorer**: links go to `testnet.zcashexplorer.app`. For the in-page "what anyone can see" panels, the backend reads CipherScan's public testnet API, so learners' browsers don't contact a third party unless they click a link.

### A note on the Ironwood pool

On today's testnet, shielded notes land in the **Ironwood** pool. Ironwood is defined in [ZIP 229](https://zips.z.cash/zip-0229) as a new value pool of the Orchard protocol, with its own note commitment tree, activated by the NU6.3 network upgrade ([ZIP 258](https://zips.z.cash/zip-0258)). After NU6.3, payments to a Unified Address's Orchard receiver go into Ironwood, and [ZIP 318](https://zips.z.cash/zip-0318) describes how wallets migrate existing Orchard funds across. For the learner nothing changes: addresses look the same and privacy works the same way. Some explorers still label these transactions by the older Orchard counters, which is why the app explains "Orchard actions: 0" where it appears.

### Custody note

Shielded 101 uses **custodial testnet wallets**. This is a deliberate demo design choice, not a recommendation. It's what lets a first-timer finish without installing a wallet or finding a faucet. TAZ has no monetary value. Seeds and keys stay on the backend machine and never reach the browser or this repository. The one exception is the journalist fund's viewing key, which is published on purpose because lesson 4 is about publishing it. Real users should hold their own keys. The "use your own testnet wallet" option in lessons 2 and 3 shows that path.

## Safety

- **Fixed amounts.** Learners never choose arbitrary amounts. Donations are one of three preset values, and memos are capped at 200 bytes and sanitised.
- **Rate limits** on every action that moves funds: per IP (40 per hour) and per browser tab session (12 per hour). Behind Cloudflare, the visitor IP comes from `CF-Connecting-IP` (`TRUST_PROXY=cloudflare`).
- **CORS** is restricted to the origins in `ALLOWED_ORIGINS`.
- **Friendly errors.** Failures return plain-English messages, and the UI offers a Retry button.
- Anything resembling a seed phrase is masked by the pty bridge before it reaches the service or its logs.

## Run it locally

Requirements: Node 20+, Python 3, and a `zingo-cli` build that can reach a testnet indexer.

```sh
# 1. Create the wallets (once). Each command creates a new testnet wallet.
cd backend
Z=/path/to/zingo-cli; S=https://testnet.zec.rocks:443
for w in learner friend journalist; do $Z --chain testnet --server $S --data-dir wallets/$w addresses; done
for w in friend journalist; do
  $Z --chain testnet --server $S --data-dir wallets/$w export_ufvk | grep -o 'uviewtest1[0-9a-z]*' > wallets/$w.ufvk
  $Z --chain testnet --server $S --data-dir wallets/$w-view \
     --viewkey "$(cat wallets/$w.ufvk)" --birthday "$($Z --chain testnet --server $S --data-dir wallets/$w birthday | grep -o '^[0-9]*')" wallet_kind
done
# Fund the learner wallet's unified address with testnet TAZ, then split it into notes
# (see "Splitting notes" below).

# 2. Start the API
cp .env.example .env   # set ZINGO_BIN, ALLOWED_ORIGINS
npm start              # http://127.0.0.1:8787/zcash/api/health

# 3. Serve the frontend
cd ../frontend && python3 -m http.server 8080
# open http://localhost:8080/zcash/
```

### Splitting notes

A note that has just been spent can't be spent again until its change confirms. So the learner wallet's balance should be split into roughly 30 small notes, which lets that many learners send at the same moment:

```sh
node backend/scripts/split-notes.mjs 30   # with the API stopped
```

## Deploy

**Frontend (Cloudflare Pages):** connect this repository, set the build command to *none* and the output directory to `frontend`. Before deploying, set `apiUrl` in `frontend/zcash/config.js` to your tunnel's URL. The site is then served at `https://<project>.pages.dev/zcash/`.

**Backend (Cloudflare Tunnel):**

```sh
cd backend && npm start                                 # binds to 127.0.0.1:8787
cloudflared tunnel --url http://127.0.0.1:8787           # quick tunnel, prints a URL
# or a named tunnel on your own domain:
#   cloudflared tunnel create shielded101
#   cloudflared tunnel route dns shielded101 api.example.org
#   cloudflared tunnel run --url http://127.0.0.1:8787 shielded101
```

Set `ALLOWED_ORIGINS` to the Pages URL and `TRUST_PROXY=cloudflare`. The same steps work on a Linux server: install Node, Python 3, zingo-cli and cloudflared, and copy the `wallets/` directory over a secure channel.

## Repository layout

```
frontend/              static site (Cloudflare Pages output directory)
  zcash/index.html     the module's single page
  zcash/config.js      deployment settings (API URL, explorer)
  zcash/js/lessons/    one module per lesson
  zcash/js/analytics.mjs   analytics interface stub (no-op)
backend/
  src/server.mjs       HTTP API
  src/wallets.mjs      sending, detection, fund view, sweep
  src/session.mjs      long-lived zingo-cli sessions
  pty_bridge.py        gives zingo-cli the terminal it needs; masks seeds
PRIVACY.md             what the app and backend can and can't see
ROADMAP.md             next steps
```

## Accuracy

The lesson text was checked against the Zcash protocol specification and ZIPs: [ZIP 316](https://zips.z.cash/zip-0316) (unified addresses and viewing keys), [ZIP 302](https://zips.z.cash/zip-0302) (memos), [ZIP 321](https://zips.z.cash/zip-0321) (payment URIs), [ZIP 317](https://zips.z.cash/zip-0317) (fees), and ZIP 229, 258 and 318 (Ironwood). If you spot an inaccuracy, please open an issue.

## Licence

MIT, see [LICENSE](LICENSE). Fonts: Inter and Alegreya SC, SIL Open Font License 1.1 (see `frontend/zcash/fonts/`).
