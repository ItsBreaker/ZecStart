// The course, in order. Each lesson module exports render(root, ctx).
export const lessons = [
  { id: "shield", n: 1, title: "Shield your coins", blurb: "Move public coins into the shielded pool.", load: () => import("./lessons/shield.mjs") },
  { id: "friend", n: 2, title: "Pay a friend privately", blurb: "Send a private payment with a secret message.", load: () => import("./lessons/friend.mjs") },
  { id: "donate", n: 3, title: "Donate privately", blurb: "Give to a cause without revealing who you are.", load: () => import("./lessons/donate.mjs") },
  { id: "verify", n: 4, title: "Verify the fund", blurb: "Use a viewing key to audit, without the power to spend.", load: () => import("./lessons/verify.mjs") },
  { id: "certificate", n: 5, title: "Your certificate", blurb: "Collect your Zec Start badge.", load: () => import("./lessons/certificate.mjs") },
];
