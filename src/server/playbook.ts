import "server-only";

import { asc, eq } from "drizzle-orm";
import { playbookCategories, playbookDocuments, playbookSpaces, playbookTopics } from "@/db/schema";
import { db } from "@/server/database";

export async function listSpaces() {
  return db.select().from(playbookSpaces).orderBy(asc(playbookSpaces.id));
}

export async function getTree(spaceCode: string) {
  const spaces = await db.select().from(playbookSpaces).where(eq(playbookSpaces.code, spaceCode)).limit(1);
  if (!spaces[0]) return null;
  const categories = await db.select().from(playbookCategories).where(eq(playbookCategories.spaceId, spaces[0].id)).orderBy(asc(playbookCategories.orderIdx));
  const topics = await db.select().from(playbookTopics).orderBy(asc(playbookTopics.orderIdx));
  const documents = await db.select().from(playbookDocuments).orderBy(asc(playbookDocuments.orderIdx));
  return { ...spaces[0], categories: categories.map((category) => ({ ...category, topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id) })) })) };
}

export async function getDocument(id: number) {
  const result = await db.select().from(playbookDocuments).where(eq(playbookDocuments.id, id)).limit(1);
  return result[0] ?? null;
}
