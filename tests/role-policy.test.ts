import { describe, expect, it } from 'vitest';
import {
  canManageRpRole,
  compareRolePositions,
  isTechnicallyManageable,
} from '../src/services/role-policy.js';

const guildId = '100000000000000001';
const staffId = '100000000000000007';
const bot = {
  guildId,
  highestRole: { id: '100000000000000010', position: 8 },
  canManageRoles: true,
};
const role = { id: '100000000000000015', position: 7, managed: false };
const policy = {
  writesEnabled: true,
  rpRoleIds: new Set([role.id, staffId]),
  staffRoleIds: new Set([staffId]),
};

describe('Discord role hierarchy', () => {
  it('uses the lower snowflake as the higher role when positions tie', () => {
    expect(
      compareRolePositions(bot.highestRole, { ...role, position: 8 }),
    ).toBeGreaterThan(0);
    expect(
      compareRolePositions(bot.highestRole, { id: staffId, position: 8 }),
    ).toBeLessThan(0);
  });

  it('requires Manage Roles and excludes everyone, managed, equal and higher roles', () => {
    expect(isTechnicallyManageable(role, bot)).toBe(true);
    expect(
      isTechnicallyManageable(role, { ...bot, canManageRoles: false }),
    ).toBe(false);
    expect(isTechnicallyManageable({ ...role, id: guildId }, bot)).toBe(false);
    expect(isTechnicallyManageable({ ...role, managed: true }, bot)).toBe(
      false,
    );
    expect(isTechnicallyManageable({ ...role, ...bot.highestRole }, bot)).toBe(
      false,
    );
    expect(isTechnicallyManageable({ ...role, position: 9 }, bot)).toBe(false);
    expect(
      isTechnicallyManageable(
        { ...role, position: 0 },
        { ...bot, highestRole: { id: guildId, position: 0 } },
      ),
    ).toBe(false);
  });
});

describe('future RP role write gate', () => {
  it('requires explicit enablement and an RP allowlist entry', () => {
    expect(canManageRpRole(role, bot, policy)).toBe(true);
    expect(
      canManageRpRole(role, bot, { ...policy, writesEnabled: false }),
    ).toBe(false);
    expect(
      canManageRpRole(role, bot, { ...policy, rpRoleIds: new Set() }),
    ).toBe(false);
    expect(
      canManageRpRole(role, bot, { ...policy, staffRoleIds: new Set() }),
    ).toBe(false);
  });

  it('protects staff even in case of an allowlist overlap and still enforces hierarchy', () => {
    expect(canManageRpRole({ ...role, id: staffId }, bot, policy)).toBe(false);
    expect(canManageRpRole({ ...role, position: 9 }, bot, policy)).toBe(false);
  });
});
