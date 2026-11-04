// First boot: create the demo wallets if the wallet directory is empty.
//
// zingo-cli is run with execFile (no shell). Its output is only parsed for
// the address, viewing key or birthday we need; it is never printed, logged
// or returned, so a seed phrase can't leak even if zingo-cli printed one.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { config } from "./config.mjs";
import { zats } from "../zingo/parse.mjs";

const run = promisify(execFile);
const SEED = /\b([a-z]{3,8}\s+){11,}[a-z]{3,8}\b/g;

async function zingo(dataDir, ...args) {
  const { stdout } = await run(config.zingoBin, [
    "--chain", config.chain, "--server", config.indexer, "--data-dir", dataDir, ...args,
  ], { maxBuffer: 1 << 24, timeout: 10 * 60_000 });
  // Belt and braces: drop anything seed-like before the text is even parsed.
  return stdout.replace(SEED, "[SEED REDACTED]");
}

const walletFile = (dir) => join(dir, "zingo-wallet.dat");

export async function ensureWallets() {
  if (!existsSync(config.zingoBin)) {
    throw new Error(`zingo-cli not found at ${config.zingoBin}. Unset ZINGO_BIN to use the binary in the Docker image.`);
  }
  const root = config.walletDir;
  await mkdir(root, { recursive: true, mode: 0o700 });
  for (const name of ["learner", "friend", "journalist"]) {
    const dir = join(root, name);
    if (existsSync(walletFile(dir))) continue;
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await zingo(dir, "addresses"); // creates a new wallet with a fresh seed
    console.log(`[bootstrap] created wallet ${name}`);
  }
  // View-only twins, built from each receiver's unified full viewing key.
  for (const name of ["friend", "journalist"]) {
    const viewDir = join(root, `${name}-view`);
    if (existsSync(walletFile(viewDir))) continue;
    const ufvk = (await zingo(join(root, name), "export_ufvk")).match(/uviewtest1[0-9a-z]+/)?.[0];
    const birthday = zats((await zingo(join(root, name), "birthday")).match(/^\s*([\d_]+)\s*$/m)?.[1] ?? 0);
    if (!ufvk || !birthday) throw new Error(`could not read the ${name} viewing key or birthday`);
    // Labelled viewing key file: it can see the wallet's payments but not spend.
    const keyFile = join(root, `${name}.ufvk`);
    await writeFile(keyFile, `${ufvk}\n`, { mode: 0o600 });
    await chmod(keyFile, 0o600);
    await mkdir(viewDir, { recursive: true, mode: 0o700 });
    await zingo(viewDir, "--viewkey", ufvk, "--birthday", String(birthday), "wallet_kind");
    console.log(`[bootstrap] created view-only wallet ${name}-view (birthday ${birthday})`);
  }
}
