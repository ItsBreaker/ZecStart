// Deployment settings. Edit these (or overwrite this file at deploy time);
// nothing else in the app hard-codes a host or path.
window.ZECSTART_CONFIG = {
  // Where the wallet backend is reachable, including its path prefix.
  apiUrl: "https://zecstart-production.up.railway.app/zcash/api",
  // Public explorer used for every "verify it yourself" link.
  explorerTxUrl: "https://testnet.zcashexplorer.app/transactions/{txid}",
  explorerAddressUrl: "https://testnet.zcashexplorer.app/address/{address}",
};
