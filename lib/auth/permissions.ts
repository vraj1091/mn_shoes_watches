/**
 * Who may do what in the admin: the one place roles are defined (DECISIONS.md 68). Every admin
 * page, server action and route handler checks a permission from here on the server; the admin
 * menu hides what a role cannot open, but hiding is never the protection. Roles are fixed on
 * purpose: a shop owner should never have to design a permission system.
 *
 * | Role    | Access                                                                          |
 * |---------|---------------------------------------------------------------------------------|
 * | Owner   | Everything: settings, staff accounts, payments, removing demo data, activity log |
 * | Manager | Products, categories, brands, orders, coupons, banners, customers; no settings,  |
 * |         | staff or payment settings                                                        |
 * | Staff   | View and update orders; view products and stock. No deletions, no settings       |
 *
 * Customers have their own accounts and can never open the admin (decision 2).
 */

export const STAFF_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export type StaffRoleName = (typeof STAFF_ROLES)[number];

export const PERMISSIONS = [
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "orders.refund",
  "catalogue.view",
  "catalogue.manage",
  "inventory.view",
  "customers.view",
  "customers.manage",
  "discounts.manage",
  "content.manage",
  "media.manage",
  "settings.manage",
  "settings.payments",
  "demo.remove",
  "staff.manage",
  "activity.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MANAGER: readonly Permission[] = [
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "orders.refund",
  "catalogue.view",
  "catalogue.manage",
  "inventory.view",
  "customers.view",
  "customers.manage",
  "discounts.manage",
  "content.manage",
  "media.manage",
];

const STAFF: readonly Permission[] = ["dashboard.view", "orders.view", "orders.manage", "catalogue.view", "inventory.view"];

const ROLE_PERMISSIONS: Record<StaffRoleName, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  MANAGER,
  STAFF,
};

export function isStaffRole(value: unknown): value is StaffRoleName {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

export function can(role: StaffRoleName, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Owner and Manager can move money and change the catalogue, so a live shop makes them use an
 * authenticator app. Development builds skip it so the documented login works at once;
 * ADMIN_REQUIRE_2FA=true or false overrides either default (DECISIONS.md 54).
 */
export function requiresTwoFactor(role: StaffRoleName): boolean {
  const setting = process.env.ADMIN_REQUIRE_2FA;
  const enforced = setting === "true" || (setting !== "false" && process.env.NODE_ENV === "production");
  return enforced && (role === "OWNER" || role === "MANAGER");
}

export const ROLE_LABELS: Record<StaffRoleName, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

export const ROLE_SUMMARIES: Record<StaffRoleName, string> = {
  OWNER: "Everything, including settings, staff accounts, payments and removing demo data.",
  MANAGER: "Products, categories, brands, orders, coupons, banners and customers. No settings or staff.",
  STAFF: "Views and updates orders; sees products and stock. Cannot delete anything or change settings.",
};
