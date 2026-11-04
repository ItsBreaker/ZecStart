// Split the learner wallet's shielded balance into many equal notes, so many
// learners can send at once (a note can't be reused until its change confirms).
// Opens the wallet directly, so the learner's interactive session must be
// stopped first.
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { config } from "./config.mjs";
import { parseBalance, parseTxids } from "../zingo/parse.mjs";

const run = promisify(execFile);

export async function splitLearnerNotes(count = 30) {
  const dataDir = join(config.walletDir, "learner");
  const zingo = async (...args) => (await run(config.zingoBin,
    ["--chain", config.chain, "--server", config.indexer, "--data-dir", dataDir, ...args],
    { maxBuffer: 1 << 24, timeout: 5 * 60_000 })).stdout;

  const address = (await zingo("addresses")).match(/"encoded_address": "([^"]+)"/)[1];
  const bal = parseBalance(await zingo("balance"));
  const spendable = (bal.confirmed_ironwood_balance ?? 0) + (bal.confirmed_orchard_balance ?? 0);
  // The wallet computes the ZIP-317 fee itself; keeping 2% back leaves room for it.
  const each = Math.floor((spendable * 0.98) / count);
  if (each < 50_000) throw new Error(`balance ${spendable} zats is too small for ${count} notes`);
  const outputs = Array.from({ length: count }, () => ({ address, amount: each }));
  const txid = parseTxids(await zingo("quicksend", JSON.stringify(outputs)));
  return { txid, count, each, spendable };
}
