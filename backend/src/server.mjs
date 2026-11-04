// Shielded 101 wallet backend: a small JSON API over custodial testnet
// wallets. No accounts and no database; state lives in memory.
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.mjs";
import { allowAction } from "./limits.mjs";
import * as w from "./wallets.mjs";
import { explorerView } from "./explorer.mjs";

const routes = {
  "GET /health": async () => ({ ok: true, ...w.status() }),

  "GET /info": async () => ({
    network: "testnet",
    addresses: {
      friend: w.addresses.friend,
      journalist: w.addresses.journalist,
      learnerTransparent: w.addresses.learnerTransparent,
    },
    amounts: config.amounts,
    memoMaxBytes: config.memoMaxBytes,
  }),

  // Activity 1: "withdraw from an exchange" to a transparent address, then shield.
  "POST /withdraw": onchain(async () => ({ txid: await w.withdrawToTransparent() })),
  "POST /shield": onchain(async (body) => w.shield(hex64(body.depositTxid))),

  // Activity 2: a shielded payment with a memo.
  "POST /pay-friend": onchain(async (body) => ({ txid: await w.payFriend(body.memo) })),

  // Activity 3: a private donation.
  "POST /donate": onchain(async (body) => {
    const zats = Number(body.zats);
    if (!config.amounts.donate.includes(zats)) throw userError("Pick one of the listed amounts.");
    return { txid: await w.donate(zats, body.memo) };
  }),

  // Activity 4: the fund's published viewing key and what it reveals.
  "GET /fund": async () => ({ viewingKey: w.journalistViewKey, ...(await w.fund()) }),
  "POST /fund/try-spend": onchain(async () => w.trySpendWithViewKey()),

  // What anyone can see on a public explorer, fetched server-side.
  "GET /explorer": async (_body, url) => explorerView(hex64(url.searchParams.get("txid"))),

  // Payments learners send from their own wallets, matched by a memo code.
  "GET /incoming": async (_body, url) => {
    const code = url.searchParams.get("code") ?? "";
    if (!/^s101-[a-z0-9]{4,10}$/.test(code)) throw userError("Invalid code.");
    return w.findIncoming(url.searchParams.get("wallet"), code);
  },

  // Operator only: split the learner wallet's balance into notes after funding.
  "POST /admin/split": async (body, _url, req) => {
    if (!isAdmin(req)) throw userError("Not found.", 404);
    const count = Math.min(60, Math.max(5, Number(body.count) || 30));
    return w.splitNotes(count);
  },

  "GET /tx": async (_body, url) => {
    const t = w.txState(hex64(url.searchParams.get("txid")));
    if (!t) throw userError("We are not tracking that transaction.", 404);
    return t;
  },
};

/** Wrap a handler that moves testnet funds: rate-limited per IP and session. */
function onchain(fn) {
  return async (body, url, req) => {
    if (!w.status().ready) throw userError("The testnet wallets are still starting. Try again in a minute.", 503);
    if (!allowAction(clientIp(req), req.headers["x-learner-session"])) {
      throw userError("You've done a lot of transactions in a short time. Please wait a few minutes and try again.", 429);
    }
    return fn(body, url, req);
  };
}

function hex64(v) {
  if (!/^[0-9a-f]{64}$/.test(String(v ?? ""))) throw userError("That doesn't look like a transaction id.");
  return v;
}

function userError(message, status = 400) {
  return Object.assign(new Error(message), { status, friendly: true });
}

function clientIp(req) {
  if (config.trustProxy === "cloudflare" && req.headers["cf-connecting-ip"]) return req.headers["cf-connecting-ip"];
  if (config.trustProxy === "railway" && req.headers["x-forwarded-for"]) {
    // The edge appends the address it saw; earlier entries are client-supplied.
    return req.headers["x-forwarded-for"].split(",").pop().trim();
  }
  return req.socket.remoteAddress;
}

function isAdmin(req) {
  if (!config.adminToken) return false;
  const given = Buffer.from(String(req.headers.authorization ?? ""));
  const want = Buffer.from(`Bearer ${config.adminToken}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Learner-Session");
  }
}

async function readBody(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 4096) throw userError("Request too large.", 413);
  }
  if (!data) return {};
  try { return JSON.parse(data); } catch { throw userError("Invalid JSON."); }
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.writeHead(204).end();

  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.startsWith(config.apiBase) ? url.pathname.slice(config.apiBase.length) : null;
  const handler = path !== null && routes[`${req.method} ${path}`];
  if (!handler) return res.writeHead(404).end(JSON.stringify({ error: "Not found." }));

  try {
    const body = req.method === "POST" ? await readBody(req) : {};
    const result = await handler(body, url, req);
    res.writeHead(200).end(JSON.stringify(result));
  } catch (e) {
    if (!e.friendly) console.error(`[${req.method} ${path}]`, e.message);
    let message = e.friendly ? e.message : "The testnet didn't respond as expected. Please try again.";
    // Every spare coin is waiting for a confirmation; one frees up each block.
    if (/insufficient balance/i.test(e.message) && path !== "/fund/try-spend") {
      message = "Lots of learners right now: our practice wallet's coins are all in flight. Please retry in about 30 seconds.";
      e.status = 503;
    }
    res.writeHead(e.status ?? 502).end(JSON.stringify({ error: message }));
  }
});

server.listen(config.port, config.host, () => {
  const host = config.host.includes(":") ? `[${config.host}]` : config.host;
  console.log(`[api] listening on http://${host}:${config.port}${config.apiBase}`);
});

// Keep answering HTTP even if the wallets can't start, so /health can say
// why; retry once a minute.
async function startWalletsWithRetry() {
  try {
    await w.startWallets();
  } catch (e) {
    console.error("[wallets] failed to start:", e.message);
    w.setStartError(e.message);
    await w.stopWallets().catch(() => {});
    setTimeout(startWalletsWithRetry, 60_000);
  }
}
startWalletsWithRetry();

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    w.stopWallets().then(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000);
  });
}
