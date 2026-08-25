import "server-only";

import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { playbookCategories, playbookDocumentComments, playbookDocuments, playbookSpaces, playbookTopics } from "@/db/schema";
import { db } from "@/server/database";

export class LlmPlaybookError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function assertLlmApiAccess(request: Request) {
  const hostname = new URL(request.url).hostname;
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (local || process.env.PLAYBOOK_LLM_API_PUBLIC === "true") return;
  throw new LlmPlaybookError(403, "LLM API 공개 접근이 비활성화되어 있습니다.");
}

export function llmErrorResponse(error: unknown) {
  if (error instanceof LlmPlaybookError) return NextResponse.json({ message: error.message }, { status: error.status });
  throw error;
}

export async function handleLlmRequest(request: Request, operation: () => Promise<unknown>, successStatus = 200) {
  try {
    assertLlmApiAccess(request);
    const result = await operation();
    return successStatus === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(result, { status: successStatus });
  } catch (error) {
    return llmErrorResponse(error);
  }
}

const documentSummary = (document: typeof playbookDocuments.$inferSelect) => ({
  id: document.id,
  topicId: document.topicId,
  parentId: document.parentId,
  title: document.title,
  status: document.status,
  useForChatbot: document.useForChatbot,
  orderIdx: document.orderIdx,
  version: document.version,
});

const documentResponse = (document: typeof playbookDocuments.$inferSelect) => ({
  ...documentSummary(document),
  content: document.content,
  createdBy: document.createdBy,
  approvedBy: document.approvedBy,
  approvedAt: document.approvedAt,
  updatedAt: document.updatedAt,
});

type PlaybookSampleChild = {
  documentId: number;
  parentId: number | null;
  title: string;
  content: string;
  version: number;
  updatedAt: string;
  children: PlaybookSampleChild[];
};

export async function llmTree(spaceCode: string) {
  const [space] = await db.select().from(playbookSpaces).where(eq(playbookSpaces.code, spaceCode.trim().toUpperCase())).limit(1);
  if (!space) throw new LlmPlaybookError(404, "플레이북을 찾을 수 없습니다.");
  const categories = await db.select().from(playbookCategories).where(eq(playbookCategories.spaceId, space.id)).orderBy(asc(playbookCategories.orderIdx), asc(playbookCategories.id));
  const topics = await db.select().from(playbookTopics).orderBy(asc(playbookTopics.orderIdx), asc(playbookTopics.id));
  const documents = await db.select().from(playbookDocuments).orderBy(asc(playbookDocuments.orderIdx), asc(playbookDocuments.id));
  return categories.map((category) => ({
    ...category,
    topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({
      ...topic,
      documents: documents.filter((document) => document.topicId === topic.id).map(documentSummary),
    })),
  }));
}

export async function llmCategory(categoryId: number) {
  const [category] = await db.select().from(playbookCategories).where(eq(playbookCategories.id, categoryId)).limit(1);
  if (!category) throw new LlmPlaybookError(404, "1차 메뉴를 찾을 수 없습니다.");
  const topics = await db.select().from(playbookTopics).where(eq(playbookTopics.categoryId, categoryId)).orderBy(asc(playbookTopics.orderIdx), asc(playbookTopics.id));
  const documents = await db.select().from(playbookDocuments).orderBy(asc(playbookDocuments.orderIdx), asc(playbookDocuments.id));
  return { ...category, topics: topics.map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id).map(documentSummary) })) };
}

export async function llmTopic(topicId: number) {
  const [topic] = await db.select().from(playbookTopics).where(eq(playbookTopics.id, topicId)).limit(1);
  if (!topic) throw new LlmPlaybookError(404, "2차 주제를 찾을 수 없습니다.");
  const documents = await db.select().from(playbookDocuments).where(eq(playbookDocuments.topicId, topicId)).orderBy(asc(playbookDocuments.orderIdx), asc(playbookDocuments.id));
  return { ...topic, documents: documents.map(documentSummary) };
}

export async function llmDocument(documentId: number) {
  const [document] = await db.select().from(playbookDocuments).where(eq(playbookDocuments.id, documentId)).limit(1);
  if (!document) throw new LlmPlaybookError(404, "문서를 찾을 수 없습니다.");
  return documentResponse(document);
}

export async function llmDocumentContext(documentId: number) {
  const document = await llmDocument(documentId);
  const [topic] = await db.select().from(playbookTopics).where(eq(playbookTopics.id, document.topicId)).limit(1);
  const [category] = await db.select().from(playbookCategories).where(eq(playbookCategories.id, topic.categoryId)).limit(1);
  const [space] = await db.select().from(playbookSpaces).where(eq(playbookSpaces.id, category.spaceId)).limit(1);
  const documents = await db.select().from(playbookDocuments).where(eq(playbookDocuments.topicId, topic.id)).orderBy(asc(playbookDocuments.orderIdx), asc(playbookDocuments.id));
  const node = (current: typeof playbookDocuments.$inferSelect): Record<string, unknown> => ({
    ...documentResponse(current),
    children: documents.filter((child) => child.parentId === current.id).map(node),
  });
  const current = documents.find((item) => item.id === documentId);
  if (!current) throw new LlmPlaybookError(404, "문서를 찾을 수 없습니다.");
  return { spaceCode: space.code, spaceName: space.name, categoryId: category.id, categoryTitle: category.title, topicId: topic.id, topicTitle: topic.title, document: node(current) };
}

