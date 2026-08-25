import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { createDocument } from "@/server/modules/playbook/playbook-service";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/hospital-playbook/topics/[topicId]/documents">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const topicId = Number((await context.params).topicId);
  const body = await request.json().catch(() => null) as { title?: unknown; parentId?: unknown } | null;
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 300) : "새 문서";
  const document = await createDocument(topicId, title, typeof body?.parentId === "number" ? body.parentId : null, user.id);
  return NextResponse.json(document, { status: 201 });
}
