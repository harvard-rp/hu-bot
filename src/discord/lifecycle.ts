import type { Client } from 'discord.js';

export async function runBot(
  client: Pick<Client, 'login' | 'destroy'>,
  token: string,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;

  const { promise: stopped, resolve: stop } = Promise.withResolvers<void>();
  const onAbort = () => stop();
  signal.addEventListener('abort', onAbort, { once: true });

  try {
    await Promise.race([client.login(token), stopped]);
    await stopped;
  } finally {
    signal.removeEventListener('abort', onAbort);
    await client.destroy();
  }
}
