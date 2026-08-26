import "server-only";

import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import bcrypt from "bcryptjs";
import { applyMigrations } from "@/server/db/migrations";
import { databasePath, dataDirectory, pendingRestorePath, sqlite } from "@/server/db/connection";
import {
  API_IMPLEMENTATION_CHILD_SAMPLES,
  API_IMPLEMENTATION_NOTE_SAMPLE_LEXICAL_STATE,
  FRONTEND_IMPLEMENTATION_NOTE_SAMPLE_LEXICAL_STATE,
} from "@/server/db/seed-content";

applyMigrations(sqlite);

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
  sqlite.prepare("INSERT OR IGNORE INTO playbook_spaces (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)").run("PKT_FRONT_LEV1", "기본 화면 설계", now, now);
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
  ["JAVA", "자바 노트", "Java 기초", "객체와 컬렉션", "Java 문법, 객체지향, 컬렉션과 Stream 사용 기록"],
  ["DB", "DB 테이블 설계", "데이터 모델링", "고정 계층과 무한 계층", "PostgreSQL, ERD, JPA와 데이터 모델 기록"],
  ["FRONTEND", "리액트 노트", "React 기본", "Next.js 화면 구성", "React, Next.js, FSD와 화면 구현 기록"],
  ["JS_TS", "JS·TS 노트", "JavaScript·TypeScript 기초", "배열 메서드와 타입", "map·filter·reduce, TypeScript 타입과 React에서의 활용 기록"],
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

