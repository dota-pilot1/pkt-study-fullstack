import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { playbookDocuments } from "@/db/schema";
import { db } from "@/server/database";
import { requireUser } from "@/server/auth";

export const runtime = "nodejs";

const TOKEN_TTL_MS = 30 * 60 * 1000;

export async function POST(_request: Request, context: RouteContext<"/api/hospital-playbook/documents/[id]/ai-edit-token">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const documentId = Number((await context.params).id);
  if (!Number.isInteger(documentId)) return NextResponse.json({ message: "문서 ID가 올바르지 않습니다." }, { status: 400 });

  const document = await db.select({ id: playbookDocuments.id, createdBy: playbookDocuments.createdBy, version: playbookDocuments.version })
    .from(playbookDocuments)
    .where(eq(playbookDocuments.id, documentId))
    .limit(1);
  const current = document[0];
  if (!current) return NextResponse.json({ message: "문서를 찾을 수 없습니다." }, { status: 404 });

  const isAdmin = user.role.code === "ROLE_ADMIN";
  if (!isAdmin && current.createdBy !== user.id) {
    return NextResponse.json({ message: "작성자 또는 관리자만 발급할 수 있습니다." }, { status: 403 });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  await db.update(playbookDocuments)
    .set({ aiEditTokenHash: tokenHash, aiEditTokenExpiresAt: expiresAt, aiEditTokenUsedAt: null })
    .where(eq(playbookDocuments.id, documentId));

  return NextResponse.json({ token, documentId, expectedVersion: current.version, expiresAt });
}
