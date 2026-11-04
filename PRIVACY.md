# Privacy

Shielded 101 teaches privacy, so it should be clear about its own. Everything here refers to the Zcash **testnet**. TAZ has no monetary value.

## What the app (your browser) stores and sends

- **Progress** is kept in your browser's `localStorage` (`shielded101.progress.v1`): which lessons you finished and the txids of your transactions. It never leaves your device. "Start over" on the certificate page deletes it.
- **A per-tab session id** (a random UUID in `sessionStorage`) goes with each request so the backend can rate-limit. It isn't linked to you and disappears when the tab closes.
- **What you type**: memos for lessons 2 and 3 go to the backend, which puts them on the testnet inside encrypted transactions.
- **No analytics, cookies, trackers or third-party scripts.** Fonts are self-hosted. `frontend/zcash/js/analytics.mjs` is a stub that does nothing (see ROADMAP).
- Your browser contacts a block explorer only when you click an explorer link.

## What the backend can see

The backend runs the custodial testnet wallets, so it is in a position of trust:

- **Your IP address** and the session id, held in memory for up to an hour for rate limiting. They aren't written to disk.
- **Your memos and the payments made for you.** The backend creates these transactions, so it knows their contents. Its view-only wallets also decrypt memos sent to the friend and the journalist.
- **Logs** record errors and sweep txids. They don't record IPs or memos.
- The backend fetches explorer data for txids it is tracking from CipherScan's public testnet API, so that service sees those lookups come from the backend's server, not from you.

The backend can't learn who you are beyond your IP. There are no accounts, emails or names.

## Memos in the demo wallets are readable by anyone

Both demo receiving wallets have **published viewing keys**: the friend wallet's is in [SUBMISSION.md](SUBMISSION.md) so judges can verify the core flow, and the journalist fund's is shown in lesson 4. Anyone who loads one of those keys can read every memo sent to that wallet, along with its amount and time. Every memo box in the app says so: *"This is a public demo wallet. Its viewing key is published, so anyone can read this message. Don't write anything personal."*

That is itself one of the lessons: a memo is private from the public chain, not from viewing-key holders. Whoever holds the recipient's viewing key, or its spending key, can read it, and so can the sender.

## What the public can see on the testnet

- **Lesson 1:** the withdrawal to a transparent address (address and amount) is public, as is the shielding transaction's transparent input and the amount entering the shielded pool. That's the point of the lesson.
- **Lessons 2 and 3:** for shielded-to-shielded transactions, the public sees that a transaction happened, when it happened, its fee, size and number of shielded actions. Sender, receiver, amount and memo are encrypted.
- **Lesson 4:** the journalist fund's viewing key is **published on purpose**. Anyone with it can see every donation's amount, time and memo, plus payments the fund sends (including the periodic sweep back to the learner wallet). It does not reveal donors' addresses. This is why the lessons warn against putting identifying information in donation memos.

## Demo shortcuts (dev-only)

These are demo trade-offs to make a zero-setup lesson possible, not how a production wallet should work:

1. **Custodial wallets.** One shared learner wallet sends for everyone, and the operator holds its seed. Every learner's payments come from the same wallet, which is fine for teaching but gives no privacy *between* learners and the operator.
2. **No mixnet.** The zingo-cli build used for the demo connects to the indexer directly, without its Nym mixnet transport. The indexer therefore sees the backend server's IP address (not learners' IPs).
3. **One confirmation.** The learner wallet spends and shields after 1 confirmation instead of zingo's default of 3, so lessons fit in about two minutes.
4. **Shared shielding.** In lesson 1, one shielding transaction may sweep the transparent coins of several learners who are shielding at the same moment.
5. **Recycling sweeps.** Every 15 minutes the friend and journalist wallets send their balances back to the learner wallet. These are visible to holders of the journalist's viewing key.

## Who must be trusted

- **Us, the operator.** The backend holds the custodial testnet wallets. It creates every learner's transaction, so it knows each memo and amount, and it sees learners' IP addresses (in memory only).
- **The light-wallet server** (`testnet.zec.rocks`) sees the backend's IP address and its sync and send timing. It doesn't see learners' IPs.
- **Cloudflare** (Workers for the site, Tunnel for the API) sees learners' IP addresses and requests in transit.
- **CipherScan's public API** sees which txids the backend looks up.
- **Anyone holding a published viewing key** can read the friend's and journalist's incoming memos and amounts (above).

## What the server stores and logs

- **Stored on disk:** the wallet files and viewing keys in `backend/wallets/` (gitignored). Nothing about learners.
- **In memory only, lost on restart:** rate-limit counters keyed by IP and per-tab id (for up to 1 hour), and the txids being tracked with their seen and confirmed times (for up to 6 hours).
- **Logs:** start-up messages, errors and sweep txids. No IP addresses, and no memo contents.

## What we'd fix next

1. Route the backend's light-wallet traffic through the Nym mixnet, so the light-wallet server no longer sees the operator's IP and timing.
2. Non-custodial learner wallets (for example, Noir Wallet's testnet extension for everyone), so the operator no longer sees memos or amounts.
3. A demo receiving wallet per learner session, so published viewing keys never expose other learners' memos.

## Keys and secrets

Seeds and spending keys stay on the backend machine in `backend/wallets/`. That directory is gitignored, and they never appear in code, logs or this repository, and are never sent to the browser. The pty bridge masks anything resembling a seed phrase before zingo-cli output reaches the service. Two **viewing keys** are published on purpose, labelled as such: the friend wallet's (in SUBMISSION.md, for judges) and the journalist fund's (lesson 4).
