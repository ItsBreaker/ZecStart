// The custodial testnet wallets behind the lessons, and the logic that sends
// from them and watches for the results.
//
//   learner          sends on every learner's behalf (shielded + transparent)
//   friend           receives "Pay a friend" payments
//   friend-view      view-only twin of friend; detects and decrypts them
//   journalist       receives donations
//   journalist-view  view-only twin of journalist; the key the fund publishes
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./config.mjs";
import { ZingoSession } from "./session.mjs";
import { parseBalance, parseError, parseHeight, parseTxids, parseValueTransfers } from "./parse.mjs";

const dir = (name) => join(config.walletDir, name);
const s = {
  learner: new ZingoSession("learner", dir("learner")),
  friend: new ZingoSession("friend", dir("friend")),
  friendView: new ZingoSession("friend-view", dir("friend-view")),
  journalist: new ZingoSession("journalist", dir("journalist")),
  journalistView: new ZingoSession("journalist-view", dir("journalist-view")),
};

export const addresses = {};
export let journalistViewKey = "";
let chainHeight = null;
let learnerBalance = null;

// txid -> { watcher, sentAt, seenAt, confirmedAt, height }
const tracked = new Map();

export async function startWallets() {
  await Promise.all(Object.values(s).map((x) => x.start()));
  for (const [key, name] of [["learner", "learner"], ["friend", "friend"], ["journalist", "journalist"]]) {
    addresses[key] = (await s[name].run("addresses")).match(/"encoded_address": "([^"]+)"/)?.[1];
  }
  addresses.learnerTransparent = (await s.learner.run("t_addresses")).match(/"encoded_address": "([^"]+)"/)?.[1];
  journalistViewKey = (await readFile(join(config.walletDir, "journalist.ufvk"), "utf8")).trim();
  // Testnet demo choice: let the learner wallet spend notes (and shield
  // coins) after 1 confirmation instead of zingo's default 3, so each lesson
  // fits in about two minutes and change notes recycle faster.
  await s.learner.run("settings min_confirmations 1");
  for (const x of Object.values(s)) await x.run("sync run");
  setInterval(pollTracked, config.pollMs);
  const refreshBalance = async () => {
    try {
      await s.learner.run("sync run");
      const b = parseBalance(await s.learner.run("balance"));
      learnerBalance = {
        shieldedSpendable: (b.confirmed_ironwood_balance ?? 0) + (b.confirmed_orchard_balance ?? 0) + (b.confirmed_sapling_balance ?? 0),
        unconfirmed: (b.unconfirmed_ironwood_balance ?? 0) + (b.unconfirmed_orchard_balance ?? 0),
        transparent: b.total_transparent_balance ?? 0,
      };
    } catch (e) { console.error("[balance]", e.message); }
  };
  refreshBalance();
  setInterval(refreshBalance, 30_000);
  setInterval(() => sweep().catch((e) => console.error("[sweep]", e.message)), config.sweepEveryMs);
  console.log("[wallets] ready", addresses);
}

export function status() {
  return { ready: Object.values(s).every((x) => x.ready), height: chainHeight, learnerBalance };
}

// ---------- sending ----------

