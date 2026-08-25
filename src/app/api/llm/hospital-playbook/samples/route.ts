import { handleLlmRequest, llmSamples } from "@/server/llm-playbook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleLlmRequest(request, llmSamples);
}
