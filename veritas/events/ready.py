import discord


def register_ready_event(client: discord.Client) -> None:
    @client.event
    async def on_ready() -> None:
        print(f"Veritas connected as {client.user}.")
