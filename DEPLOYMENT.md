# Cloudflare deployment

This repository should use **one** deployment pipeline: Cloudflare Workers Builds.
Do not also run the old GitHub Actions deploy workflow, because that creates a
second build/deploy path and can race with Cloudflare Worker versions and secrets.

## Cloudflare Workers Builds settings

In Cloudflare, open the `buubo` Worker, then go to **Settings → Build** and set:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run opennext:build` |
| Deploy command | `npm run cf:deploy` |
| Non-production branch deploy command | `npm run upload` |

Why the split matters:

- `npm run opennext:build` creates the `.open-next` build output.
- `npm run cf:deploy` deploys the already-built OpenNext output without rebuilding.
- `npm run upload` builds and uploads preview Worker versions for non-production branches.

Do **not** leave the Cloudflare deploy command as the default `npx wrangler deploy`.
Wrangler detects `open-next.config.ts` and delegates directly to
`opennextjs-cloudflare deploy`, which expects `.open-next` to already exist. If no
build command ran first, Cloudflare fails with:

```text
ERROR Could not find compiled Open Next config, did you run the build command?
```

## Runtime secrets

Set `DATABASE_URL` as a runtime secret in the Cloudflare Worker dashboard:

**Settings → Variables & Secrets → Add secret → `DATABASE_URL`**

The Wrangler config uses `keep_vars: true`, and the deploy/upload scripts pass
`--keep-vars`, so Cloudflare-managed runtime secrets are preserved during deploys.
Do not run `wrangler secret put DATABASE_URL` in a separate GitHub Actions deploy
job while Workers Builds is also deploying; Worker versions can reject secret edits
when the latest uploaded version has not been deployed yet.
