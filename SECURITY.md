# Security

Report vulnerabilities privately to the repository owner through an approved private channel. Keep credentials, live Discord identifiers, and inventory files out of public issues and pull requests.

## Credentials and logs

Supply the existing Discord bot token in a private local `.env` or host environment. Keep the file readable only by the operator and exclude it from build contexts and backups shared outside the project. Configuration errors name invalid variables. Discord failures log a reason or HTTP status. Raw Discord error objects, HTTP request headers, and debug payloads can contain credentials and must stay out of logs.

If a token is exposed, notify the owner and coordinate rotation on the existing Discord application. Review logs and Git history for copies.

## Discord operations

The gateway uses only the `Guilds` intent. The inventory makes GET requests, scopes reads to one configured guild, and writes local files with restricted permissions. Inventory files can reveal private channel names and role structure. Keep them private and remove them when the audit is complete.

The role policy defaults to disabled writes, requires explicit RP role IDs, and gives configured staff protection precedence. The code contains no Discord write operations. See [Discord integration](docs/DISCORD_INTEGRATION.md) for details.
