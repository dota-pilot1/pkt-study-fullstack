import { NextResponse } from "next/server";
import { searchDocuments } from "@/server/modules/playbook/playbook-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const keyword = (params.get("q") ?? "").trim();
  const spaceCode = params.get("spaceCode");
  if (!keyword) return NextResponse.json([]);

  return NextResponse.json(await searchDocuments(keyword, spaceCode));
}
