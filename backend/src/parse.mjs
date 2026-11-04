// Parsers for zingo-cli's text output.

/** `value_transfers` prints `{ key: value ... }` blocks, memos as "memo N: ...". */
export function parseValueTransfers(text) {
  const out = [];
  for (const block of text.split(/\n\}/)) {
    const txid = block.match(/txid: ([0-9a-f]{64})/)?.[1];
    if (!txid) continue;
    const field = (k) => block.match(new RegExp(`\\n\\s*${k}: ([^\\n]*)`))?.[1]?.trim();
    out.push({
      txid,
      status: field("status"),
      blockheight: Number(field("blockheight")) || null,
      datetime: field("datetime"),
      kind: field("kind"),
      value: Number(field("value")) || 0,
      fee: Number(field("transaction fee")) || 0,
      poolsReceived: field("pools_received") || "",
      memos: [...block.matchAll(/\n\s*memo \d+: ([^\n]*)/g)].map((m) => m[1]),
    });
  }
  return out;
}

/** `balance` prints `name: zats` lines. */
export function parseBalance(text) {
  const bal = {};
  for (const m of text.matchAll(/(\w+_balance): (\d+)/g)) bal[m[1]] = Number(m[2]);
  return bal;
}

/** quicksend / quickshield / confirm print JSON containing "txids". */
export function parseTxids(text) {
  const err = parseError(text);
  if (err) throw new Error(err);
  const ids = [...text.matchAll(/"txid": "([0-9a-f]{64})"/g)].map((m) => m[1]);
  const fromList = text.match(/"txids": \[\s*"([0-9a-f]{64})"/)?.[1];
  const txid = fromList ?? ids[0];
  if (!txid) throw new Error(`no txid in output: ${text.slice(0, 200)}`);
  return txid;
}

export function parseError(text) {
  // zingo-cli prints "Error: <summary>" followed by "caused by" lines.
  const at = text.search(/(?:^|\n)\s*Error\b/);
  if (at < 0) return null;
  return text.slice(at).replace(/^\s*Error:?\s*/, "").replace(/\s*\n\s*/g, " ").trim() || "zingo-cli error";
}

export function parseHeight(text) {
  const m = text.match(/(\d{6,})/);
  return m ? Number(m[1]) : null;
}
