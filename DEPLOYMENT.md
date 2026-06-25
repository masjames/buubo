# Cloudflare deployment

This repository uses **Cloudflare Workers Builds** as the deployment pipeline.
Do not also run a GitHub Actions deploy workflow, because that creates a second
build/deploy path and can race with Cloudflare Worker versions and secrets.

## Cloudflare Workers Builds settings

In Cloudflare, open the `buubo` Worker, then go to **Settings → Build** and set:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Deploy command | `npx wrangler deploy` |

Cloudflare's default deploy command is intentionally supported. During `npm
clean-install`, the repository installs a small local Wrangler shim in
`node_modules/.bin/wrangler`. When Cloudflare later runs `npx wrangler deploy`,
the shim checks for `.open-next` output and runs `npm run opennext:build` first
if the output is missing. That prevents Wrangler's OpenNext delegation from
failing with:

```text
ERROR Could not find compiled Open Next config, did you run the build command?
```

For local/manual deployment, use:

```bash
npm run deploy
```

## Runtime secrets

Set `DATABASE_URL` as a runtime secret in the Cloudflare Worker dashboard:

**Settings → Variables & Secrets → Add secret → `DATABASE_URL`**

The Wrangler config uses `keep_vars: true`, and the deploy/upload scripts pass
`--keep-vars`, so Cloudflare-managed runtime secrets are preserved during deploys.
Do not run `wrangler secret put DATABASE_URL` in a separate GitHub Actions deploy
job while Workers Builds is also deploying; Worker versions can reject secret edits
when the latest uploaded version has not been deployed yet.
