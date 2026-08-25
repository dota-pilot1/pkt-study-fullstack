import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { renameCategory } from "@/server/modules/playbook/playbook-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext<"/api/hospital-playbook/categories/[categoryId]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const id = Number((await context.params).categoryId);
  const body = await request.json().catch(() => null) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 300) : "";
  if (!Number.isInteger(id) || !title) return NextResponse.json({ message: "메뉴 이름이 필요합니다." }, { status: 400 });
  const category = await renameCategory(id, title);
  return category ? NextResponse.json(category) : NextResponse.json({ message: "메뉴를 찾을 수 없습니다." }, { status: 404 });
}
