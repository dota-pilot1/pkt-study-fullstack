import { deleteLlmTopic, handleLlmRequest, llmTopic } from "@/server/llm-playbook";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/llm/hospital-playbook/topics/[topicId]">) {
  return handleLlmRequest(request, async () => llmTopic(Number((await context.params).topicId)));
}

export async function DELETE(request: Request, context: RouteContext<"/api/llm/hospital-playbook/topics/[topicId]">) {
  return handleLlmRequest(request, async () => deleteLlmTopic(Number((await context.params).topicId)), 204);
}
