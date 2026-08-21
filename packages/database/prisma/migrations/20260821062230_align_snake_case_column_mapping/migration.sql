-- Cac model bootstrap dau tien (users, roles, permissions, user_roles,
-- role_permissions, audit_logs, menus) chua tung duoc @map sang snake_case,
-- khac voi moi model tu Journal v1 tro di. Doi ten cot giu nguyen du lieu,
-- khong drop+add.

-- users
ALTER TABLE "users" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "users" RENAME COLUMN "isDeleted" TO "is_deleted";
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "users" RENAME COLUMN "createdBy" TO "created_by";
ALTER TABLE "users" RENAME COLUMN "updatedBy" TO "updated_by";

-- roles
ALTER TABLE "roles" RENAME COLUMN "isDeleted" TO "is_deleted";
ALTER TABLE "roles" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "roles" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "roles" RENAME COLUMN "createdBy" TO "created_by";
ALTER TABLE "roles" RENAME COLUMN "updatedBy" TO "updated_by";

-- permissions
ALTER TABLE "permissions" RENAME COLUMN "displayName" TO "display_name";
ALTER TABLE "permissions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "permissions" RENAME COLUMN "updatedAt" TO "updated_at";

-- user_roles (bao gom 2 cot trong composite primary key)
ALTER TABLE "user_roles" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "user_roles" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "user_roles" RENAME COLUMN "assignedAt" TO "assigned_at";

-- role_permissions (bao gom 2 cot trong composite primary key)
ALTER TABLE "role_permissions" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "role_permissions" RENAME COLUMN "permissionId" TO "permission_id";
ALTER TABLE "role_permissions" RENAME COLUMN "grantedAt" TO "granted_at";

-- audit_logs
ALTER TABLE "audit_logs" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "audit_logs" RENAME COLUMN "userEmail" TO "user_email";
ALTER TABLE "audit_logs" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "audit_logs" RENAME COLUMN "createdAt" TO "created_at";

-- menus
ALTER TABLE "menus" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "menus" RENAME COLUMN "updatedAt" TO "updated_at";

-- Doi ten index/constraint tu sinh de khop lai voi ten cot moi (Postgres
-- khong tu doi ten cac object nay khi RENAME COLUMN).
ALTER INDEX "audit_logs_createdAt_idx" RENAME TO "audit_logs_created_at_idx";
ALTER TABLE "role_permissions" RENAME CONSTRAINT "role_permissions_permissionId_fkey" TO "role_permissions_permission_id_fkey";
ALTER TABLE "role_permissions" RENAME CONSTRAINT "role_permissions_roleId_fkey" TO "role_permissions_role_id_fkey";
ALTER TABLE "user_roles" RENAME CONSTRAINT "user_roles_roleId_fkey" TO "user_roles_role_id_fkey";
ALTER TABLE "user_roles" RENAME CONSTRAINT "user_roles_userId_fkey" TO "user_roles_user_id_fkey";
