# Veritas

A Discord bot starter built with Python and discord.py.

## Setup

Create a virtual environment and install the dependencies.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

If you don't already have a `.env`, copy `.env.example` to `.env` and set `DISCORD_TOKEN` using your bot token from the [Discord Developer Portal](https://discord.com/developers/applications). Run `python -m veritas` to start the bot.

Add event handlers in `veritas/events/` and future commands in `veritas/commands/`.
