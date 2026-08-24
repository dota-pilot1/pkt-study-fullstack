import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * 런타임 검증 전용 테이블이다. 플레이북 스키마는 다음 단계에서 이 위치에 추가한다.
 */
export const proofEntries = sqliteTable("proof_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const lots = sqliteTable("lots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lotCode: text("lot_code").notNull(),
  process: text("process").notNull(),
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  status: text("status").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  systemRole: integer("system_role", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username").notNull(),
  roleId: integer("role_id").notNull().references(() => roles.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const permissions = sqliteTable("permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => permissionCategories.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const permissionCategories = sqliteTable("permission_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const rolePermissions = sqliteTable("role_permissions", {
  roleId: integer("role_id").notNull().references(() => roles.id),
  permissionId: integer("permission_id").notNull().references(() => permissions.id),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const playbookSpaces = sqliteTable("playbook_spaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const playbookCategories = sqliteTable("playbook_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  spaceId: integer("space_id").notNull().references(() => playbookSpaces.id),
  title: text("title").notNull(),
  orderIdx: integer("order_idx").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const playbookTopics = sqliteTable("playbook_topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull().references(() => playbookCategories.id),
  title: text("title").notNull(),
  orderIdx: integer("order_idx").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const playbookDocuments = sqliteTable("playbook_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicId: integer("topic_id").notNull().references(() => playbookTopics.id),
  parentId: integer("parent_id"),
  title: text("title").notNull(),
  content: text("content").notNull().default("{\"root\":{\"children\":[]}}"),
  status: text("status").notNull().default("DRAFT"),
  useForChatbot: integer("use_for_chatbot", { mode: "boolean" }).notNull().default(false),
  orderIdx: integer("order_idx").notNull().default(0),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by"),
  approvedBy: integer("approved_by"),
  approvedAt: text("approved_at"),
  shareToken: text("share_token").unique(),
  aiEditTokenHash: text("ai_edit_token_hash").unique(),
  aiEditTokenExpiresAt: text("ai_edit_token_expires_at"),
  aiEditTokenUsedAt: text("ai_edit_token_used_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const playbookDocumentComments = sqliteTable("playbook_document_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").notNull().references(() => playbookDocuments.id),
  parentId: integer("parent_id"),
  title: text("title"),
  content: text("content").notNull(),
  createdBy: integer("created_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
