import "server-only";

import { LlmPlaybookError } from "@/server/http/llm-request";
export { assertLlmApiAccess, handleLlmRequest, llmErrorResponse, LlmPlaybookError } from "@/server/http/llm-request";
import type { playbookDocuments } from "@/db/schema";
import * as repository from "@/server/modules/playbook/playbook-repository";

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
  const space = await repository.findSpaceByCode(spaceCode.trim().toUpperCase());
  if (!space) throw new LlmPlaybookError(404, "플레이북을 찾을 수 없습니다.");
  const categories = await repository.listCategoriesBySpace(space.id);
  const topics = await repository.listAllTopics();
  const documents = await repository.listAllDocuments();
  return categories.map((category) => ({
    ...category,
    topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({
      ...topic,
      documents: documents.filter((document) => document.topicId === topic.id).map(documentSummary),
    })),
  }));
}

export async function llmCategory(categoryId: number) {
  const category = await repository.findCategoryById(categoryId);
  if (!category) throw new LlmPlaybookError(404, "1차 메뉴를 찾을 수 없습니다.");
  const topics = (await repository.listAllTopics()).filter((topic) => topic.categoryId === categoryId);
  const documents = await repository.listAllDocuments();
  return { ...category, topics: topics.map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id).map(documentSummary) })) };
}

export async function llmTopic(topicId: number) {
  const topic = await repository.findTopicById(topicId);
  if (!topic) throw new LlmPlaybookError(404, "2차 주제를 찾을 수 없습니다.");
  const documents = await repository.listDocumentsByTopic(topicId);
  return { ...topic, documents: documents.map(documentSummary) };
}

export async function llmDocument(documentId: number) {
  const document = await repository.findDocument(documentId);
  if (!document) throw new LlmPlaybookError(404, "문서를 찾을 수 없습니다.");
  return documentResponse(document);
}

export async function llmDocumentContext(documentId: number) {
  const document = await llmDocument(documentId);
  const topic = await repository.findTopicById(document.topicId);
  const category = topic ? await repository.findCategoryById(topic.categoryId) : null;
  if (!topic || !category) throw new LlmPlaybookError(404, "문서 위치를 찾을 수 없습니다.");
  const spaces = await repository.listSpaces();
  const resolvedSpace = spaces.find((item) => item.id === category.spaceId);
  if (!resolvedSpace) throw new LlmPlaybookError(404, "플레이북을 찾을 수 없습니다.");
  const documents = await repository.listDocumentsByTopic(topic.id);
  const node = (current: typeof playbookDocuments.$inferSelect): Record<string, unknown> => ({
    ...documentResponse(current),
    children: documents.filter((child) => child.parentId === current.id).map(node),
  });
  const current = documents.find((item) => item.id === documentId);
  if (!current) throw new LlmPlaybookError(404, "문서를 찾을 수 없습니다.");
  return { spaceCode: resolvedSpace.code, spaceName: resolvedSpace.name, categoryId: category.id, categoryTitle: category.title, topicId: topic.id, topicTitle: topic.title, document: node(current) };
}

export async function createLlmStructure(spaceCode: string, categoryTitle: string, topicTitles: string[]) {
  const space = await repository.findSpaceByCode(spaceCode.trim().toUpperCase());
  if (!space) throw new LlmPlaybookError(404, "플레이북을 찾을 수 없습니다.");
  const category = await repository.insertCategory(space.id, categoryTitle.trim(), await repository.countCategoriesBySpace(space.id));
  const topics = [];
  for (const [index, title] of topicTitles.map((item) => item.trim()).filter(Boolean).entries()) {
    const topic = await repository.insertTopic(category.id, title, index);
    topics.push({ ...topic, documents: [] });
  }
  return { category: { ...category, topics }, topics };
}

// 기존 1차 메뉴 아래에 2차 주제를 추가할 때는 구조를 중복 생성하지 않는다.
export async function createLlmTopic(categoryId: number, title: string) {
  const category = await repository.findCategoryById(categoryId);
  if (!category) throw new LlmPlaybookError(404, "1차 메뉴를 찾을 수 없습니다.");
  const normalizedTitle = title.trim();
  if (!normalizedTitle) throw new LlmPlaybookError(400, "2차 주제 제목이 필요합니다.");
  const topics = (await repository.listAllTopics()).filter((topic) => topic.categoryId === categoryId);
  if (topics.some((topic) => topic.title === normalizedTitle)) {
    throw new LlmPlaybookError(409, "같은 이름의 2차 주제가 이미 있습니다.");
  }
  return { ...(await repository.insertTopic(categoryId, normalizedTitle, topics.length)), documents: [] };
}

