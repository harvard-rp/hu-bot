# Deployment and Python migration

## Configuration

Keep `.env` private and retain the existing `DISCORD_TOKEN`. The two IDs can be copied from the existing Discord application and server. Leave the permissions and Developer Portal settings in place.

| Variable                 | Purpose                                                 | Default                    |
| ------------------------ | ------------------------------------------------------- | -------------------------- |
| `DISCORD_TOKEN`          | Raw token for the existing bot.                         | Required                   |
| `DISCORD_CLIENT_ID`      | Existing Discord application ID.                        | Required, new since Python |
| `DISCORD_GUILD_ID`       | Target server ID.                                       | Required, new since Python |
| `LOG_LEVEL`              | `debug`, `info`, `warn`, or `error`.                    | `info`                     |
| `DISCORD_WRITES_ENABLED` | Future role policy switch.                              | `false`                    |
| `DISCORD_RP_ROLE_IDS`    | Comma-separated role IDs approved for future RP writes. | Empty                      |
| `DISCORD_STAFF_ROLE_IDS` | Comma-separated protected staff role IDs.               | Empty                      |

The local scripts load `.env` if present, with exported variables taking precedence. Compose injects environment variables from its `env_file`. The build takes no Discord variables. Keep hu-api settings for a later mission.

## Build and check offline

```sh
docker build -t hu-bot:local .
docker run --rm --network none \
  -e DISCORD_TOKEN=fixture-only \
  -e DISCORD_CLIENT_ID=100000000000000001 \
  -e DISCORD_GUILD_ID=100000000000000002 \
  hu-bot:local node dist/index.js --check-config
```

The final image uses a non-root user. Compose uses an init process, a read-only root filesystem, and the `unless-stopped` restart policy. SIGINT and SIGTERM trigger the same shutdown path. Normal operation needs outbound HTTPS and Discord Gateway access and publishes no ports.

## Authorized cutover

Run these steps at an approved cutover. Use the existing checkout, Compose project name, and Docker host throughout.

1. Record the deployed Python revision and image, and retain a private copy of the existing `.env`.
2. Prepare the reviewed TypeScript revision and build its image before the outage, from a separate checkout with `docker compose -p <existing-project> build bot`. An empty `.env` is sufficient in that checkout for the build.
3. From the old checkout, run `docker compose stop` to disconnect the Python service before starting the replacement.
4. Switch the existing checkout to the reviewed revision. Keep the token and add the application and guild IDs. Validate the Compose configuration with `docker compose config --quiet`. Run `docker compose run --rm --no-deps bot node dist/index.js --check-config` to validate the same environment used by the replacement.
5. Run `docker compose up -d --no-build --remove-orphans`. Check `docker compose ps` and `docker compose logs --tail=30 bot` for `discord.ready` and any startup or guild warning. The current invitation and token carry over.

For rollback, run `docker compose down` from the TypeScript checkout, restore the Python revision and its original private configuration, then start the previous service with `docker compose up -d`. Keep only one runtime connected per token during cutover and rollback.
