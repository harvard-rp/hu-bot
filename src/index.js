import { Client, Events, GatewayIntentBits } from 'discord.js';
import { onReady } from './events/ready.js';

const token = process.env.DISCORD_TOKEN?.trim();

if (!token) {
  console.error('Set DISCORD_TOKEN in .env or in your environment.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once(Events.ClientReady, onReady);

await client.login(token);
