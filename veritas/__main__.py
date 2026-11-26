import os
from pathlib import Path

import discord
from dotenv import load_dotenv

from .events.ready import register_ready_event


def main() -> None:
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    token = os.getenv("DISCORD_TOKEN", "").strip()
    if not token:
        raise SystemExit("Set DISCORD_TOKEN in .env or in your environment.")

    intents = discord.Intents.none()
    intents.guilds = True
    client = discord.Client(intents=intents)
    register_ready_event(client)
    client.run(token)


if __name__ == "__main__":
    main()
