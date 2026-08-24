import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { playbookDocumentComments, playbookDocuments } from "@/db/schema";
import { db } from "@/server/database";
import { getDocument } from "@/server/playbook";
import { requireUser } from "@/server/auth";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/hospital-playbook/documents/[id]">) {
  const document = await getDocument(Number((await context.params).id));
  return document ? NextResponse.json(document) : NextResponse.json({ message: "문서를 찾을 수 없습니다." }, { status: 404 });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/hospital-playbook/documents/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const id = Number((await context.params).id);
  const documents = await db.select({ id: playbookDocuments.id, parentId: playbookDocuments.parentId })
    .from(playbookDocuments);
  if (!documents.some((document) => document.id === id)) {
    return NextResponse.json({ message: "문서를 찾을 수 없습니다." }, { status: 404 });
  }

  const ids = new Set<number>([id]);
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

  const targetIds = [...ids];
  await db.delete(playbookDocumentComments).where(inArray(playbookDocumentComments.documentId, targetIds));
  await db.delete(playbookDocuments).where(inArray(playbookDocuments.id, targetIds));
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(request: Request, context: RouteContext<"/api/hospital-playbook/documents/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const id = Number((await context.params).id);
  const body = await request.json().catch(() => null) as { title?: unknown; content?: unknown } | null;
  const patch: { title?: string; content?: string; updatedAt: string; version?: number } = { updatedAt: new Date().toISOString() };
  if (typeof body?.title === "string") patch.title = body.title.trim().slice(0, 300);
  if (typeof body?.content === "string") patch.content = body.content;
  const current = await getDocument(id);
  if (!current) return NextResponse.json({ message: "문서를 찾을 수 없습니다." }, { status: 404 });
  patch.version = current.version + 1;
  await db.update(playbookDocuments).set(patch).where(eq(playbookDocuments.id, id));
  return NextResponse.json(await getDocument(id));
}
