# Submission evidence

Everything here is on the **public Zcash testnet** (`testnet.zec.rocks:443`). It contains viewing keys only. No seed phrases or spending keys appear in this repository.

## Core flow: Pay a friend privately (lesson 2)

Sent through the app's API on 4 Nov 2026 at 19:51 IST, before the first browser test. A learner types a memo and taps one button. The backend's custodial learner wallet sends a shielded payment with that memo to the demo "friend" wallet. The friend's view-only wallet detects and decrypts it.

| | |
|---|---|
| Testnet txid | `e3d7a1be977345372a9a2de427451df8e3cf1c2362a49d97f42b316e6dbb84c8` |
| Explorer | https://testnet.zcashexplorer.app/transactions/e3d7a1be977345372a9a2de427451df8e3cf1c2362a49d97f42b316e6dbb84c8 (also [Zexplorer](https://zexplorer.app/testnet/tx/e3d7a1be977345372a9a2de427451df8e3cf1c2362a49d97f42b316e6dbb84c8); its index missed some of our transactions) |
| From | learner wallet, `utest1jrtdfnsedfrykawwmyhughdn0sqxancftlmaqlvj8nxcf6gszufqtalu39qzl26haep240h4fv0tljqw8h4mch7gwhyqraerwcrtlgeh` |
| To | friend wallet, `utest15d60usk9h23jpddnnh9dhvtgujxqq022kld6mggdjq0r7u5phnhdqgh4q2e60qtuyela4kvep6qstg57px7kucufa69gfjsqacj4yy9j` |
| Amount | 0.0005 TAZ |
| Memo | `Thanks for lunch! (Zec Start test)` |
| Seen by the receiving wallet | 2 s after sending |
| Confirmed | 17 s after sending (block 4582305) |

## Viewing key of the receiving demo wallet (friend)

This is a **viewing key**: it reveals the friend wallet's whole history (amounts and memos), but it cannot spend.

- Unified full viewing key: `uviewtest1qq0s4kq9l0eu7dh3p7qeka73w4emh7w7x3qnrsd6w392pp958r8xqvxcp8vt3f08030z9vvu69sjqesltf4dhftfnmn5m9pk6dkpy47aztma0k4za965dg6zkmrcu4t8x5f5k343rls8fuzcxg0je077l5vyd59g7w7fn30fsumxp4rl5htn27zm9z7lf2qmw79ssadpp0yhu79m6qvn2cxa44aasgptrpxanmm775gz3zqumksqlz4rwxja4q4089ratjcgdrrxducjxlqvlx4khxram9xjczxtnzfqljhee4wgr9l4fk80wcs7pftgwmmppej4tf9s369tzthsacn8rnn2hj7u0zqqrr5jtt8ldfzydrxu303vha8ru0dg78u6xzdfufy5z6kwts5xv3g35ghuf638vn7uaxqjuu3mwsa0ct3m0lef9cyfqd0k8cg9lvt5qve0gptnwhw6e8wf9akz9pzysgywhf5gywj0ayp5vvpaznu2`
- Birth height: `4582081`

To check the amount and memo yourself with zingo-cli:

```sh
zingo-cli --chain testnet --server https://testnet.zec.rocks:443 --data-dir ./friend-view \
  --viewkey "<the uviewtest… key above>" --birthday 4582081 value_transfers
```

## Other lessons

| Lesson | Testnet txid |
|---|---|
| 1. Shield your coins: public withdrawal (to `tmVggC6emwEjTY9k4PG9Yt7DJLpLByhUmd5`) | `d49a4cd3561049690e1da584f8178104c52f5c9245c1e445a49905d7a7f06137` |
| 1. Shield your coins: shielding transaction | `ab90d6296158aac7e4dc836e75df247632fd7e0b7a921a534e83fd850d0287ea` |
| 3. Donate privately | `54ee1bb891d396d297944e672f05b9e5e80ece9cd0ca1ae27b5d2e13c111fb49` |
| 4. Verify the fund | The fund's published viewing key is shown in the app (`GET /zcash/api/fund`). The view-only wallet's real reply to a spend attempt: `Failed to construct sending transaction. No unified spending key found for this account. No spend capability` |

## Deployed app (Railway backend, Cloudflare frontend)

Run through the deployed frontend code against `https://zecstart-production.up.railway.app` on 4 Nov 2026, 21:45–21:50 IST. The deployed backend created its own fresh demo wallets on first boot, so its friend wallet differs from the one above. Its viewing key stays on the server.

| Lesson | Testnet txid |
|---|---|
| 2. Pay a friend privately (core flow) | [`8d1b41e008cd6c53ea592936430e235e1c1a3650c8f98fc79d71fa5dba607dc2`](https://zexplorer.app/testnet/tx/8d1b41e008cd6c53ea592936430e235e1c1a3650c8f98fc79d71fa5dba607dc2), decrypted by the friend's view-only wallet 4 s after sending |
| 1. Public withdrawal | [`e53c3b63a58c6ce0fc507174f348a31cbaa71058496742ef91ace74e20142097`](https://zexplorer.app/testnet/tx/e53c3b63a58c6ce0fc507174f348a31cbaa71058496742ef91ace74e20142097) |
| 1. Shielding transaction | [`a5b0541c0d38035897af12bc371497a35eef22c90e52491af6fea17c60ba591e`](https://zexplorer.app/testnet/tx/a5b0541c0d38035897af12bc371497a35eef22c90e52491af6fea17c60ba591e) |
| 3. Donate privately | [`2fa6b26f446e04f3cacfaedb00ab476662130feff03a85602f5a4ff2d9a34e0b`](https://zexplorer.app/testnet/tx/2fa6b26f446e04f3cacfaedb00ab476662130feff03a85602f5a4ff2d9a34e0b) |
| 4. Verify the fund | Spend attempt with the fund's viewing key: `No unified spending key found for this account. No spend capability` |

