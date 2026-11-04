// Split the learner wallet's shielded balance into many equal notes, so many
// learners can send at once (a note can't be reused until its change confirms).
// Run with the API stopped: it opens the wallet directly.
//
//   node backend/scripts/split-notes.mjs [count]
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { config } from "../src/config.mjs";
import { parseBalance, parseTxids } from "../src/parse.mjs";

const count = Number(process.argv[2] ?? 30);
const dataDir = join(config.walletDir, "learner");
const zingo = (...args) => execFileSync(config.zingoBin,
  ["--chain", config.chain, "--server", config.indexer, "--data-dir", dataDir, "--waitsync", ...args],
  { encoding: "utf8", maxBuffer: 1 << 24 });

const address = zingo("addresses").match(/"encoded_address": "([^"]+)"/)[1];
const bal = parseBalance(zingo("balance"));
const spendable = (bal.confirmed_ironwood_balance ?? 0) + (bal.confirmed_orchard_balance ?? 0);
// Leave room for the ZIP-317 fee (one logical action per output, generously).
const each = Math.floor((spendable - 5_000 * (count + 4)) / count);
if (each < 50_000) throw new Error(`balance ${spendable} zats is too small for ${count} notes`);

const outputs = Array.from({ length: count }, () => ({ address, amount: each }));
console.log(`splitting ${spendable} zats into ${count} notes of ${each} zats`);
console.log("txid", parseTxids(zingo("quicksend", JSON.stringify(outputs))));
