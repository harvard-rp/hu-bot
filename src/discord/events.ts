import { Events, type Client } from 'discord.js';
import { reportFailure } from '../errors.js';
import type { Logger } from '../logger.js';
import { dispatchCommand, type CommandHandler } from './commands.js';

export function wireDiscordEvents(
  client: Pick<Client, 'on' | 'once'>,
  guildId: string,
  logger: Logger,
  commands: ReadonlyMap<string, CommandHandler> = new Map(),
): void {
  client.once(Events.ClientReady, (ready) => {
    logger.log('info', 'discord.ready', { bot: ready.user.tag });
    if (!ready.guilds.cache.has(guildId))
      logger.log('warn', 'discord.configured_guild_unavailable');
  });

  client.on(Events.Error, (error) =>
    reportFailure(logger, 'discord.client_error', error),
  );
  client.on(Events.ShardError, (error) =>
    reportFailure(logger, 'discord.shard_error', error),
  );
  client.on(Events.Warn, () => logger.log('warn', 'discord.client_warning'));

  client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    void dispatchCommand(
      { guildId: interaction.guildId, name: interaction.commandName },
      guildId,
      commands,
    ).catch((error: unknown) =>
      reportFailure(logger, 'discord.command_error', error),
    );
  });
}
