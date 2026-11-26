export interface RolePosition {
  id: string;
  position: number;
}

export interface Role extends RolePosition {
  managed: boolean;
}

export interface RolePolicy {
  writesEnabled: boolean;
  rpRoleIds: ReadonlySet<string>;
  staffRoleIds: ReadonlySet<string>;
}

export interface BotRoleContext {
  guildId: string;
  canManageRoles: boolean;
  highestRole: RolePosition;
}

// Discord puts the lower snowflake higher when two role positions are equal.
export function compareRolePositions(
  left: RolePosition,
  right: RolePosition,
): number {
  if (left.position !== right.position) return left.position - right.position;

  const leftId = BigInt(left.id);
  const rightId = BigInt(right.id);
  return leftId === rightId ? 0 : leftId < rightId ? 1 : -1;
}

export function isTechnicallyManageable(
  role: Role,
  bot: BotRoleContext,
): boolean {
  return (
    bot.canManageRoles &&
    bot.highestRole.id !== bot.guildId &&
    role.id !== bot.guildId &&
    !role.managed &&
    compareRolePositions(bot.highestRole, role) > 0
  );
}

export function canManageRpRole(
  role: Role,
  bot: BotRoleContext,
  policy: RolePolicy,
): boolean {
  return (
    policy.writesEnabled &&
    policy.staffRoleIds.size > 0 &&
    !policy.staffRoleIds.has(role.id) &&
    policy.rpRoleIds.has(role.id) &&
    isTechnicallyManageable(role, bot)
  );
}
