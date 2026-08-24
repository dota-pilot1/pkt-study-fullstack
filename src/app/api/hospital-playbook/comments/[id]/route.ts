import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { playbookDocumentComments } from "@/db/schema";
import { db } from "@/server/database";
import { requireUser } from "@/server/auth";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: RouteContext<"/api/hospital-playbook/comments/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  await db.delete(playbookDocumentComments).where(eq(playbookDocumentComments.id, Number((await context.params).id)));
  return new NextResponse(null, { status: 204 });
}
