# Discord integration

Use the existing Harvard University Discord application, bot token, invitation, and role. `DISCORD_CLIENT_ID` is the application ID shown in the Developer Portal. `DISCORD_GUILD_ID` is the server ID. Startup checks the application identity before opening the gateway. Commands are limited to the configured guild and the registry is empty.

## Gateway intents

| Intent                                 | HU-008   | Reason                                                                                                                                                                                                                                                       |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Guilds`                               | Enabled  | Matches the Python listener's scope and provides guild availability on startup.                                                                                                                                                                              |
| `GuildMembers` (Server Members Intent) | Disabled | A future member or boost synchronizer may need updates for other guild members. Enable in code and the Developer Portal only after the exact events, data, and authorization are approved. The inventory reads only the bot's own guild member through REST. |
| `MessageContent`, `GuildPresences`     | Disabled | This foundation needs neither message content nor presence data.                                                                                                                                                                                             |

See the [Discord Gateway documentation](https://docs.discord.com/developers/events/gateway#privileged-intents).

## Existing permissions

The reported installation grants Manage Roles, View Channel, Send Messages, Embed Links, Attach Files, Read Message History, Add Reactions, Send Messages in Threads, and Manage Nicknames. HU-008 requires no Administrator permission. Effective access depends on role hierarchy and channel overrides. The inventory can measure those conditions once authorized.

## Inventory

For a separately authorized inventory, build the project, choose the intended guild in a private `.env`, and run `pnpm inventory`. The command writes `.discord-inventory/run-*/guild.json` and logs the file path. Each run uses a distinct private directory. On POSIX systems new directories are owner-only and the report file is created with mode `0600`.

The snapshot includes guild ID and name, the bot's guild role IDs and effective permissions, role identifiers and hierarchy, and guild channels with category links and the bot's effective permissions. It reads only the bot's own guild member and excludes member profiles, topics, overwrite targets, messages, and thread conversations. Discord's guild channels endpoint omits threads. Reports are point-in-time observations across several requests and cannot certify that an action will succeed later.

Permission calculation follows [Discord's permission precedence](https://docs.discord.com/developers/topics/permissions), including the `@everyone`, role, and bot-specific channel overwrites and documented implicit view, send, and voice-management restrictions. A role is technically manageable if it is strictly below the bot's highest role, is neither `@everyone` nor integration-managed, and the bot has guild-level Manage Roles. Technical manageability describes Discord's hierarchy, independent of project authorization.

## Future write policy

`DISCORD_WRITES_ENABLED` defaults to `false`. The pure policy additionally requires an explicit RP role ID and a populated staff protection list. A staff ID takes precedence over an RP allowlist entry. Keep the bot role below staff roles and above approved RP roles. Review both lists and re-check live hierarchy and target-member restrictions before implementing any future write path. The flag has no live write effect in HU-008.
