import { z } from 'zod';

const snowflake = z
  .string()
  .trim()
  .regex(/^[1-9]\d{16,19}$/);
const roleIds = z
  .string()
  .default('')
  .transform((value) => (value.trim() ? value.split(',') : []))
  .pipe(z.array(snowflake))
  .transform((ids) => new Set(ids));

const configSchema = z.object({
  DISCORD_TOKEN: z.string().trim().min(1).regex(/^\S+$/),
  DISCORD_CLIENT_ID: snowflake,
  DISCORD_GUILD_ID: snowflake,
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DISCORD_WRITES_ENABLED: z.enum(['true', 'false']).default('false'),
  DISCORD_RP_ROLE_IDS: roleIds,
  DISCORD_STAFF_ROLE_IDS: roleIds,
});

export class ConfigurationError extends Error {
  constructor(readonly fields: readonly string[]) {
    super('Invalid configuration');
  }
}

export function loadConfig(env: NodeJS.ProcessEnv) {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigurationError([
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ]);
  }

  const config = result.data;
  return {
    token: config.DISCORD_TOKEN,
    applicationId: config.DISCORD_CLIENT_ID,
    guildId: config.DISCORD_GUILD_ID,
    logLevel: config.LOG_LEVEL,
    rolePolicy: {
      writesEnabled: config.DISCORD_WRITES_ENABLED === 'true',
      rpRoleIds: config.DISCORD_RP_ROLE_IDS,
      staffRoleIds: config.DISCORD_STAFF_ROLE_IDS,
    },
  };
}