export async function createLlmDocument(topicId: number, title: string, content: string, parentId: number | null) {
  const topic = await repository.findTopicById(topicId);
  if (!topic) throw new LlmPlaybookError(404, "2차 주제를 찾을 수 없습니다.");
  if (parentId !== null) {
    const parent = await repository.findParentDocument(parentId, topicId);
    if (!parent) throw new LlmPlaybookError(400, "같은 주제의 상위 문서만 지정할 수 있습니다.");
  }
  const siblings = await repository.countDocumentsByTopic(topicId);
  const orderIdx = siblings.filter((document) => document.parentId === parentId).length;
  const now = new Date().toISOString();
  const document = await repository.createDocument(topicId, title.trim(), parentId, null, content, orderIdx);
  return documentResponse(document);
}

export async function updateLlmDocument(documentId: number, title: string | undefined, content: string, expectedVersion: number | undefined, parentId: number | null | undefined) {
  const current = await llmDocument(documentId);
  if (expectedVersion !== undefined && current.version !== expectedVersion) throw new LlmPlaybookError(409, "문서 version이 변경되었습니다. 최신 문서를 다시 조회하세요.");
  if (parentId !== undefined && parentId !== null) {
    if (parentId === documentId) throw new LlmPlaybookError(400, "문서 자신을 상위 문서로 지정할 수 없습니다.");
    const parent = await repository.findParentDocument(parentId, current.topicId);
    if (!parent) throw new LlmPlaybookError(400, "같은 주제의 상위 문서만 지정할 수 있습니다.");
  }
  const updated = await repository.updateDocument(documentId, {
    title: title?.trim() || current.title,
    content,
    parentId: parentId === undefined ? current.parentId : parentId,
    version: current.version + 1,
  });
  return documentResponse(updated!);
}

export async function deleteLlmDocument(documentId: number) {
  const targets = await repository.findDocumentTreeIds(documentId);
  if (!targets) throw new LlmPlaybookError(404, "문서를 찾을 수 없습니다.");
  await repository.deleteDocumentTree(targets);
}

// 로컬 LLM 관리 API에서도 메뉴 구조를 정리할 수 있도록 1차 메뉴를 함께 삭제한다.
export async function deleteLlmCategory(categoryId: number) {
  if (!Number.isInteger(categoryId)) throw new LlmPlaybookError(400, "1차 메뉴 ID가 올바르지 않습니다.");
  const deleted = await repository.deleteCategory(categoryId);
  if (!deleted) throw new LlmPlaybookError(404, "1차 메뉴를 찾을 수 없습니다.");
}

// 2차 메뉴 삭제는 연결된 본문 문서와 댓글까지 정리한다.
export async function deleteLlmTopic(topicId: number) {
  if (!Number.isInteger(topicId)) throw new LlmPlaybookError(400, "2차 주제 ID가 올바르지 않습니다.");
  const deleted = await repository.deleteTopic(topicId);
  if (!deleted) throw new LlmPlaybookError(404, "2차 주제를 찾을 수 없습니다.");
}

export async function reorderLlmDocuments(topicId: number, ids: number[], parentId: number | null) {
  const documents = await repository.countDocumentsByTopic(topicId);
  const siblings = documents.filter((document) => document.parentId === parentId);
  const siblingIds = new Set(siblings.map((document) => document.id));
  if (ids.length !== siblings.length || ids.some((id) => !siblingIds.has(id))) throw new LlmPlaybookError(400, "같은 상위 문서 아래의 전체 문서 ID를 전달해야 합니다.");
  const now = new Date().toISOString();
  for (const [orderIdx, id] of ids.entries()) await repository.updateDocumentOrder(id, orderIdx, now);
}

export async function llmSamples() {
  const documents = await repository.listSampleDocuments();
  return documents.map((document) => ({ sampleKey: document.sampleKey, documentId: document.id, topicId: document.topicId, title: document.title, content: document.content, version: document.version, updatedAt: document.updatedAt }));
}

export async function llmSample(sampleKey: string) {
  const document = await repository.findSampleDocument(sampleKey.trim().toUpperCase());
  if (!document) throw new LlmPlaybookError(404, "샘플 문서를 찾을 수 없습니다.");
  const documents = await repository.listDocumentsByTopic(document.topicId);
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
