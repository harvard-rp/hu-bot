import {
  Events,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDiscordClient } from '../src/discord/client.js';
import { wireDiscordEvents } from '../src/discord/events.js';
import { runBot } from '../src/discord/lifecycle.js';

const guildId = '100000000000000002';

describe('Discord events', () => {
  const client = createDiscordClient(new AbortController().signal);
  const logger = { log: vi.fn() };

  afterEach(async () => {
    client.removeAllListeners();
    await client.destroy();
    logger.log.mockClear();
  });

  const ready = {
    user: { tag: 'Offline fixture bot' },
    guilds: { cache: new Map([[guildId, {}]]) },
  } as unknown as Client<true>;

  it('requests only Guilds and logs its identity once on readiness', () => {
    expect(client.options.intents.bitfield).toBe(GatewayIntentBits.Guilds);
    expect(client.options.intents.has(GatewayIntentBits.GuildMembers)).toBe(
      false,
    );
    wireDiscordEvents(client, guildId, logger);
    client.emit(Events.ClientReady, ready);
    client.emit(Events.ClientReady, ready);
    expect(logger.log).toHaveBeenCalledExactlyOnceWith(
      'info',
      'discord.ready',
      {
        bot: 'Offline fixture bot',
      },
    );
  });

  it('warns when the configured guild is missing and handles errors without logging raw payloads', () => {
    wireDiscordEvents(client, '100000000000000003', logger);
    client.emit(Events.ClientReady, ready);
    client.emit(Events.Error, new Error('private payload'));
    client.emit(Events.ShardError, new Error('another payload'), 0);
    expect(logger.log.mock.calls).toEqual([
      ['info', 'discord.ready', { bot: 'Offline fixture bot' }],
      ['warn', 'discord.configured_guild_unavailable'],
      ['error', 'discord.client_error', { reason: 'unexpected_error' }],
      ['error', 'discord.shard_error', { reason: 'unexpected_error' }],
    ]);
  });

  it('dispatches only known chat commands in the configured guild and contains handler errors', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('private payload'));
    wireDiscordEvents(client, guildId, logger, new Map([['sample', handler]]));
    const emit = (id: string | null, name: string, isChatInput = true) => {
      client.emit(Events.InteractionCreate, {
        isChatInputCommand: () => isChatInput,
        guildId: id,
        commandName: name,
      } as ChatInputCommandInteraction);
    };

    emit(guildId, 'other');
    emit('100000000000000003', 'sample');
    emit(null, 'sample');
    emit(guildId, 'sample', false);
    emit(guildId, 'sample');

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      guildId,
      name: 'sample',
    });
    await vi.waitFor(() =>
      expect(logger.log).toHaveBeenCalledExactlyOnceWith(
        'error',
        'discord.command_error',
        {
          reason: 'unexpected_error',
        },
      ),
    );
  });
});

describe('shutdown', () => {
  function makeClient() {
    return {
      login: vi.fn().mockResolvedValue('fixture'),
      destroy: vi.fn().mockResolvedValue(undefined),
    };
  }

  it('keeps a connected client running until signalled, then awaits destruction', async () => {
    const client = makeClient();
    const controller = new AbortController();
    const cleanup = Promise.withResolvers<void>();
    client.destroy.mockReturnValue(cleanup.promise);

    const run = runBot(client, 'fixture', controller.signal);
    const complete = vi.fn();
    void run.then(complete);
    await Promise.resolve();
    expect(client.destroy).not.toHaveBeenCalled();
    controller.abort();
    await vi.waitFor(() => expect(client.destroy).toHaveBeenCalledTimes(1));
    expect(complete).not.toHaveBeenCalled();
    cleanup.resolve();
    await run;
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('closes a client when signalled during login', async () => {
    const client = makeClient();
    const login = Promise.withResolvers<string>();
    client.login.mockReturnValue(login.promise);
    const controller = new AbortController();
    const run = runBot(client, 'fixture', controller.signal);
    controller.abort();
    await run;
    login.reject(new Error('connection aborted'));
    expect(client.destroy).toHaveBeenCalledTimes(1);
  });

  it('cleans up and propagates login failures', async () => {
    const client = makeClient();
    client.login.mockRejectedValue(new Error('fixture login failed'));
    await expect(
      runBot(client, 'fixture', new AbortController().signal),
    ).rejects.toThrow('fixture login failed');
    expect(client.destroy).toHaveBeenCalledTimes(1);
  });

  it('skips login after an earlier shutdown request', async () => {
    const client = makeClient();
    await runBot(client, 'fixture', AbortSignal.abort());
    expect(client.login).not.toHaveBeenCalled();
  });
});
