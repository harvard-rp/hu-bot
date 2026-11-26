# Architecture

| Path                             | Responsibility                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/index.ts`                   | Selects gateway, read-only inventory, or offline configuration validation and handles process signals.       |
| `src/config.ts`                  | Validates environment variables with Zod and exposes typed configuration.                                    |
| `src/logger.ts`, `src/errors.ts` | Structured logs, credential redaction, and safe failure reports.                                             |
| `src/discord/`                   | Discord.js client and REST setup, application identity check, event binding, command dispatch, and shutdown. |
| `src/services/role-policy.ts`    | Pure role hierarchy and authorization rules over plain objects.                                              |
| `src/inventory/`                 | REST reads, permission projections, and a private local JSON report.                                         |
| `tests/`                         | Vitest checks with simulated events, REST responses, and lifecycle fixtures.                                 |

The gateway and inventory modes check the application ID against the authenticated application. Gateway mode reports readiness and binds an empty command registry. The command dispatcher receives only a plain command name and guild ID. The inventory uses Discord REST independently of the gateway.

## Future hu-api boundary

Connect to hu-api over HTTPS once its contract and authentication are decided. hu-api owns business decisions and data access. The bot will consume approved outcomes and apply separately authorized Discord actions. Supabase access stays behind hu-api.

hu-api will own the five base character slots and the cumulative extra slot per confirmed active boost. Staff maintain the individual boost count, assign Houses, and review character sheets in the Digital Campus. Existing characters are preserved when boost entitlement changes. The limit is two clubs per character. HU-008 defines no synchronization jobs or domain enforcement for these rules.
