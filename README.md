# VibeForge / Business Pulse

Cloud development copy prepared from the local `vibeforge-window-assistant` application on 2026-10-17.

## Development

Use Node.js 22 and pnpm 10.12.1.

```sh
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

The private client journal, credentials, local browser storage, operational logs and CEO diary are not included. The journal module retains its type contract but exports an empty array. Some historical tests may depend on excluded journal data; review those assumptions rather than restoring private records.

Production remains on its existing hosting. Publishing this repository does not deploy or migrate production data. Do not deploy this sanitized development snapshot over production without an explicit review and request.

Shared project context: https://github.com/tlrus/vibeforge-context (main). The four context documents were reconciled against commit `9645e05ab070e50f7186cd41cdedb9fdf317abfe` on 2026-10-17; consult current remote context before significant product work.
