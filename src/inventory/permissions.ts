import {
  ChannelType,
  OverwriteType,
  type APIOverwrite,
} from 'discord-api-types/v10';
import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';

export function guildPermissions(rolePermissions: readonly string[]): bigint {
  const flags = rolePermissions.reduce(
    (result, mask) => result | BigInt(mask),
    0n,
  );
  return hasPermission(flags, PermissionFlagsBits.Administrator)
    ? flags | PermissionsBitField.All
    : flags;
}

export function hasPermission(flags: bigint, permission: bigint): boolean {
  return (flags & permission) === permission;
}

export function channelPermissions(
  base: bigint,
  guildId: string,
  botId: string,
  botRoles: ReadonlySet<string>,
  overwrites: readonly APIOverwrite[],
  channelType: ChannelType,
): bigint {
  if (hasPermission(base, PermissionFlagsBits.Administrator)) return base;

  const everyone = overwrites.find(
    (entry) => entry.type === OverwriteType.Role && entry.id === guildId,
  );
  let allow = 0n;
  let deny = 0n;
  for (const entry of overwrites) {
    if (
      entry.type !== OverwriteType.Role ||
      entry.id === guildId ||
      !botRoles.has(entry.id)
    )
      continue;
    allow |= BigInt(entry.allow);
    deny |= BigInt(entry.deny);
  }
  const bot = overwrites.find(
    (entry) => entry.type === OverwriteType.Member && entry.id === botId,
  );

  let result =
    (base & ~BigInt(everyone?.deny ?? '0')) | BigInt(everyone?.allow ?? '0');
  result = (result & ~deny) | allow;
  result = (result & ~BigInt(bot?.deny ?? '0')) | BigInt(bot?.allow ?? '0');

  if (!hasPermission(result, PermissionFlagsBits.ViewChannel)) return 0n;
  if (!hasPermission(result, PermissionFlagsBits.SendMessages)) {
    result &= ~(
      PermissionFlagsBits.MentionEveryone |
      PermissionFlagsBits.SendTTSMessages |
      PermissionFlagsBits.AttachFiles |
      PermissionFlagsBits.EmbedLinks
    );
  }
  if (
    (channelType === ChannelType.GuildVoice ||
      channelType === ChannelType.GuildStageVoice) &&
    !hasPermission(result, PermissionFlagsBits.Connect)
  ) {
    result &= ~(
      PermissionsBitField.StageModerator | PermissionFlagsBits.ManageChannels
    );
  }
  return result;
}

export function describePermissions(flags: bigint) {
  const names = Object.entries(PermissionFlagsBits)
    .filter(([, flag]) => hasPermission(flags, flag))
    .map(([name]) => name);
  return { bitfield: flags.toString(), names };
}
