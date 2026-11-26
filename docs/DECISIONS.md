# Decisions

## HU-008 | TypeScript and bot name

Harvard University is the bot's current name. The migration retires the old Python package and Compose service name while carrying over the existing Discord application identity, invitation, and token.

The Python baseline at `634e820c4b6aa3acf19430acf295be12dca485b1` loaded `.env`, required and trimmed `DISCORD_TOKEN`, connected with only guilds enabled, and printed the bot identity on readiness. Its commands package was empty. Docker Compose started one non-root Python service using `.env`. There were no tests, CI, inventory, or restart policy.

The replacement retains dotenv loading, token validation, guild-only gateway intents, and an identity log on readiness. It adds the application/guild IDs, configuration validation, signal handling, safe logs, read-only inventory, and a pure future role policy.

## Tooling

Use Node.js 24 LTS, ESM, strict TypeScript, Discord.js, and Zod. Keep the pnpm 10, ESLint, Vitest, and Prettier conventions from hu-api. TypeScript 6 stays within the supported range of the pinned typescript-eslint release. Direct dependencies and the package manager are pinned and the lockfile is frozen in CI and container builds.

Maintain a separate Docker build check and run the resulting image without network access for its configuration smoke test. Keep role calculations independent of Discord objects and defer the HTTPS client until hu-api defines its bot contract.
