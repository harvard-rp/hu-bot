import { writeSync } from 'node:fs';
import { loadConfig } from './config.js';
import {
  createDiscordClient,
  createDiscordRest,
  verifyApplication,
} from './discord/client.js';
import { wireDiscordEvents } from './discord/events.js';
import { runBot } from './discord/lifecycle.js';
import { OperationError, reportFailure } from './errors.js';
import { collectInventory } from './inventory/discord-inventory.js';
import { saveInventory } from './inventory/output.js';
import { createLogger } from './logger.js';

async function main(): Promise<void> {
  let logger = createLogger('info', process.env.DISCORD_TOKEN?.trim() ?? '');
  const controller = new AbortController();
  const shutdown = (signal: NodeJS.Signals) => {
    logger.log('info', 'process.shutdown_requested', { signal });
    controller.abort();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  try {
    const [mode, ...extra] = process.argv.slice(2);
    if (
      extra.length ||
      (mode !== undefined && mode !== 'inventory' && mode !== '--check-config')
    ) {
      throw new OperationError('invalid_mode');
    }
    const config = loadConfig(process.env);
    logger = createLogger(config.logLevel, config.token);

    if (mode === '--check-config') {
      logger.log('info', 'configuration.valid');
      return;
    }

    const { signal } = controller;
    const rest = createDiscordRest(config.token);
    if (mode === 'inventory') {
      const inventory = await collectInventory(
        rest,
        config.applicationId,
        config.guildId,
        signal,
      );
      signal.throwIfAborted();
      const path = await saveInventory(inventory);
      logger.log('info', 'inventory.saved', { path });
      return;
    }

    await verifyApplication(rest, config.applicationId, signal);
    signal.throwIfAborted();
    const client = createDiscordClient(signal);
    wireDiscordEvents(client, config.guildId, logger);
    await runBot(client, config.token, signal);
  } catch (error) {
    if (
      controller.signal.aborted &&
      error instanceof Error &&
      error.name === 'AbortError'
    )
      return;
    reportFailure(logger, 'process.failed', error);
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGTERM', shutdown);
    process.removeListener('SIGINT', shutdown);
  }
}

// Keep Node's fallback fatal path from printing arbitrary third-party error payloads.
process.on('uncaughtException', () => {
  writeSync(2, '{"level":"error","event":"process.uncaught_exception"}\n');
  process.exit(1);
});

await main();