// 구현 노트 모범 예시는 일반 학습 노트와 분리해 편집하고, sample_key로 API에서 안정적으로 조회한다.
sqlite.prepare("INSERT OR IGNORE INTO playbook_spaces (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
  .run("NOTE_SAMPLE", "샘플 노트", now, now);
const sampleSpace = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get("NOTE_SAMPLE") as { id: number };
let sampleCategory = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1")
  .get(sampleSpace.id, "구현 노트 모범 예시") as { id: number } | undefined;
if (!sampleCategory) {
  sqlite.prepare("INSERT INTO playbook_categories (space_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(sampleSpace.id, "구현 노트 모범 예시", 0, now, now);
  sampleCategory = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1")
    .get(sampleSpace.id, "구현 노트 모범 예시") as { id: number };
}
const sampleSeeds = [
  ["API_IMPLEMENTATION", "API 구현 노트 정리 예시", "API 구현 노트 모범 문서", API_IMPLEMENTATION_NOTE_SAMPLE_LEXICAL_STATE],
  ["FRONTEND_IMPLEMENTATION", "프론트 노트 정리 예시", "프론트 구현 노트 모범 문서", FRONTEND_IMPLEMENTATION_NOTE_SAMPLE_LEXICAL_STATE],
] as const;
for (const [sampleKey, topicTitle, documentTitle, content] of sampleSeeds) {
  let topic = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? ORDER BY id LIMIT 1")
    .get(sampleCategory.id, topicTitle) as { id: number } | undefined;
  if (!topic) {
    const topicCount = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_topics WHERE category_id = ?")
      .get(sampleCategory.id) as { count: number };
    sqlite.prepare("INSERT INTO playbook_topics (category_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(sampleCategory.id, topicTitle, topicCount.count, now, now);
    topic = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? ORDER BY id LIMIT 1")
      .get(sampleCategory.id, topicTitle) as { id: number };
  }
  const existingSample = sqlite.prepare("SELECT id, version FROM playbook_documents WHERE sample_key = ? LIMIT 1")
    .get(sampleKey) as { id: number; version: number } | undefined;
  if (!existingSample) {
    const documentCount = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_documents WHERE topic_id = ? AND parent_id IS NULL")
      .get(topic.id) as { count: number };
    sqlite.prepare("INSERT INTO playbook_documents (topic_id, title, content, order_idx, sample_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(topic.id, documentTitle, content, documentCount.count, sampleKey, now, now);
  } else if (existingSample.version === 1) {
    // 최초 시드 상태의 샘플만 최신 내장 예시로 동기화한다. 사용자가 저장해
    // version이 증가한 샘플은 일반 노트처럼 편집한 내용을 그대로 보존한다.
    sqlite.prepare("UPDATE playbook_documents SET topic_id = ?, title = ?, content = ?, updated_at = ? WHERE id = ?")
      .run(topic.id, documentTitle, content, now, existingSample.id);
  }
}

// API 모범 예시는 상위 계획 문서와 TODO별 상세 하위 문서 구조까지 제공한다.
const apiSampleParent = sqlite.prepare("SELECT id, topic_id AS topicId FROM playbook_documents WHERE sample_key = ? LIMIT 1")
  .get("API_IMPLEMENTATION") as { id: number; topicId: number };
for (const [orderIdx, child] of API_IMPLEMENTATION_CHILD_SAMPLES.entries()) {
  const existingChild = sqlite.prepare(
    "SELECT id, version FROM playbook_documents WHERE topic_id = ? AND parent_id = ? AND title = ? LIMIT 1",
  ).get(apiSampleParent.topicId, apiSampleParent.id, child.title) as { id: number; version: number } | undefined;
  if (!existingChild) {
    sqlite.prepare(
      "INSERT INTO playbook_documents (topic_id, parent_id, title, content, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(apiSampleParent.topicId, apiSampleParent.id, child.title, child.content, orderIdx, now, now);
  } else if (existingChild.version === 1) {
    sqlite.prepare("UPDATE playbook_documents SET content = ?, order_idx = ?, updated_at = ? WHERE id = ?")
      .run(child.content, orderIdx, now, existingChild.id);
  }
}

// 페이지 단위 실습의 대표 주제. 기존 데이터에도 중복 없이 추가해 작업 관리 화면 실습을 복구한다.
const pktSpace = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get("PKT_FRONT_LEV1") as { id: number };
let pageCategory = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(pktSpace.id, "기본 페이지 작업 - 1") as { id: number } | undefined;
if (!pageCategory) {
  const categoryCount = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_categories WHERE space_id = ?").get(pktSpace.id) as { count: number };
  sqlite.prepare("INSERT INTO playbook_categories (space_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(pktSpace.id, "기본 페이지 작업 - 1", categoryCount.count, now, now);
  pageCategory = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(pktSpace.id, "기본 페이지 작업 - 1") as { id: number };
}
let workManagementTopic = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? ORDER BY id LIMIT 1").get(pageCategory.id, "작업 관리") as { id: number } | undefined;
if (!workManagementTopic) {
  const topicCount = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_topics WHERE category_id = ?").get(pageCategory.id) as { count: number };
  sqlite.prepare("INSERT INTO playbook_topics (category_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(pageCategory.id, "작업 관리", topicCount.count, now, now);
  workManagementTopic = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? ORDER BY id LIMIT 1").get(pageCategory.id, "작업 관리") as { id: number };
}
const workManagementDocuments = [
  ["작업 관리 목록 조회", "작업지시 목록 조회를 FSD 구조로 구현합니다.\n\nStep 1. 화면 모델 타입 정의\nStep 2. 목록 API 모듈 구현\nStep 3. 조회 훅 연결\nStep 4. 페이지 목록·선택 상태 연결\n\n주요 파일: prac-pkt-react/src/features/work-order/model/work-order.types.ts, prac-pkt-react/src/features/work-order/api/work-order.api.ts, prac-pkt-react/src/features/work-order/model/useWorkOrders.ts"],
  ["작업 관리 상태 업데이트", "작업지시 상태 변경을 FSD 구조로 구현합니다.\n\nStep 1. 상태 변경 요청 계약 정의\nStep 2. 상태 변경 API 구현\nStep 3. mutation 훅과 캐시 무효화\nStep 4. 드로워 상태 변경 UI 연결\n\n주요 파일: prac-pkt-react/src/features/work-order/model/work-order.types.ts, prac-pkt-react/src/features/work-order/api/work-order.api.ts, prac-pkt-react/src/features/work-order/model/useWorkOrders.ts"],
] as const;
const existingWorkManagementDocuments = sqlite.prepare("SELECT id FROM playbook_documents WHERE topic_id = ?").all(workManagementTopic.id) as Array<{ id: number }>;
if (existingWorkManagementDocuments.length === 0) {
  for (const [order, [title, text]] of workManagementDocuments.entries()) {
    const content = JSON.stringify({ root: { children: [{ type: "heading", tag: "h1", children: [{ type: "text", text: title }] }, { type: "paragraph", children: [{ type: "text", text }] }] } });
    sqlite.prepare("INSERT INTO playbook_documents (topic_id, title, content, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(workManagementTopic.id, title, content, order, now, now);
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
