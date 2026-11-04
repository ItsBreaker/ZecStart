# Roadmap

General next steps for Zec Start.

## More activities

- **Unified addresses:** see how one address carries several receivers, and why wallets pick the most private one.
- **Diversified addresses:** give every contact a different address that all land in the same wallet.
- **Selective disclosure:** share proof of one payment with one person, without sharing a whole viewing key.
- **Moving between pools:** what is and isn't revealed when value crosses into or out of the shielded pool, and how timing and amounts can link transactions.
- **Bring your own wallet everywhere:** extend the Noir Wallet and ZIP-321 path from lessons 2 and 3 to every lesson, with guided setup.
- Translations and an accessibility review.

## A self-hosted backend

- Package the backend (Node, Python, zingo-cli, cloudflared) as a container image, so a school, meetup or community can run its own instance on a small Linux server.
- Health checks, automatic restart of wallet sessions, and alerts when the learner wallet runs low.
- Connect to the indexer over a mixnet or Tor so the operator's IP isn't exposed.
- Non-custodial modes: a browser-based light wallet, so learners hold their own keys from the first lesson.

## Privacy-preserving learner analytics

The app ships with an analytics interface (`frontend/zcash/js/analytics.mjs`) that currently does nothing. Any future implementation should:

- report only anonymous, aggregate counters (for example "finished step 2"), never identifiers, IPs, memos or txids;
- be off by default or clearly disclosed, and documented in PRIVACY.md;
- prefer techniques that add noise or aggregate on the device, so no individual learner's path can be reconstructed.
