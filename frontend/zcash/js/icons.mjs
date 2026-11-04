// Inline SVG icons (no image requests). Each returns a fresh element.

const svg = (markup, cls) => {
  const span = document.createElement("span");
  span.className = `icon ${cls}`;
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = markup;
  return span;
};

/** A ZEC coin: the Zcash "Z" mark on a gold disc. */
export const zecCoin = (cls = "") => svg(
  '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#F4B728"/><circle cx="32" cy="32" r="30" fill="none" stroke="#d99c12" stroke-width="3"/>' +
  '<path d="M29 11h6v6h10v6.5L29.5 41H45v6H35v6h-6v-6H19v-6.5L34.5 23H19v-6h10z" fill="#231f20"/></svg>', `zec ${cls}`);

/** A wallet. */
export const walletIcon = (cls = "") => svg(
  '<svg viewBox="0 0 64 64"><path d="M14 18 44 8l4 10z" fill="#7b2fd6"/><rect x="6" y="17" width="52" height="38" rx="8" fill="#5e00b2"/>' +
  '<rect x="38" y="29" width="20" height="14" rx="5" fill="#c084fc"/><circle cx="46" cy="36" r="3" fill="#fff"/></svg>', `wallet ${cls}`);

/** A bank / exchange building. */
export const exchangeIcon = (cls = "") => svg(
  '<svg viewBox="0 0 64 64"><path d="M32 6 6 20v4h52v-4z" fill="#7b2fd6"/><rect x="10" y="26" width="6" height="22" rx="1" fill="#5e00b2"/>' +
  '<rect x="22" y="26" width="6" height="22" rx="1" fill="#5e00b2"/><rect x="36" y="26" width="6" height="22" rx="1" fill="#5e00b2"/>' +
  '<rect x="48" y="26" width="6" height="22" rx="1" fill="#5e00b2"/><rect x="6" y="50" width="52" height="7" rx="2" fill="#7b2fd6"/></svg>', `exchange ${cls}`);
