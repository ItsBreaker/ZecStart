# zingo-session

Drive [zingo-cli](https://github.com/zingolabs/zingolib) from Node.js: one long-lived interactive session per wallet, a command queue, and parsers for its text output. No npm dependencies. It needs Node 20+, Python 3 and a zingo-cli binary.

It was written for Zec Start. It's useful to any Zcash testnet backend, bot or payment watcher that wants zingo-cli's Ironwood support without writing Rust.

## Why a session wrapper?

Driving zingo-cli from a service runs into a few problems:

- **Starting is slow.** Each one-shot command reloads the wallet and syncs. A long-lived session answers in milliseconds.
- **The interactive prompt needs a terminal.** `pty_bridge.py` runs zingo-cli in a pseudo-terminal 4,000 columns wide, so long addresses don't wrap and redraw. It forwards stdin and stdout.
- **Seed phrases must never reach logs.** The bridge masks any run of 12 or more lowercase words before output leaves it.
- **Input lines are capped at about 1,000 bytes.** A longer line silently wedges the session, so `run()` rejects anything over 950 bytes instead.
- **Interactive sync runs once, then idles.** Send `sync run` before each poll, or new payments never appear.
- **Output is not JSON.** Commands like `balance` and `value_transfers` print `key: value` text with `100_000_000` digit groups. `parse.mjs` handles it.

## Use

```js
import { ZingoSession } from "./zingo/session.mjs";
import { parseBalance, parseTxids, parseValueTransfers } from "./zingo/parse.mjs";

const wallet = new ZingoSession({
  name: "shop",
  dataDir: "./wallets/shop",          // an existing zingo-cli wallet directory
  zingoBin: "/path/to/zingo-cli",
  server: "https://testnet.zec.rocks:443",
});
await wallet.start();                 // resolves at the first prompt

await wallet.run("sync run");
console.log(parseBalance(await wallet.run("balance")));

// Send with a memo; the wallet computes the ZIP-317 fee.
const txid = parseTxids(await wallet.run(`quicksend utest1… 50000 "order 42"`));

// Watch for incoming payments (works the same on a view-only wallet).
await wallet.run("sync run");
for (const t of parseValueTransfers(await wallet.run("value_transfers"))) {
  if (t.kind === "received") console.log(t.txid, t.status, t.value, t.memos);
}
wallet.stop();
```

A view-only wallet is created once with zingo-cli's `--viewkey <uviewtest…> --birthday <height>`, then opened like any other wallet directory. Asking it to spend fails with `No spend capability` once it has confirmed funds.

## API

`new ZingoSession({ name, dataDir, zingoBin, server?, chain?, python?, extraArgs? })`

- `start(): Promise<void>` spawns zingo-cli and waits for its first prompt.
- `run(command, timeoutMs = 60000): Promise<string>` queues one command and resolves with what it printed (echo and prompt removed).
- `stop()` asks zingo-cli to save and quit.
- `ready: boolean`.

`parse.mjs`:

- `parseValueTransfers(text)` returns `[{ txid, status, blockheight, datetime, kind, value, fee, poolsReceived, memos[] }]`. `status` is one of `calculated`, `transmitted`, `mempool`, `confirmed`.
- `parseBalance(text)` returns `{ confirmed_ironwood_balance, … }` in zatoshis.
- `parseTxids(text)` returns the first txid, or throws with zingo-cli's error chain.
- `parseError(text)` returns zingo-cli's `Error: … caused by: …` chain on one line, or `null`.
- `zats("100_000_000")` returns `100000000`.

## Notes

- Commands from one session run strictly one after another. Use one session per wallet, and never open the same wallet directory from two processes.
- A send that fails after it was built keeps its note locked. Run `remove_transaction <txid>` to release it.
- Tested with zingo-cli built from zingolib in Oct–Nov 2026 on the NU7 testnet (Ironwood pool).
