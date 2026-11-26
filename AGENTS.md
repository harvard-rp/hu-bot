# Working on hu-bot

- Use English for code and technical documentation.
- Use Node.js 24 and the pnpm version in `package.json`. Pin direct dependencies and commit lockfile changes.
- Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before handing off.
- Keep tests offline with simulated Discord responses and events. Use real Discord credentials or servers only within separately authorized work.
- Keep Discord adapters thin and place policy in `src/services/`. Character and boost rules belong to hu-api. Any future hu-api integration must use HTTPS.
- Keep Discord actions within the configured guild. Use minimum gateway intents, protect staff roles, and default Discord writes to disabled.
- Keep `.env`, real identifiers, tokens, and inventory output out of commits and CI logs. See [SECURITY.md](SECURITY.md).
- Open mission PRs against `main`. Leave merging to the project owner after review.
