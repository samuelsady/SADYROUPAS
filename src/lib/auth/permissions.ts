import type { UserRole } from "@prisma/client";

/** Permissões por papel. ADMIN tem todas; STAFF opera o dia a dia. */
export const PERMISSIONS = {
  "appointments.manage": ["ADMIN", "STAFF"],
  "customers.manage": ["ADMIN", "STAFF"],
  "catalog.manage": ["ADMIN", "STAFF"],
  "inventory.manage": ["ADMIN", "STAFF"],
  "print.manage": ["ADMIN", "STAFF"],
  "notifications.view": ["ADMIN", "STAFF"],
  "settings.manage": ["ADMIN"],
  "users.manage": ["ADMIN"],
  "audit.view": ["ADMIN"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole, permission: Permission) {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
