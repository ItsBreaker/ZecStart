# Feedback

What slowed us down while building Shielded 101, for the teams who maintain these tools. Times are from 4 Nov 2026 on the public testnet (`testnet.zec.rocks:443`).

## SDK or wallet tool: zingo-cli (zingolib, built from source with `nakednet-test-mode`)

- **No way to see which address received a note when using a viewing key.** A view-only wallet's `value_transfers` shows value, memo and txid, but `recipient_address: not available` for received notes. So with diversified addresses per order you can't tell orders apart without unique amounts or a memo code. *Expected:* the receiving diversified address (or its diversifier index) on each received note.
- **The interactive prompt needs a terminal, and input lines are capped at about 1,000 bytes.** Driving zingo-cli from a service means wrapping it in a pseudo-terminal. A line longer than the pty's canonical-mode limit wedges the session, and there's no error; you have to restart it. Multi-output `quicksend` JSON hits this quickly (about four Unified Addresses). *Expected:* a non-interactive JSON mode over stdin/stdout, or a documented line limit with an error.
- **Interactive sync runs once, then idles.** After the first sync, new payments never appear until you send `sync run` again. A watcher has to send `sync run` before every poll. *Expected:* continuous sync in interactive mode, or a flag for it.
- **`--waitsync` on a one-shot command can take minutes on a fresh wallet** while the same wallet in an interactive session reaches the tip quickly.
- **Prompt output only refreshes on input**, so the block height in the prompt is stale until you send a command.
- **A failed send locks its note** until `remove_transaction <txid>` is run.
- **Received notes need several confirmations before they can be spent** (default `min_confirmations` is 3). For a demo that reuses funds quickly we set it to 1 with `settings min_confirmations 1`.
- `help <command>` reports "Command quickshield not found" for some commands listed in `--help`.

## Timings we measured (zingo-cli, no mixnet)

- Building and sending a shielded payment: about 2 s.
- Seen by the receiving view-only wallet (mempool): about 10–22 s after sending.
- Confirmed (mined and synced): about 104–160 s after sending.

## Explorer

- `testnet.zcashexplorer.app` blocks scripted requests (as the brief notes), and for v6 transactions its page shows "Orchard Action transfers: 0" with no Ironwood section. A learner can read that as "nothing shielded happened".
- CipherScan's public API (`api.testnet.cipherscan.app`) works from scripts and labels Ironwood actions correctly (`ironwoodActions`, `valueBalanceIronwoodZat`).

## Faucet

- Fauzec's per-address cooldown also applies when a claim was made through the web form, so a script that claims for the same address returns `address_on_cooldown`. That's the expected behaviour, but it would help if the claim response pointed to the earlier claim's txid.

## Docs

- Ironwood is described across ZIP 229, ZIP 258 and ZIP 318. A short "what is Ironwood" page for app developers would save time; older SDK docs and examples still describe Orchard as the current pool.