/** Make a memo safe to pass on the zingo-cli command line. */
export function cleanMemo(memo) {
  let m = String(memo ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/"/g, "”").replace(/'/g, "’").replace(/\\/g, "/")
    .trim();
  while (Buffer.byteLength(m) > config.memoMaxBytes) m = m.slice(0, -1);
  return m;
}

async function send(watcher, address, zats, memo) {
  const cmd = memo ? `quicksend ${address} ${zats} "${memo}"` : `quicksend ${address} ${zats}`;
  const out = await s.learner.run(cmd, 120_000);
  let txid;
  try {
    txid = parseTxids(out);
  } catch (e) {
    // A send that was built but not accepted keeps its note locked; release it.
    const stuck = out.match(/[0-9a-f]{64}/)?.[0];
    if (stuck) await s.learner.run(`remove_transaction ${stuck}`).catch(() => {});
    throw e;
  }
  tracked.set(txid, { watcher, sentAt: Date.now(), seenAt: null, confirmedAt: null, height: null });
  return txid;
}

export const payFriend = (memo, to = addresses.friend) => send("friendView", to, config.amounts.friend, cleanMemo(memo));
export const donate = (zats, memo) => send("journalistView", addresses.journalist, zats, cleanMemo(memo));
export const withdrawToTransparent = () =>
  send("learner", addresses.learnerTransparent, config.amounts.withdraw);

/**
 * Shield every confirmed transparent coin in the learner wallet. If another
 * learner's shield already swept this learner's coin, return that shield.
 */
let lastShield = null;
export async function shield(depositTxid) {
  const dep = tracked.get(depositTxid);
  const bal = parseBalance(await s.learner.run("balance"));
  if ((bal.confirmed_transparent_balance ?? 0) === 0 && lastShield && dep?.confirmedAt && lastShield.at >= dep.confirmedAt) {
    return { txid: lastShield.txid, shared: true };
  }
  const txid = parseTxids(await s.learner.run("quickshield", 120_000));
  lastShield = { txid, at: Date.now() };
  tracked.set(txid, { watcher: "learner", sentAt: Date.now(), seenAt: null, confirmedAt: null, height: null });
  return { txid, shared: false };
}

/** A view-only wallet has no spending key; ask it to spend and report the error. */
export async function trySpendWithViewKey() {
  const out = await s.journalistView.run(`quicksend ${addresses.learner} 10000`, 60_000);
  return parseError(out) ?? out.split("\n").slice(-3).join(" ");
}

// ---------- watching ----------

export function txState(txid) {
  const t = tracked.get(txid);
  if (!t) return null;
  const secs = (at) => (at ? Math.round((at - t.sentAt) / 1000) : null);
  return {
    txid,
    state: t.confirmedAt ? "confirmed" : t.seenAt ? "seen" : "sent",
    seenAfter: secs(t.seenAt),
    confirmedAfter: secs(t.confirmedAt),
    height: t.height,
    memo: t.memo ?? null,
    value: t.value ?? null,
  };
}

let polling = false;
async function pollTracked() {
  if (polling) return;
  polling = true;
  try {
    const pending = [...tracked.values()].filter((t) => !t.confirmedAt);
    const watchers = new Set(pending.map((t) => t.watcher));
    for (const w of watchers) {
      await s[w].run("sync run");
      const transfers = parseValueTransfers(await s[w].run("value_transfers", 30_000));
      const now = Date.now();
      for (const vt of transfers) {
        const t = tracked.get(vt.txid);
        if (!t || t.watcher !== w) continue;
        // The receiving wallet sees the payment once it reaches the mempool.
        if (!t.seenAt && ["mempool", "confirmed"].includes(vt.status)) t.seenAt = now;
        if (!t.confirmedAt && vt.status === "confirmed") { t.confirmedAt = now; t.height = vt.blockheight; }
        if (vt.kind === "received" || w !== "learner") {
          if (vt.memos.length) t.memo = vt.memos.join("");
          if (vt.value) t.value = vt.value;
        }
      }
    }
    chainHeight = parseHeight(await s.learner.run("height")) ?? chainHeight;
    // Forget old entries so memory stays bounded.
    for (const [id, t] of tracked) if (Date.now() - t.sentAt > 6 * 3600_000) tracked.delete(id);
  } catch (e) {
    console.error("[poll]", e.message);
  } finally {
    polling = false;
  }
}

// ---------- incoming payments from learners' own wallets ----------

const transferCache = new Map(); // session key -> { at, list }
async function transfers(key, maxAgeMs = 5000) {
  const hit = transferCache.get(key);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.list;
  await s[key].run("sync run");
  const list = parseValueTransfers(await s[key].run("value_transfers", 30_000));
  transferCache.set(key, { at: Date.now(), list });
  return list;
}

/** Find a received payment whose memo carries the learner's one-time code. */
export async function findIncoming(wallet, code) {
  const key = { friend: "friendView", journalist: "journalistView" }[wallet];
  if (!key) return { found: false };
  const vt = (await transfers(key)).find((x) => x.kind === "received" && x.memos.join("").includes(`[${code}]`));
  return vt ? { found: true, txid: vt.txid, status: vt.status, value: vt.value, memo: vt.memos.join("") } : { found: false };
}

// ---------- the published fund ----------

export async function fund() {
  const all = await transfers("journalistView", 10_000);
  const donations = all
    .filter((vt) => vt.kind === "received")
    .map(({ txid, value, memos, status, datetime, blockheight }) => ({
      txid, value, memo: memos.join(""), status, datetime, blockheight,
    }))
    // Newest first; unconfirmed donations have no height yet.
    .sort((a, b) => (b.blockheight || Infinity) - (a.blockheight || Infinity));
  return {
    totalRaised: donations.reduce((a, d) => a + d.value, 0),
    count: donations.length,
    donations: donations.slice(0, 25),
  };
}

// ---------- recycling ----------

/**
 * Return the friend's and journalist's funds to the learner wallet so the
 * testnet coins recycle. The journalist keeps a small float: a view-only
 * wallet only reports "No spend capability" when there is something to spend.
 */
const JOURNALIST_FLOAT = 300_000;
const SWEEP_FEE_ALLOWANCE = 20_000;
export async function sweep() {
  for (const [name, keep] of [["friend", 0], ["journalist", JOURNALIST_FLOAT]]) {
    const out = await s[name].run("spendable_balance");
    const spendable = Number(out.match(/(\d+)/)?.[1] ?? 0);
    const amount = spendable - keep - SWEEP_FEE_ALLOWANCE;
    if (amount < 100_000) continue;
    const txid = parseTxids(await s[name].run(`quicksend ${addresses.learner} ${amount} "sweep"`, 120_000));
    console.log(`[sweep] ${name} -> learner ${amount} zats ${txid}`);
  }
}

export function stopWallets() {
  for (const x of Object.values(s)) x.stop();
}
