import { deleteLlmDocument, handleLlmRequest, llmDocument } from "@/server/llm-playbook";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/llm/hospital-playbook/documents/[id]">) {
  return handleLlmRequest(request, async () => llmDocument(Number((await context.params).id)));
}

export async function DELETE(request: Request, context: RouteContext<"/api/llm/hospital-playbook/documents/[id]">) {
  return handleLlmRequest(request, async () => deleteLlmDocument(Number((await context.params).id)), 204);
}
