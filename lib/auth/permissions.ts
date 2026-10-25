/**
 * Fixed staff permissions (PLAN.md, "Page list — admin"). Roles are not editable on purpose:
 * a shop owner should never have to design a permission system.
 */

export const STAFF_ROLES = ["OWNER", "MANAGER", "CATALOGUE_EDITOR", "ORDER_STAFF"] as const;
export type StaffRoleName = (typeof STAFF_ROLES)[number];

export const PERMISSIONS = [
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "orders.refund",
  "returns.manage",
  "catalogue.view",
  "catalogue.manage",
  "inventory.view",
  "inventory.manage",
  "customers.view",
  "customers.manage",
  "privacy.manage",
  "discounts.manage",
  "reviews.manage",
  "content.manage",
  "media.manage",
  "seo.manage",
  "settings.manage",
  "settings.secrets",
  "staff.manage",
  "activity.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<StaffRoleName, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  MANAGER: PERMISSIONS.filter((p) => p !== "settings.secrets" && p !== "staff.manage"),
  CATALOGUE_EDITOR: [
    "dashboard.view",
    "orders.view",
    "catalogue.view",
    "catalogue.manage",
    "inventory.view",
    "inventory.manage",
    "reviews.manage",
    "content.manage",
    "media.manage",
    "seo.manage",
  ],
  ORDER_STAFF: [
    "dashboard.view",
    "orders.view",
    "orders.manage",
    "returns.manage",
    "customers.view",
    "customers.manage",
    "catalogue.view",
    "inventory.view",
  ],
};

export function isStaffRole(value: unknown): value is StaffRoleName {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

export function can(role: StaffRoleName, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Owner and Manager can move money and change settings, so they must use an authenticator app. */
export function requiresTwoFactor(role: StaffRoleName): boolean {
  return role === "OWNER" || role === "MANAGER";
}

export const ROLE_LABELS: Record<StaffRoleName, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CATALOGUE_EDITOR: "Catalogue editor",
  ORDER_STAFF: "Order staff",
};
