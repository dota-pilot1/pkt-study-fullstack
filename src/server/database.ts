import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "@/db/schema";
import bcrypt from "bcryptjs";

const configuredDataDirectory = process.env.PKT_STUDY_DATA_DIR;
const dataDirectory = configuredDataDirectory
  ? path.resolve(configuredDataDirectory)
  : path.join(process.cwd(), ".data");
const databasePath = path.join(dataDirectory, "pkt-study.db");
const pendingRestorePath = path.join(dataDirectory, "pkt-study.restore-pending.db");

fs.mkdirSync(dataDirectory, { recursive: true });

if (fs.existsSync(pendingRestorePath)) {
  const restoreProbe = new Database(pendingRestorePath, { readonly: true });
  const hasUsers = restoreProbe.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  const hasSpaces = restoreProbe.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'playbook_spaces'").get();
  restoreProbe.close();
  if (hasUsers && hasSpaces) {
    if (fs.existsSync(databasePath)) fs.copyFileSync(databasePath, `${databasePath}.before-restore`);
    fs.renameSync(pendingRestorePath, databasePath);
  } else {
    fs.unlinkSync(pendingRestorePath);
  }
}

const sqlite = new Database(databasePath);
// Next.js may evaluate multiple route modules in parallel during production
// builds. The schema/bootstrap writes are safe to retry, but SQLite needs a
// short wait instead of failing immediately with SQLITE_BUSY.
sqlite.pragma("busy_timeout = 10000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS proof_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_code TEXT NOT NULL,
    process TEXT NOT NULL,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    system_role INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    username TEXT NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES permission_categories(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS permission_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id),
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS playbook_spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS playbook_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    space_id INTEGER NOT NULL REFERENCES playbook_spaces(id),
    title TEXT NOT NULL,
    order_idx INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS playbook_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES playbook_categories(id),
    title TEXT NOT NULL,
    order_idx INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS playbook_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL REFERENCES playbook_topics(id),
    parent_id INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '{"root":{"children":[]}}',
    status TEXT NOT NULL DEFAULT 'DRAFT',
    use_for_chatbot INTEGER NOT NULL DEFAULT 0,
    order_idx INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TEXT,
    share_token TEXT UNIQUE,
    ai_edit_token_hash TEXT UNIQUE,
    ai_edit_token_expires_at TEXT,
    ai_edit_token_used_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS playbook_document_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES playbook_documents(id),
    parent_id INTEGER,
    title TEXT,
    content TEXT NOT NULL,
    created_by INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Existing development databases predate the migration fields above.
for (const statement of [
  "ALTER TABLE permissions ADD COLUMN category_id INTEGER REFERENCES permission_categories(id)",
  "ALTER TABLE playbook_documents ADD COLUMN share_token TEXT",
  "ALTER TABLE playbook_documents ADD COLUMN ai_edit_token_hash TEXT",
  "ALTER TABLE playbook_documents ADD COLUMN ai_edit_token_expires_at TEXT",
  "ALTER TABLE playbook_documents ADD COLUMN ai_edit_token_used_at TEXT",
]) {
  try {
    sqlite.exec(statement);
  } catch (error) {
    if (!(error instanceof Error) || !/duplicate column name/i.test(error.message)) throw error;
  }
}
sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_playbook_documents_share_token ON playbook_documents(share_token)");
sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_playbook_documents_ai_edit_token_hash ON playbook_documents(ai_edit_token_hash)");

const now = new Date().toISOString();
sqlite.prepare(
  "INSERT OR IGNORE INTO roles (code, name, description, system_role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
).run("ROLE_ADMIN", "관리자", "로컬 앱 관리자", 1, now, now);
const adminRole = sqlite.prepare("SELECT id FROM roles WHERE code = ?").get("ROLE_ADMIN") as { id: number };
const roleId = adminRole.id;
const bootstrapEmail = process.env.PKT_STUDY_BOOTSTRAP_EMAIL ?? "terecal@daum.net";
const existingUser = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(bootstrapEmail) as { id: number } | undefined;
if (!existingUser) {
  const password = process.env.PKT_STUDY_BOOTSTRAP_PASSWORD ?? "password123";
  sqlite.prepare(
    "INSERT OR IGNORE INTO users (email, password_hash, username, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(bootstrapEmail, bcrypt.hashSync(password, 10), "PKT 관리자", roleId, 1, now, now);
}

const defaultSpace = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get("PKT_FRONT_LEV1") as { id: number } | undefined;
if (!defaultSpace) {
  sqlite.prepare("INSERT OR IGNORE INTO playbook_spaces (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run("PKT_FRONT_LEV1", "PKT Front Lev1", now, now);
  const space = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get("PKT_FRONT_LEV1") as { id: number };
  sqlite.prepare("INSERT OR IGNORE INTO playbook_categories (space_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(space.id, "폐쇄망 개발 환경", 0, now, now);
  const category = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ?").get(space.id, "폐쇄망 개발 환경") as { id: number };
  sqlite.prepare("INSERT OR IGNORE INTO playbook_topics (category_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(category.id, "Next.js + SQLite 전환", 0, now, now);
  const topic = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ?").get(category.id, "Next.js + SQLite 전환") as { id: number };
  sqlite.prepare("INSERT OR IGNORE INTO playbook_documents (topic_id, title, content, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(topic.id, "풀스택 전환 시작하기", JSON.stringify({ root: { children: [{ type: "paragraph", children: [{ type: "text", text: "Tauri + Next.js + SQLite 전환 노트" }] }] } }), 0, now, now);
}

// 원본 노트 앱의 모든 메뉴는 DB space/category/topic/document 트리다.
// 새 로컬 DB에서도 한 모듈만 준비 상태로 남지 않도록 최소 구조를 각 space에 보장한다.
const noteSpaceSeeds = [
  ["SPRING_BOOT", "스프링 노트", "스프링 핵심", "Spring Boot 시작하기", "Spring Boot, JPA, DDD 계층과 API 설계 기록"],
  ["DB", "DB 테이블 설계", "데이터 모델링", "고정 계층과 무한 계층", "PostgreSQL, ERD, JPA와 데이터 모델 기록"],
  ["FRONTEND", "리액트 노트", "React 기본", "Next.js 화면 구성", "React, Next.js, FSD와 화면 구현 기록"],
  ["UIUX", "공통 컴포넌트", "기본 컴포넌트", "Button", "Button 컴포넌트의 variant·size·상태를 정리합니다."],
  ["UI_NAV", "메뉴·네비게이션", "기본 UI 실습", "Sidebar와 Header", "메뉴와 네비게이션 컴포넌트 구성"],
  ["UI_FORM", "폼·유효성 검사", "기본 UI 실습", "Form 상태와 검증", "React Hook Form과 Zod 입력 검증"],
  ["UI_LAYOUT", "레이아웃·페이지", "기본 UI 실습", "List와 Detail", "Grid/Flex와 반응형 페이지 구성"],
  ["UI_STATE", "인터랙션·상태", "기본 UI 실습", "Loading과 Empty", "Hover, Dropdown, Loading, Skeleton, Empty, Toast"],
] as const;
for (const [code, name, categoryTitle, topicTitle, documentText] of noteSpaceSeeds) {
  sqlite.prepare("INSERT OR IGNORE INTO playbook_spaces (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(code, name, now, now);
  const space = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get(code) as { id: number };
  let category = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(space.id, categoryTitle) as { id: number } | undefined;
  if (!category) {
    sqlite.prepare("INSERT INTO playbook_categories (space_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(space.id, categoryTitle, 0, now, now);
    category = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(space.id, categoryTitle) as { id: number };
  }
  let topic = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? ORDER BY id LIMIT 1").get(category.id, topicTitle) as { id: number } | undefined;
  if (!topic) {
    sqlite.prepare("INSERT INTO playbook_topics (category_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(category.id, topicTitle, 0, now, now);
    topic = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? ORDER BY id LIMIT 1").get(category.id, topicTitle) as { id: number };
  }
  const existingDocument = sqlite.prepare("SELECT id FROM playbook_documents WHERE topic_id = ? LIMIT 1").get(topic.id) as { id: number } | undefined;
  if (!existingDocument) {
    const content = JSON.stringify({ root: { children: [{ type: "paragraph", children: [{ type: "text", text: documentText }] }] } });
    sqlite.prepare("INSERT INTO playbook_documents (topic_id, title, content, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(topic.id, topicTitle, content, 0, now, now);
  }
}

export const db = drizzle(sqlite, { schema });

export { databasePath, dataDirectory, pendingRestorePath };

export function checkpointDatabase() {
  sqlite.pragma("wal_checkpoint(TRUNCATE)");
}

export function getDatabaseStatus() {
  const sqliteVersion = sqlite.prepare("SELECT sqlite_version() AS version").get() as { version: string };
  return { databasePath, sqliteVersion: sqliteVersion.version };
}
