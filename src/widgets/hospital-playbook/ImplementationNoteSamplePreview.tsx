import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import { playbookApi, type PlaybookSampleKey } from "../../features/hospital-playbook/api";

type SampleTab = "api" | "frontend";
const sampleKeys = {
  api: "API_IMPLEMENTATION",
  frontend: "FRONTEND_IMPLEMENTATION",
} satisfies Record<SampleTab, PlaybookSampleKey>;

/** 같은 Next.js 앱의 구현을 기준으로 정리한 API·프론트 노트 모범 예시. */
export default function ImplementationNoteSamplePreview({ minHeight = "620px" }: { minHeight?: string }) {
  const [tab, setTab] = useState<SampleTab>("api");
  const sampleKey = sampleKeys[tab];
  const sample = useQuery({
    queryKey: ["hospital-playbook", "sample", sampleKey],
    queryFn: () => playbookApi.sampleDocument(sampleKey),
  });

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-surface-border-soft bg-surface-raised px-4 pt-3" role="tablist" aria-label="구현 노트 모범 예시 종류">
        <button type="button" onClick={() => setTab("api")} className={`border-b-2 px-3 pb-2 text-xs font-black ${tab === "api" ? "border-brand-primary text-brand-primary" : "border-transparent text-text-muted"}`} aria-selected={tab === "api"} role="tab">
          API 구현 노트 정리 예시
        </button>
        <button type="button" onClick={() => setTab("frontend")} className={`border-b-2 px-3 pb-2 text-xs font-black ${tab === "frontend" ? "border-brand-primary text-brand-primary" : "border-transparent text-text-muted"}`} aria-selected={tab === "frontend"} role="tab">
          프론트 노트 정리 예시
        </button>
      </div>
      <div className="min-h-0 p-4">
        {sample.isLoading ? (
          <div className="grid min-h-[320px] place-items-center rounded-lg border border-surface-border-soft bg-surface-muted text-sm font-bold text-text-muted">샘플 노트를 불러오는 중입니다.</div>
        ) : sample.isError || !sample.data ? (
          <div role="alert" className="grid min-h-[320px] place-items-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 text-center text-sm font-bold text-destructive">구현 노트 기준 샘플을 불러오지 못했습니다. 내부 샘플 데이터를 확인해 주세요.</div>
        ) : (
          <LexicalEditor key={`${sampleKey}-${sample.data.version}`} initialState={sample.data.content} onChange={() => undefined} readOnly minHeight={minHeight} scrollable />
        )}
      </div>
    </div>
  );
}
