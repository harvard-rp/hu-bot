import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ChannelType, OverwriteType, Routes } from 'discord-api-types/v10';
import { PermissionFlagsBits as P, type REST } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { collectInventory } from '../src/inventory/discord-inventory.js';
import { saveInventory } from '../src/inventory/output.js';
import {
  channelPermissions,
  guildPermissions,
} from '../src/inventory/permissions.js';

const appId = '100000000000000001';
const guildId = '100000000000000002';
const botId = '100000000000000003';
const botRoleId = '100000000000000010';
const rpId = '100000000000000011';
const managedId = '100000000000000012';
const staffId = '100000000000000013';
const categoryId = '100000000000000020';
const channelId = '100000000000000021';
const privateChannelId = '100000000000000022';
const memberId = '100000000000000030';
const signal = new AbortController().signal;

function fixtures() {
  return new Map<string, unknown>([
    [Routes.oauth2CurrentApplication(), { id: appId }],
    [Routes.user(), { id: botId, bot: true, username: 'internal-bot-profile' }],
    [
      Routes.guild(guildId),
      { id: guildId, name: 'Fixture guild', owner_id: memberId },
    ],
    [
      Routes.guildMember(guildId, botId),
      { roles: [botRoleId], nick: 'internal-member-profile' },
    ],
    [
      Routes.guildRoles(guildId),
      [
        { id: rpId, name: 'RP', position: 5, managed: false, permissions: '0' },
        {
          id: guildId,
          name: '@everyone',
          position: 0,
          managed: false,
          permissions: (
            P.ViewChannel |
            P.SendMessages |
            P.EmbedLinks
          ).toString(),
        },
        {
          id: staffId,
          name: 'Staff',
          position: 9,
          managed: false,
          permissions: '0',
        },
        {
          id: managedId,
          name: 'Managed',
          position: 2,
          managed: true,
          permissions: '0',
        },
        {
          id: botRoleId,
          name: 'Bot',
          position: 5,
          managed: true,
          permissions: P.ManageRoles.toString(),
        },
      ],
    ],
    [
      Routes.guildChannels(guildId),
      [
        {
          id: categoryId,
          name: 'Category',
          type: ChannelType.GuildCategory,
          position: 1,
        },
        {
          id: channelId,
          name: 'Text channel',
          type: ChannelType.GuildText,
          position: 2,
          parent_id: categoryId,
          topic: 'internal-topic',
          permission_overwrites: [
            {
              id: guildId,
              type: OverwriteType.Role,
              deny: P.SendMessages.toString(),
              allow: '0',
            },
            {
              id: botRoleId,
              type: OverwriteType.Role,
              deny: '0',
              allow: P.SendMessages.toString(),
            },
            {
              id: botId,
              type: OverwriteType.Member,
              deny: P.EmbedLinks.toString(),
              allow: '0',
            },
            {
              id: memberId,
              type: OverwriteType.Member,
              deny: '0',
              allow: P.Administrator.toString(),
            },
          ],
        },
        {
          id: privateChannelId,
          name: 'Private channel',
          type: ChannelType.GuildText,
          permission_overwrites: [
            {
              id: guildId,
              type: OverwriteType.Role,
              deny: P.ViewChannel.toString(),
              allow: '0',
            },
          ],
        },
      ],
    ],
  ]);
}

function fixtureRest(responses = fixtures()) {
  return {
    get: vi.fn<REST['get']>(async (route) => {
      if (!responses.has(route)) throw new Error(`Unexpected route: ${route}`);
      return responses.get(route);
    }),
  };
}

