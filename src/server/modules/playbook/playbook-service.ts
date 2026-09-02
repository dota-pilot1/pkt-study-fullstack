import "server-only";

import { createHash, randomBytes } from "node:crypto";
import * as repository from "./playbook-repository";

export class PlaybookServiceError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function getDocument(id: number) {
  return repository.findDocument(id);
}

export const listSpaces = repository.listSpaces;
export const getTree = repository.getTree;
export const createCategory = repository.createCategory;
export const createTopic = repository.createTopic;
export const renameCategory = repository.renameCategory;
export const renameTopic = repository.renameTopic;
export const reorderCategories = repository.reorderCategories;
export const reorderTopics = repository.reorderTopics;

const SYSTEM_GALLERY_SPACES = new Set(["UI_NAV", "UI_FORM", "UI_LAYOUT", "UI_STATE"]);

async function isProtectedGalleryTopic(topicId: number) {
  const topic = await repository.findTopicById(topicId);
  if (!topic) return false;
  const category = await repository.findCategoryById(topic.categoryId);
  if (!category) return false;
  const space = await repository.findSpaceById(category.spaceId);
  return Boolean(space && SYSTEM_GALLERY_SPACES.has(space.code));
}

export async function deleteCategory(id: number) {
  const category = await repository.findCategoryById(id);
  if (!category) return false;
  const space = await repository.findSpaceById(category.spaceId);
  if (space && SYSTEM_GALLERY_SPACES.has(space.code)) throw new PlaybookServiceError(403, "공통 UI 시스템 갤러리의 영역은 삭제할 수 없습니다.");
  return repository.deleteCategory(id);
}

export async function deleteTopic(id: number) {
  if (await isProtectedGalleryTopic(id)) throw new PlaybookServiceError(403, "공통 UI 시스템 갤러리의 주제는 삭제할 수 없습니다.");
  return repository.deleteTopic(id);
}

export async function createDocument(topicId: number, title: string, parentId: number | null, createdBy: number | null) {
  return repository.createDocument(topicId, title, parentId, createdBy);
}

export async function updateDocument(id: number, title: string | undefined, content: string | undefined) {
  const current = await repository.findDocument(id);
  if (!current) throw new PlaybookServiceError(404, "문서를 찾을 수 없습니다.");
  return repository.updateDocument(id, {
    ...(title === undefined ? {} : { title: title.trim().slice(0, 300) }),
    ...(content === undefined ? {} : { content }),
    version: current.version + 1,
  });
}

export async function deleteDocumentTree(id: number) {
  const document = await repository.findDocument(id);
  if (document?.parentId === null && await isProtectedGalleryTopic(document.topicId)) {
    throw new PlaybookServiceError(403, "공통 UI 시스템 갤러리의 대표 문서는 삭제할 수 없습니다.");
  }
  const ids = await repository.findDocumentTreeIds(id);
  if (!ids) throw new PlaybookServiceError(404, "문서를 찾을 수 없습니다.");
  await repository.deleteDocumentTree(ids);
}

export async function listComments(documentId: number) {
  return repository.listComments(documentId);
}

export async function createComment(input: Parameters<typeof repository.createComment>[0]) {
  return repository.createComment(input);
}

export async function updateComment(id: number, title: string | null, content: string) {
  const comment = await repository.updateComment(id, title, content);
  if (!comment) throw new PlaybookServiceError(404, "댓글을 찾을 수 없습니다.");
  return comment;
}

export async function deleteComment(id: number) {
  await repository.deleteComment(id);
}

export async function issueAiEditToken(id: number, userId: number, isAdmin: boolean) {
  const document = await repository.findDocument(id);
  if (!document) throw new PlaybookServiceError(404, "문서를 찾을 수 없습니다.");
  if (!isAdmin && document.createdBy !== userId) {
    throw new PlaybookServiceError(403, "작성자 또는 관리자만 발급할 수 있습니다.");
  }
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await repository.issueAiEditToken(id, tokenHash, expiresAt);
  return { token, documentId: id, expectedVersion: document.version, expiresAt };
}

export async function searchDocuments(keyword: string, spaceCode: string | null) {
  const rows = await repository.searchDocuments(keyword, spaceCode);
  return rows.map(({ document, topic, category, space }) => ({
    id: document.id, title: document.title, status: document.status, updatedAt: document.updatedAt,
    topicId: topic.id, topicTitle: topic.title, categoryId: category.id, categoryTitle: category.title, spaceCode: space.code,
  }));
}
