# Harvard University

Discord bot for the independent Harvard University RP project.

## Development

Use Node.js 24 LTS (see [.node-version](.node-version)) and the pnpm version pinned in [package.json](package.json).

```sh
corepack enable
pnpm install --frozen-lockfile --ignore-scripts
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Tests use simulated Discord data and require no credentials. To validate a local `.env` without connecting to Discord, copy [.env.example](.env.example), fill in the variables, then run:

```sh
pnpm start --check-config
```

`pnpm dev` and `pnpm start` connect to Discord with the configured token. Use them only in an authorized environment. The inventory has a separate [read-only command](docs/DISCORD_INTEGRATION.md#inventory).

- [Architecture](docs/ARCHITECTURE.md)
- [Discord integration and inventory](docs/DISCORD_INTEGRATION.md)
- [Deployment and Python migration](docs/DEPLOYMENT.md)
- [Decisions](docs/DECISIONS.md)
- [Security](SECURITY.md)