describe('read-only inventory', () => {
  it('reads the exact guild and bot endpoints and projects role hierarchy and channel permissions', async () => {
    const rest = fixtureRest();
    const inventory = await collectInventory(rest, appId, guildId, signal);
    expect(rest.get.mock.calls).toEqual(
      [...fixtures().keys()].map((route) => [route, { signal }]),
    );
    expect(inventory.guild).toEqual({ id: guildId, name: 'Fixture guild' });
    expect(inventory.bot).toMatchObject({
      id: botId,
      assignedRoleIds: [botRoleId],
      highestRoleId: botRoleId,
      guildPermissions: {
        names: expect.arrayContaining(['ManageRoles', 'ViewChannel']),
      },
    });
    expect(
      inventory.roles.map(({ id, hierarchyRank, technicallyManageable }) => [
        id,
        hierarchyRank,
        technicallyManageable,
      ]),
    ).toEqual([
      [staffId, 1, false],
      [botRoleId, 2, false],
      [rpId, 3, true],
      [managedId, 4, false],
      [guildId, 5, false],
    ]);
    expect(inventory.channels[0]).toMatchObject({
      type: ChannelType.GuildCategory,
      parentId: null,
    });
    expect(inventory.channels[1]).toMatchObject({
      parentId: categoryId,
      position: 2,
      effectiveBotPermissions: {
        bitfield: (P.ManageRoles | P.SendMessages | P.ViewChannel).toString(),
        names: expect.arrayContaining([
          'ManageRoles',
          'SendMessages',
          'ViewChannel',
        ]),
      },
    });
    expect(inventory.channels[2]?.effectiveBotPermissions).toEqual({
      bitfield: '0',
      names: [],
    });
    const output = JSON.stringify(inventory);
    expect(output).not.toContain(memberId);
    expect(output).not.toContain('internal-');
    expect(output).not.toContain('permission_overwrites');
  });

  it('rejects an application mismatch before fetching any server data', async () => {
    const rest = fixtureRest();
    await expect(
      collectInventory(rest, staffId, guildId, signal),
    ).rejects.toMatchObject({
      code: 'application_mismatch',
    });
    expect(rest.get).toHaveBeenCalledExactlyOnceWith(
      Routes.oauth2CurrentApplication(),
      { signal },
    );
  });

  it('rejects incomplete role data instead of emitting an unreliable snapshot', async () => {
    const rest = fixtureRest(
      fixtures().set(Routes.guildMember(guildId, botId), {
        roles: ['100000000000000099'],
      }),
    );
    await expect(
      collectInventory(rest, appId, guildId, signal),
    ).rejects.toMatchObject({
      code: 'incomplete_role_data',
    });
  });

  it('writes separate private local JSON files for concurrent runs', async () => {
    const temp = await mkdtemp(join(tmpdir(), 'hu-bot-tests-'));
    try {
      const inventory = await collectInventory(
        fixtureRest(),
        appId,
        guildId,
        signal,
      );
      const directory = join(temp, '.discord-inventory');
      const [first, second] = await Promise.all([
        saveInventory(inventory, directory),
        saveInventory(inventory, directory),
      ]);
      expect(first).not.toEqual(second);
      expect(JSON.parse(await readFile(first, 'utf8'))).toEqual(inventory);
      if (process.platform !== 'win32') {
        expect((await stat(first)).mode & 0o777).toBe(0o600);
        expect((await stat(directory)).mode & 0o777).toBe(0o700);
      }
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});

describe('implicit Discord channel permissions', () => {
  it('ignores attachment and embed permissions when sending messages is denied', () => {
    const base = P.ViewChannel | P.SendMessages | P.AttachFiles | P.EmbedLinks;
    const overrides = [
      {
        id: botId,
        type: OverwriteType.Member,
        deny: P.SendMessages.toString(),
        allow: '0',
      },
    ];
    expect(
      channelPermissions(
        base,
        guildId,
        botId,
        new Set(),
        overrides,
        ChannelType.GuildText,
      ),
    ).toBe(P.ViewChannel);
  });

  it('ignores voice management actions without Connect', () => {
    const base = P.ViewChannel | P.ManageChannels | P.MoveMembers;
    expect(
      channelPermissions(
        base,
        guildId,
        botId,
        new Set(),
        [],
        ChannelType.GuildVoice,
      ),
    ).toBe(P.ViewChannel);
  });

  it('accounts for the Administrator bypass if present in the inventory snapshot', () => {
    const base = guildPermissions([P.Administrator.toString()]);
    const overrides = [
      {
        id: botId,
        type: OverwriteType.Member,
        deny: P.ViewChannel.toString(),
        allow: '0',
      },
    ];
    expect(base & P.ManageRoles).toBe(P.ManageRoles);
    expect(
      channelPermissions(
        base,
        guildId,
        botId,
        new Set(),
        overrides,
        ChannelType.GuildText,
      ),
    ).toBe(base);
  });
});
