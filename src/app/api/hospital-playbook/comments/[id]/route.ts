import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { playbookDocumentComments } from "@/db/schema";
import { db } from "@/server/database";
import { requireUser } from "@/server/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext<"/api/hospital-playbook/comments/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const id = Number((await context.params).id);
  const body = await request.json().catch(() => null) as { title?: unknown; content?: unknown } | null;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ message: "댓글 내용이 필요합니다." }, { status: 400 });
  const [comment] = await db.update(playbookDocumentComments)
    .set({ title: typeof body?.title === "string" ? body.title.trim() || null : null, content, updatedAt: new Date().toISOString() })
    .where(eq(playbookDocumentComments.id, id))
    .returning();
  if (!comment) return NextResponse.json({ message: "댓글을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(comment);
}

export async function DELETE(_request: Request, context: RouteContext<"/api/hospital-playbook/comments/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  await db.delete(playbookDocumentComments).where(eq(playbookDocumentComments.id, Number((await context.params).id)));
  return new NextResponse(null, { status: 204 });
}
