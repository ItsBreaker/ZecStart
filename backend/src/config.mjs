// All settings come from environment variables so the service can move from
// a laptop to a Linux server unchanged. See backend/.env.example.
import { homedir } from "node:os";
import { resolve } from "node:path";

const env = process.env;
const here = new URL("..", import.meta.url).pathname;
const list = (v) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export const config = {
  port: Number(env.PORT ?? 8787),
  host: env.HOST ?? "127.0.0.1",
  // Path prefix the API is served under (the tunnel may route /zcash/api/*).
  apiBase: (env.API_BASE ?? "/zcash/api").replace(/\/$/, ""),
  // Exact origins only (no wildcards).
  allowedOrigins: list(env.ALLOWED_ORIGINS ?? "http://localhost:8080"),
  // Which proxy header to trust for the visitor's IP (used only for rate
  // limits): "cloudflare" (CF-Connecting-IP), "railway" (the last
  // X-Forwarded-For entry, added by Railway's edge), or unset (the socket).
  trustProxy: ["cloudflare", "railway"].includes(env.TRUST_PROXY) ? env.TRUST_PROXY : null,
  // Bearer token for operator-only routes (note splitting). Unset = disabled.
  adminToken: env.ADMIN_TOKEN && env.ADMIN_TOKEN.length >= 24 ? env.ADMIN_TOKEN : null,

  zingoBin: env.ZINGO_BIN ?? resolve(homedir(), "Desktop/projects/zcash/scratch/target-ntm/release/zingo-cli"),
  python: env.PYTHON ?? "python3",
  chain: "testnet",
  indexer: env.INDEXER ?? "https://testnet.zec.rocks:443",
  walletDir: env.WALLET_DIR ?? resolve(here, "wallets"),

  // Fixed amounts in zatoshis (1 TAZ = 100,000,000 zats). Learners never pick
  // arbitrary amounts, which caps what any one visitor can move.
  amounts: {
    withdraw: 100_000,   // activity 1: "exchange withdrawal" to a transparent address
    friend: 50_000,      // activity 2
    donate: [20_000, 50_000, 100_000], // activity 3 choices
  },
  memoMaxBytes: 200,

  // Rate limits: on-chain actions per window.
  limits: {
    windowMs: 60 * 60 * 1000,
    perSession: 12,
    perIp: 40,
  },
  sweepEveryMs: Number(env.SWEEP_MINUTES ?? 15) * 60 * 1000,
  pollMs: 3000,
};
