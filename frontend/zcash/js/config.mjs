const c = window.SHIELDED101_CONFIG ?? {};
export const API_URL = (c.apiUrl ?? "/zcash/api").replace(/\/$/, "");
export const txUrl = (txid) => (c.explorerTxUrl ?? "").replace("{txid}", txid);
export const addressUrl = (a) => (c.explorerAddressUrl ?? "").replace("{address}", a);
