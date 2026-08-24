import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { deleteTopic, renameTopic } from "@/server/playbook";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext<"/api/hospital-playbook/topics/[topicId]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const id = Number((await context.params).topicId);
  const body = await request.json().catch(() => null) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 300) : "";
  if (!Number.isInteger(id) || !title) return NextResponse.json({ message: "주제 이름이 필요합니다." }, { status: 400 });
  const topic = await renameTopic(id, title);
  return topic ? NextResponse.json(topic) : NextResponse.json({ message: "주제를 찾을 수 없습니다." }, { status: 404 });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/hospital-playbook/topics/[topicId]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const id = Number((await context.params).topicId);
  if (!Number.isInteger(id)) return NextResponse.json({ message: "주제 ID가 올바르지 않습니다." }, { status: 400 });
  const deleted = await deleteTopic(id);
  return deleted ? new NextResponse(null, { status: 204 }) : NextResponse.json({ message: "주제를 찾을 수 없습니다." }, { status: 404 });
}
