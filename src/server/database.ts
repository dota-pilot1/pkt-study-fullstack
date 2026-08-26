import "server-only";

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "node:fs";
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

/**
 * 업데이트된 설치 시드에만 있는 플레이북 구조를 기존 사용자 DB에 병합한다.
 * 기존 문서의 본문·수정 이력은 덮어쓰지 않고, 같은 부모 아래 같은 제목이
 * 없는 항목만 추가해 신규 메뉴가 업데이트 이후에도 보이게 한다.
 */
function mergePackagedPlaybookSeed() {
  const seedPath = process.env.PKT_STUDY_SEED_DB;
  if (!seedPath || seedPath === databasePath || !fs.existsSync(seedPath)) return;

  const seed = new Database(seedPath, { readonly: true });
  const now = new Date().toISOString();
  try {
    const seedSpaces = seed.prepare("SELECT id, code, name FROM playbook_spaces WHERE code IN (?, ?, ?, ?, ?, ?)").all("CODE_LAB", "UIUX", "UI_NAV", "UI_FORM", "UI_LAYOUT", "UI_STATE") as Array<{ id: number; code: string; name: string }>;
    if (seedSpaces.length === 0) return;

    const insertSpace = sqlite.prepare("INSERT INTO playbook_spaces (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)");
    const insertCategory = sqlite.prepare("INSERT INTO playbook_categories (space_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
    const insertTopic = sqlite.prepare("INSERT INTO playbook_topics (category_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
    const insertDocument = sqlite.prepare("INSERT INTO playbook_documents (topic_id, parent_id, title, content, status, use_for_chatbot, order_idx, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    for (const seedSpace of seedSpaces) {
      const merge = sqlite.transaction(() => {
      let targetSpace = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get(seedSpace.code) as { id: number } | undefined;
      if (!targetSpace) {
        const result = insertSpace.run(seedSpace.code, seedSpace.name, now, now);
        targetSpace = { id: Number(result.lastInsertRowid) };
      }

      const categories = seed.prepare("SELECT id, title, order_idx FROM playbook_categories WHERE space_id = ? ORDER BY order_idx, id").all(seedSpace.id) as Array<{ id: number; title: string; order_idx: number }>;
      for (const seedCategory of categories) {
        let targetCategory = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(targetSpace.id, seedCategory.title) as { id: number } | undefined;
        if (!targetCategory) {
          const result = insertCategory.run(targetSpace.id, seedCategory.title, seedCategory.order_idx, now, now);
          targetCategory = { id: Number(result.lastInsertRowid) };
        }

        const topics = seed.prepare("SELECT id, title, order_idx FROM playbook_topics WHERE category_id = ? ORDER BY order_idx, id").all(seedCategory.id) as Array<{ id: number; title: string; order_idx: number }>;
        for (const seedTopic of topics) {
          let targetTopic = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? ORDER BY id LIMIT 1").get(targetCategory.id, seedTopic.title) as { id: number } | undefined;
          if (!targetTopic) {
            const result = insertTopic.run(targetCategory.id, seedTopic.title, seedTopic.order_idx, now, now);
            targetTopic = { id: Number(result.lastInsertRowid) };
          }

          const mergeDocuments = (seedParentId: number | null, targetParentId: number | null) => {
            const documents = seed.prepare("SELECT id, title, content, status, use_for_chatbot, order_idx, version FROM playbook_documents WHERE topic_id = ? AND parent_id IS ? ORDER BY order_idx, id").all(seedTopic.id, seedParentId) as Array<{ id: number; title: string; content: string; status: string; use_for_chatbot: number; order_idx: number; version: number }>;
            for (const document of documents) {
              const existing = sqlite.prepare("SELECT id FROM playbook_documents WHERE topic_id = ? AND parent_id IS ? AND title = ? LIMIT 1").get(targetTopic.id, targetParentId, document.title) as { id: number } | undefined;
              const targetDocumentId = existing?.id ?? Number(insertDocument.run(targetTopic.id, targetParentId, document.title, document.content, document.status, document.use_for_chatbot, document.order_idx, document.version, now, now).lastInsertRowid);
              mergeDocuments(document.id, targetDocumentId);
            }
          };
          mergeDocuments(null, null);
        }
      }
      });
      merge();

      // 이전 릴리즈에서 생성된 기술 중심 폼 카테고리는 보존하되,
      // 실제 사용 가능한 폼 시나리오보다 먼저 선택되지 않도록 뒤로 보낸다.
      if (seedSpace.code === "UI_FORM") {
        const targetSpaceId = (sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get(seedSpace.code) as { id: number }).id;
        sqlite.prepare("UPDATE playbook_categories SET order_idx = 999 WHERE space_id = ? AND title IN (?, ?)")
          .run(targetSpaceId, "폼 구성", "기본 UI 실습");
      }
    }
  } finally {
    seed.close();
  }
}

mergePackagedPlaybookSeed();

// 컴포넌트 갤러리는 사용자 문서와 역할이 겹쳤으므로 기존 설치 DB에서도 제거한다.
// 삭제 대상은 시스템이 생성한 COMPONENT_GALLERY 공간과 그 하위 트리로 한정한다.
const legacyComponentGallery = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get("COMPONENT_GALLERY") as { id: number } | undefined;
if (legacyComponentGallery) {
  const legacyCategories = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ?").all(legacyComponentGallery.id) as Array<{ id: number }>;
  const categoryIds = legacyCategories.map(({ id }) => id);
  const topicRows = categoryIds.length
    ? sqlite.prepare(`SELECT id FROM playbook_topics WHERE category_id IN (${categoryIds.map(() => "?").join(",")})`).all(...categoryIds) as Array<{ id: number }>
    : [];
  const topicIds = topicRows.map(({ id }) => id);
  const deleteLegacy = sqlite.transaction(() => {
    if (topicIds.length) {
      const placeholders = topicIds.map(() => "?").join(",");
      const documentIds = sqlite.prepare(`SELECT id FROM playbook_documents WHERE topic_id IN (${placeholders})`).all(...topicIds) as Array<{ id: number }>;
      const ids = documentIds.map(({ id }) => id);
      if (ids.length) {
        const documentPlaceholders = ids.map(() => "?").join(",");
        sqlite.prepare(`DELETE FROM playbook_document_comments WHERE document_id IN (${documentPlaceholders})`).run(...ids);
        sqlite.prepare(`DELETE FROM playbook_documents WHERE id IN (${documentPlaceholders})`).run(...ids);
      }
      sqlite.prepare(`DELETE FROM playbook_topics WHERE id IN (${placeholders})`).run(...topicIds);
    }
    if (categoryIds.length) sqlite.prepare(`DELETE FROM playbook_categories WHERE id IN (${categoryIds.map(() => "?").join(",")})`).run(...categoryIds);
    sqlite.prepare("DELETE FROM playbook_spaces WHERE id = ?").run(legacyComponentGallery.id);
  });
  deleteLegacy();
}

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
  ["UI_FORM", "폼 UI", "인증 폼", "로그인 폼", "로그인 입력과 인증 상태를 연결하는 폼 패턴"],
  ["UI_LAYOUT", "레이아웃·페이지", "레이아웃 기초", "Grid·Flex", "Grid/Flex와 반응형 페이지 구성"],
  ["UI_STATE", "인터랙션·상태", "인터랙션 패턴", "Hover", "Hover, Dropdown, Accordion, Animation 인터랙션 패턴"],
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

// CodeMirror로 작성한 Lexical TSX 문서를 모아 두는 일반 사용자 영역이다.
sqlite.prepare("INSERT OR IGNORE INTO playbook_spaces (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
  .run("CODE_LAB", "코드 실습", now, now);
const codeLabSpace = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get("CODE_LAB") as { id: number };
let codeLabCategory = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1")
  .get(codeLabSpace.id, "TSX 컴포넌트") as { id: number } | undefined;
if (!codeLabCategory) {
  sqlite.prepare("INSERT INTO playbook_categories (space_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(codeLabSpace.id, "TSX 컴포넌트", 0, now, now);
  codeLabCategory = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1")
    .get(codeLabSpace.id, "TSX 컴포넌트") as { id: number };
}
if (!sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? LIMIT 1").get(codeLabCategory.id, "Lexical TSX 블록")) {
  sqlite.prepare("INSERT INTO playbook_topics (category_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(codeLabCategory.id, "Lexical TSX 블록", 0, now, now);
}

// 폼 UI는 기술 목록이 아니라 바로 조합해 쓰는 화면 패턴으로 유지한다.
const uiFormSpace = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get("UI_FORM") as { id: number };
const uiFormCategories = [
  ["인증 폼", ["로그인 폼", "회원가입 폼", "비밀번호 변경 폼"]],
  ["조회 폼", ["검색 폼", "필터 폼", "날짜 범위 폼"]],
  ["등록·수정 폼", ["LOT 등록 폼", "설비 등록 폼", "공통 수정 폼"]],
  ["업로드 폼", ["파일 업로드 폼", "이미지 업로드 폼"]],
] as const;
for (const [categoryTitle, topicTitles] of uiFormCategories) {
  let category = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(uiFormSpace.id, categoryTitle) as { id: number } | undefined;
  if (!category) {
    const count = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_categories WHERE space_id = ?").get(uiFormSpace.id) as { count: number };
    sqlite.prepare("INSERT INTO playbook_categories (space_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(uiFormSpace.id, categoryTitle, count.count, now, now);
    category = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(uiFormSpace.id, categoryTitle) as { id: number };
  }
  for (const topicTitle of topicTitles) {
    const exists = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? LIMIT 1").get(category.id, topicTitle);
    if (!exists) {
      const count = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_topics WHERE category_id = ?").get(category.id) as { count: number };
      sqlite.prepare("INSERT INTO playbook_topics (category_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(category.id, topicTitle, count.count, now, now);
    }
  }
}

const uiLayoutSpace = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get("UI_LAYOUT") as { id: number };
const uiLayoutCategories = [
  ["레이아웃 기초", ["Grid·Flex", "반응형"]],
  ["화면 패턴", ["Dashboard", "List·Detail", "Master-Detail"]],
] as const;
for (const [categoryTitle, topicTitles] of uiLayoutCategories) {
  let category = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(uiLayoutSpace.id, categoryTitle) as { id: number } | undefined;
  if (!category) {
    const count = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_categories WHERE space_id = ?").get(uiLayoutSpace.id) as { count: number };
    sqlite.prepare("INSERT INTO playbook_categories (space_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(uiLayoutSpace.id, categoryTitle, count.count, now, now);
    category = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(uiLayoutSpace.id, categoryTitle) as { id: number };
  }
  for (const topicTitle of topicTitles) {
    const exists = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? LIMIT 1").get(category.id, topicTitle);
    if (!exists) {
      const count = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_topics WHERE category_id = ?").get(category.id) as { count: number };
      sqlite.prepare("INSERT INTO playbook_topics (category_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(category.id, topicTitle, count.count, now, now);
    }
  }
}

const uiStateSpace = sqlite.prepare("SELECT id FROM playbook_spaces WHERE code = ?").get("UI_STATE") as { id: number };
const uiStateCategories = [
  ["인터랙션 패턴", ["Hover", "Dropdown", "Accordion", "Animation"]],
  ["상태·피드백", ["Loading", "Skeleton", "Empty", "페이지 에러", "Toast", "상태 조합"]],
] as const;
for (const [categoryTitle, topicTitles] of uiStateCategories) {
  let category = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(uiStateSpace.id, categoryTitle) as { id: number } | undefined;
  if (!category) {
    const count = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_categories WHERE space_id = ?").get(uiStateSpace.id) as { count: number };
    sqlite.prepare("INSERT INTO playbook_categories (space_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(uiStateSpace.id, categoryTitle, count.count, now, now);
    category = sqlite.prepare("SELECT id FROM playbook_categories WHERE space_id = ? AND title = ? ORDER BY id LIMIT 1").get(uiStateSpace.id, categoryTitle) as { id: number };
  }
  for (const topicTitle of topicTitles) {
    const exists = sqlite.prepare("SELECT id FROM playbook_topics WHERE category_id = ? AND title = ? LIMIT 1").get(category.id, topicTitle);
    if (!exists) {
      const count = sqlite.prepare("SELECT COUNT(*) AS count FROM playbook_topics WHERE category_id = ?").get(category.id) as { count: number };
      sqlite.prepare("INSERT INTO playbook_topics (category_id, title, order_idx, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(category.id, topicTitle, count.count, now, now);
    }
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
