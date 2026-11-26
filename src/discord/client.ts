import {
  Routes,
  type RESTGetAPIOAuth2CurrentApplicationResult,
} from 'discord-api-types/v10';
import {
  Client,
  DefaultRestOptions,
  GatewayIntentBits,
  REST,
} from 'discord.js';
import { OperationError } from '../errors.js';

export function createDiscordClient(signal: AbortSignal) {
  return new Client({
    intents: [GatewayIntentBits.Guilds],
    rest: {
      makeRequest(url, options) {
        // Stop a pending gateway bootstrap request when the process shuts down.
        const requestSignal = options.signal
          ? AbortSignal.any([signal, options.signal])
          : signal;
        return DefaultRestOptions.makeRequest(url, {
          ...options,
          signal: requestSignal,
        });
      },
    },
  });
}

export function createDiscordRest(token: string) {
  return new REST({ version: '10' }).setToken(token);
}

export async function verifyApplication(
  rest: Pick<REST, 'get'>,
  applicationId: string,
  signal: AbortSignal,
): Promise<void> {
  const application = (await rest.get(Routes.oauth2CurrentApplication(), {
    signal,
  })) as RESTGetAPIOAuth2CurrentApplicationResult;

  if (application.id !== applicationId)
    throw new OperationError('application_mismatch');
}
