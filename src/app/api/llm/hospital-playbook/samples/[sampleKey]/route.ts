import { handleLlmRequest, llmSample } from "@/server/llm-playbook";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/llm/hospital-playbook/samples/[sampleKey]">) {
  return handleLlmRequest(request, async () => llmSample((await context.params).sampleKey));
}
