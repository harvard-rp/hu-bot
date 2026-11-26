import { HTTPError } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { ConfigurationError, loadConfig } from '../src/config.js';
import { reportFailure } from '../src/errors.js';
import { createLogger } from '../src/logger.js';

const token = 'synthetic-token-for-tests';
const env = {
  DISCORD_TOKEN: token,
  DISCORD_CLIENT_ID: '100000000000000001',
  DISCORD_GUILD_ID: '100000000000000002',
};

describe('configuration', () => {
  it('preserves DISCORD_TOKEN and defaults to info with writes disabled', () => {
    const config = loadConfig({ ...env, DISCORD_TOKEN: `  ${token} \n` });
    expect(config).toMatchObject({
      token,
      applicationId: env.DISCORD_CLIENT_ID,
      guildId: env.DISCORD_GUILD_ID,
      logLevel: 'info',
      rolePolicy: {
        writesEnabled: false,
        rpRoleIds: new Set(),
        staffRoleIds: new Set(),
      },
    });
  });

  it('accepts independent, de-duplicated role lists with whitespace', () => {
    const config = loadConfig({
      ...env,
      LOG_LEVEL: 'debug',
      DISCORD_WRITES_ENABLED: 'true',
      DISCORD_RP_ROLE_IDS: '100000000000000011, 100000000000000011',
      DISCORD_STAFF_ROLE_IDS: '100000000000000012',
    });
    expect(config.logLevel).toBe('debug');
    expect(config.rolePolicy).toEqual({
      writesEnabled: true,
      rpRoleIds: new Set(['100000000000000011']),
      staffRoleIds: new Set(['100000000000000012']),
    });
  });

  it.each([
    ['DISCORD_TOKEN', ''],
    ['DISCORD_TOKEN', 'Bot synthetic-token'],
    ['DISCORD_CLIENT_ID', 'not-a-snowflake'],
    ['DISCORD_GUILD_ID', '123'],
    ['LOG_LEVEL', 'verbose'],
    ['DISCORD_WRITES_ENABLED', 'yes'],
    ['DISCORD_STAFF_ROLE_IDS', '100000000000000012,'],
    ['DISCORD_RP_ROLE_IDS', 'role-name'],
  ])(
    'rejects malformed %s without retaining the input value',
    (field, value) => {
      expect(() => loadConfig({ ...env, [field]: value })).toThrow(
        expect.objectContaining({ fields: [field] }),
      );
    },
  );

  it('reports all missing required variable names', () => {
    expect(() => loadConfig({})).toThrow(
      expect.objectContaining({
        fields: ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'],
      }),
    );
  });
});

describe('logging', () => {
  it('filters by level and redacts token occurrences from JSON output', () => {
    const write = vi.fn<(line: string) => void>();
    const logger = createLogger('info', token, write);
    logger.log('debug', 'filtered', { detail: token });
    logger.log('info', 'discord.ready', { bot: `Bot ${token}\nnext line` });
    expect(write).toHaveBeenCalledTimes(1);
    const [line = ''] = write.mock.calls[0] ?? [];
    expect(line).not.toContain(token);
    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toMatchObject({
      level: 'info',
      event: 'discord.ready',
      bot: 'Bot [REDACTED]\nnext line',
    });
  });

  it('logs static failure reasons and HTTP status without error messages, stacks or request URLs', () => {
    const write = vi.fn<(line: string) => void>();
    const logger = createLogger('info', token, write);
    reportFailure(
      logger,
      'process.failed',
      new ConfigurationError(['DISCORD_TOKEN']),
    );
    reportFailure(
      logger,
      'process.failed',
      new Error(`payload: ${token} other-private-value`),
    );
    reportFailure(
      logger,
      'process.failed',
      new HTTPError(
        401,
        'Unauthorized',
        'GET',
        `https://invalid.test/${token}`,
        {},
      ),
    );
    const lines = write.mock.calls.map(([line]) => line);
    expect(lines.join('')).not.toMatch(
      /synthetic-token|other-private-value|invalid\.test|stack/,
    );
    expect(lines.map((line) => JSON.parse(line))).toMatchObject([
      { reason: 'invalid_configuration', fields: 'DISCORD_TOKEN' },
      { reason: 'unexpected_error' },
      { reason: 'discord_http_error', status: 401 },
    ]);
  });
});
