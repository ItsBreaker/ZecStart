// Split the learner wallet's balance into many notes. Run with the API
// stopped (it opens the wallet directly); on a deployed backend use
// POST /zcash/api/admin/split instead, which pauses the session for you.
//
//   node scripts/split-notes.mjs [count]
import { splitLearnerNotes } from "../src/split.mjs";

const r = await splitLearnerNotes(Number(process.argv[2] ?? 30));
console.log(`split ${r.spendable} zats into ${r.count} notes of ${r.each} zats: txid ${r.txid}`);
