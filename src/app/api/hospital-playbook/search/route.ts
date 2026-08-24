import { and, eq, like } from "drizzle-orm";
import { NextResponse } from "next/server";
import { playbookCategories, playbookDocuments, playbookSpaces, playbookTopics } from "@/db/schema";
import { db } from "@/server/database";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const keyword = (params.get("q") ?? "").trim();
  const spaceCode = params.get("spaceCode");
  if (!keyword) return NextResponse.json([]);

  const condition = spaceCode
    ? and(like(playbookDocuments.title, `%${keyword}%`), eq(playbookSpaces.code, spaceCode))
    : like(playbookDocuments.title, `%${keyword}%`);
  const rows = await db.select({ document: playbookDocuments, topic: playbookTopics, category: playbookCategories, space: playbookSpaces })
    .from(playbookDocuments)
    .innerJoin(playbookTopics, eq(playbookDocuments.topicId, playbookTopics.id))
    .innerJoin(playbookCategories, eq(playbookTopics.categoryId, playbookCategories.id))
    .innerJoin(playbookSpaces, eq(playbookCategories.spaceId, playbookSpaces.id))
    .where(condition);

  return NextResponse.json(rows.map(({ document, topic, category, space }) => ({
    id: document.id, title: document.title, status: document.status, updatedAt: document.updatedAt,
    topicId: topic.id, topicTitle: topic.title, categoryId: category.id, categoryTitle: category.title, spaceCode: space.code,
  })));
}
