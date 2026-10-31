-- Roles become Owner, Manager and Staff (DECISIONS.md 68). Catalogue editors and order staff become Staff.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StaffUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StaffUser" ("createdAt", "email", "emailVerified", "id", "image", "isActive", "lastLoginAt", "name", "role", "storeId", "twoFactorEnabled", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "image", "isActive", "lastLoginAt", "name", "role", "storeId", "twoFactorEnabled", "updatedAt" FROM "StaffUser";
DROP TABLE "StaffUser";
ALTER TABLE "new_StaffUser" RENAME TO "StaffUser";
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


UPDATE "StaffUser" SET "role" = 'STAFF' WHERE "role" IN ('CATALOGUE_EDITOR', 'ORDER_STAFF');
