// What a public block explorer can see about a transaction.
//
// Learners follow links to zexplorer.app (the explorer the hackathon
// recommends). For the in-page "what the explorer sees" panel we read
// CipherScan's public testnet API from the backend, so the learner's browser
// never contacts a third party unless they click a link.
const API = process.env.EXPLORER_API ?? "https://api.testnet.cipherscan.app/api";
export const EXPLORER_TX_URL = "https://zexplorer.app/testnet/tx/{txid}";

const cache = new Map(); // txid -> { at, data }

export async function explorerView(txid) {
  const hit = cache.get(txid);
  if (hit && Date.now() - hit.at < 15_000) return hit.data;
  const get = async (path) => {
    const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(10_000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`explorer ${res.status}`);
    return res.json();
  };
  const [tx, raw] = await Promise.all([get(`/tx/${txid}`), get(`/tx/${txid}/raw`)]);
  const data = tx
    ? {
        found: true,
        blockHeight: tx.blockHeight ? Number(tx.blockHeight) : null,
        confirmations: tx.confirmations ?? 0,
        feeZat: Number(tx.feeZat ?? 0),
        size: tx.size ?? null,
        version: tx.version ?? null,
        ironwoodActions: tx.ironwoodActions ?? 0,
        orchardActions: tx.orchardActions ?? 0,
        saplingOutputs: tx.saplingOutputCount ?? 0,
        transparentInputs: (tx.inputs ?? []).map(publicIo),
        transparentOutputs: (tx.outputs ?? []).map(publicIo),
        valueBalanceIronwoodZat: Number(tx.valueBalanceIronwoodZat ?? 0),
        // A slice of the raw bytes, to show that shielded data is unreadable.
        hexSample: raw?.hex ? raw.hex.slice(400, 400 + 384) : null,
        url: EXPLORER_TX_URL.replace("{txid}", txid),
      }
    : { found: false, url: EXPLORER_TX_URL.replace("{txid}", txid) };
  cache.set(txid, { at: Date.now(), data });
  return data;
}

function publicIo(io) {
  return {
    address: io.address ?? io.addresses?.[0] ?? io.scriptPubKey?.addresses?.[0] ?? null,
    valueZat: Number(io.valueZat ?? io.valueSat ?? (io.value != null ? Math.round(io.value * 1e8) : 0)),
  };
}
