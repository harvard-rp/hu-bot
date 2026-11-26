import { DiscordAPIError, HTTPError } from 'discord.js';
import { ConfigurationError } from './config.js';
import type { Logger } from './logger.js';

export class OperationError extends Error {
  constructor(
    readonly code:
      | 'invalid_mode'
      | 'application_mismatch'
      | 'guild_mismatch'
      | 'bot_identity_missing'
      | 'incomplete_role_data',
  ) {
    super(code);
  }
}

export function reportFailure(
  logger: Logger,
  event: string,
  error: unknown,
): void {
  if (error instanceof ConfigurationError) {
    logger.log('error', event, {
      reason: 'invalid_configuration',
      fields: error.fields.join(', '),
    });
    return;
  }
  if (error instanceof OperationError) {
    logger.log('error', event, { reason: error.code });
    return;
  }
  if (error instanceof DiscordAPIError || error instanceof HTTPError) {
    logger.log('error', event, {
      reason: 'discord_http_error',
      status: error.status,
    });
    return;
  }

  // Third-party errors can include request headers, URLs, or Discord payloads.
  logger.log('error', event, { reason: 'unexpected_error' });
}
