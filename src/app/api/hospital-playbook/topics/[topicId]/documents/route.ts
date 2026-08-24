import { NextResponse } from "next/server";
import { playbookDocuments } from "@/db/schema";
import { db } from "@/server/database";
import { requireUser } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/hospital-playbook/topics/[topicId]/documents">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const topicId = Number((await context.params).topicId);
  const body = await request.json().catch(() => null) as { title?: unknown; parentId?: unknown } | null;
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 300) : "새 문서";
  const now = new Date().toISOString();
  const [document] = await db.insert(playbookDocuments).values({ topicId, title, parentId: typeof body?.parentId === "number" ? body.parentId : null, content: JSON.stringify({ root: { children: [], direction: null, format: "", indent: 0, type: "root", version: 1 } }), createdBy: user.id, createdAt: now, updatedAt: now }).returning();
  return NextResponse.json(document, { status: 201 });
}