export async function createLlmStructure(spaceCode: string, categoryTitle: string, topicTitles: string[]) {
  const [space] = await db.select().from(playbookSpaces).where(eq(playbookSpaces.code, spaceCode.trim().toUpperCase())).limit(1);
  if (!space) throw new LlmPlaybookError(404, "플레이북을 찾을 수 없습니다.");
  const now = new Date().toISOString();
  const categories = await db.select().from(playbookCategories).where(eq(playbookCategories.spaceId, space.id));
  const [category] = await db.insert(playbookCategories).values({ spaceId: space.id, title: categoryTitle.trim(), orderIdx: categories.length, createdAt: now, updatedAt: now }).returning();
  const topics = [];
  for (const [index, title] of topicTitles.map((item) => item.trim()).filter(Boolean).entries()) {
    const [topic] = await db.insert(playbookTopics).values({ categoryId: category.id, title, orderIdx: index, createdAt: now, updatedAt: now }).returning();
    topics.push({ ...topic, documents: [] });
  }
  return { category: { ...category, topics }, topics };
}

export async function createLlmDocument(topicId: number, title: string, content: string, parentId: number | null) {
  const [topic] = await db.select().from(playbookTopics).where(eq(playbookTopics.id, topicId)).limit(1);
  if (!topic) throw new LlmPlaybookError(404, "2차 주제를 찾을 수 없습니다.");
  if (parentId !== null) {
    const [parent] = await db.select().from(playbookDocuments).where(and(eq(playbookDocuments.id, parentId), eq(playbookDocuments.topicId, topicId))).limit(1);
    if (!parent) throw new LlmPlaybookError(400, "같은 주제의 상위 문서만 지정할 수 있습니다.");
  }
  const siblings = await db.select().from(playbookDocuments).where(eq(playbookDocuments.topicId, topicId));
  const orderIdx = siblings.filter((document) => document.parentId === parentId).length;
  const now = new Date().toISOString();
  const [document] = await db.insert(playbookDocuments).values({ topicId, parentId, title: title.trim(), content, orderIdx, createdAt: now, updatedAt: now }).returning();
  return documentResponse(document);
}

export async function updateLlmDocument(documentId: number, title: string | undefined, content: string, expectedVersion: number | undefined, parentId: number | null | undefined) {
  const current = await llmDocument(documentId);
  if (expectedVersion !== undefined && current.version !== expectedVersion) throw new LlmPlaybookError(409, "문서 version이 변경되었습니다. 최신 문서를 다시 조회하세요.");
  if (parentId !== undefined && parentId !== null) {
    if (parentId === documentId) throw new LlmPlaybookError(400, "문서 자신을 상위 문서로 지정할 수 없습니다.");
    const [parent] = await db.select().from(playbookDocuments).where(and(eq(playbookDocuments.id, parentId), eq(playbookDocuments.topicId, current.topicId))).limit(1);
    if (!parent) throw new LlmPlaybookError(400, "같은 주제의 상위 문서만 지정할 수 있습니다.");
  }
  await db.update(playbookDocuments).set({
    title: title?.trim() || current.title,
    content,
    parentId: parentId === undefined ? current.parentId : parentId,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  }).where(eq(playbookDocuments.id, documentId));
  return llmDocument(documentId);
}

export async function deleteLlmDocument(documentId: number) {
  await llmDocument(documentId);
  const documents = await db.select({ id: playbookDocuments.id, parentId: playbookDocuments.parentId }).from(playbookDocuments);
  const ids = new Set<number>([documentId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const document of documents) {
      if (document.parentId !== null && ids.has(document.parentId) && !ids.has(document.id)) {
        ids.add(document.id);
        changed = true;
      }
    }
  }
  const targets = [...ids];
  await db.delete(playbookDocumentComments).where(inArray(playbookDocumentComments.documentId, targets));
  await db.delete(playbookDocuments).where(inArray(playbookDocuments.id, targets));
}

export async function reorderLlmDocuments(topicId: number, ids: number[], parentId: number | null) {
  const documents = await db.select().from(playbookDocuments).where(eq(playbookDocuments.topicId, topicId));
  const siblings = documents.filter((document) => document.parentId === parentId);
  const siblingIds = new Set(siblings.map((document) => document.id));
  if (ids.length !== siblings.length || ids.some((id) => !siblingIds.has(id))) throw new LlmPlaybookError(400, "같은 상위 문서 아래의 전체 문서 ID를 전달해야 합니다.");
  const now = new Date().toISOString();
  for (const [orderIdx, id] of ids.entries()) await db.update(playbookDocuments).set({ orderIdx, updatedAt: now }).where(eq(playbookDocuments.id, id));
}

export async function llmSamples() {
  const documents = await db.select().from(playbookDocuments).where(isNotNull(playbookDocuments.sampleKey)).orderBy(asc(playbookDocuments.sampleKey));
  return documents.map((document) => ({ sampleKey: document.sampleKey, documentId: document.id, topicId: document.topicId, title: document.title, content: document.content, version: document.version, updatedAt: document.updatedAt }));
}

export async function llmSample(sampleKey: string) {
  const [document] = await db.select().from(playbookDocuments).where(eq(playbookDocuments.sampleKey, sampleKey.trim().toUpperCase())).limit(1);
  if (!document) throw new LlmPlaybookError(404, "샘플 문서를 찾을 수 없습니다.");
  const documents = await db.select().from(playbookDocuments).where(eq(playbookDocuments.topicId, document.topicId)).orderBy(asc(playbookDocuments.orderIdx), asc(playbookDocuments.id));
  const childNode = (current: typeof playbookDocuments.$inferSelect): PlaybookSampleChild => ({
    documentId: current.id,
    parentId: current.parentId,
    title: current.title,
    content: current.content,
    version: current.version,
    updatedAt: current.updatedAt,
    children: documents.filter((child) => child.parentId === current.id).map(childNode),
  });
  return { sampleKey: document.sampleKey, topicId: document.topicId, ...childNode(document) };
}
