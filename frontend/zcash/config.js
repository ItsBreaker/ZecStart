// Deployment settings. Edit these (or overwrite this file at deploy time);
// nothing else in the app hard-codes a host or path.
window.SHIELDED101_CONFIG = {
  // Where the wallet backend is reachable, including its path prefix.
  apiUrl: "http://localhost:8787/zcash/api",
  // Public explorer used for every "verify it yourself" link.
  explorerTxUrl: "https://zexplorer.app/testnet/tx/{txid}",
  explorerAddressUrl: "https://testnet.zcashexplorer.app/address/{address}",
};
