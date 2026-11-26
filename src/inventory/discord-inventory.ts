import {
  Routes,
  type RESTGetAPICurrentUserResult,
  type RESTGetAPIGuildChannelsResult,
  type RESTGetAPIGuildMemberResult,
  type RESTGetAPIGuildResult,
  type RESTGetAPIGuildRolesResult,
} from 'discord-api-types/v10';
import { PermissionFlagsBits, type REST } from 'discord.js';
import { verifyApplication } from '../discord/client.js';
import { OperationError } from '../errors.js';
import {
  compareRolePositions,
  isTechnicallyManageable,
} from '../services/role-policy.js';
import {
  channelPermissions,
  describePermissions,
  guildPermissions,
  hasPermission,
} from './permissions.js';

export async function collectInventory(
  rest: Pick<REST, 'get'>,
  applicationId: string,
  guildId: string,
  signal: AbortSignal,
) {
  await verifyApplication(rest, applicationId, signal);
  const [bot, guild] = await Promise.all([
    rest.get(Routes.user(), { signal }) as Promise<RESTGetAPICurrentUserResult>,
    rest.get(Routes.guild(guildId), {
      signal,
    }) as Promise<RESTGetAPIGuildResult>,
  ]);
  if (guild.id !== guildId) throw new OperationError('guild_mismatch');
  if (bot.bot !== true) throw new OperationError('bot_identity_missing');

  const [member, roles, channels] = await Promise.all([
    rest.get(Routes.guildMember(guildId, bot.id), {
      signal,
    }) as Promise<RESTGetAPIGuildMemberResult>,
    rest.get(Routes.guildRoles(guildId), {
      signal,
    }) as Promise<RESTGetAPIGuildRolesResult>,
    rest.get(Routes.guildChannels(guildId), {
      signal,
    }) as Promise<RESTGetAPIGuildChannelsResult>,
  ]);
  const everyone = roles.find((role) => role.id === guildId);
  const botRoleIds = new Set(member.roles);
  const assignedRoles = roles.filter(
    (role) => role.id !== guildId && botRoleIds.has(role.id),
  );
  if (!everyone || assignedRoles.length !== botRoleIds.size) {
    throw new OperationError('incomplete_role_data');
  }

  const orderedRoles = roles
    .filter((role) => role.id !== guildId)
    .sort((left, right) => compareRolePositions(right, left));
  orderedRoles.push(everyone);

  const highestRole =
    orderedRoles.find((role) => botRoleIds.has(role.id)) ?? everyone;
  const base = guildPermissions([
    everyone.permissions,
    ...assignedRoles.map((role) => role.permissions),
  ]);
  const roleContext = {
    guildId,
    canManageRoles: hasPermission(base, PermissionFlagsBits.ManageRoles),
    highestRole,
  };

  return {
    schemaVersion: 1,
    collectedAt: new Date().toISOString(),
    guild: { id: guild.id, name: guild.name },
    bot: {
      id: bot.id,
      assignedRoleIds: orderedRoles
        .filter((role) => botRoleIds.has(role.id))
        .map((role) => role.id),
      highestRoleId: highestRole.id,
      guildPermissions: describePermissions(base),
    },
    roles: orderedRoles.map((role, index) => ({
      id: role.id,
      name: role.name,
      position: role.position,
      hierarchyRank: index + 1,
      managed: role.managed,
      permissions: describePermissions(BigInt(role.permissions)),
      technicallyManageable: isTechnicallyManageable(role, roleContext),
    })),
    channels: channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parent_id ?? null,
      position:
        'position' in channel && typeof channel.position === 'number'
          ? channel.position
          : null,
      effectiveBotPermissions: describePermissions(
        channelPermissions(
          base,
          guildId,
          bot.id,
          botRoleIds,
          channel.permission_overwrites ?? [],
          channel.type,
        ),
      ),
    })),
  };
}
