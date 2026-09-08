import { useMemo, useState } from "react";
import ApiGuideDialogShell from "./ApiGuideDialogShell";

type DocumentContentApiDialogProps = {
  documentId: number;
  documentTitle: string;
  onClose: () => void;
};

/** 현재 본문 자체를 읽고 고치는 API 지시문을 만든다. 하위 문서 API와 섞지 않는다. */
export default function DocumentContentApiDialog({
  documentId,
  documentTitle,
  onClose,
}: DocumentContentApiDialogProps) {
  const [additionalInstruction, setAdditionalInstruction] = useState("");
  const base = "/api/llm/hospital-playbook";
  const instruction = useMemo(
    () => [
      "다음 본문 문서를 수정해 주세요.",
      "",
      "## 작업 대상",
      `- 문서: ${documentTitle}`,
      `- documentId: ${documentId}`,
      "",
      "## 작업 방식",
      "먼저 현재 문서와 최신 version을 조회합니다. 수정할 때는 조회 결과의 version을 expectedVersion으로 사용하고, parentId는 조회 결과의 값을 그대로 유지합니다.",
      ...(additionalInstruction.trim()
        ? ["", "## 추가 지시", additionalInstruction.trim()]
        : []),
      "",
      "## 현재 본문 조회",
      `GET ${base}/documents/${documentId}`,
      "",
      "## 현재 본문 수정",
      `PATCH ${base}/documents/${documentId}/content`,
      "Content-Type: application/json",
      "",
      "{",
      '  "title": "수정 제목",',
      '  "content": "Lexical JSON 문자열",',
      '  "expectedVersion": "GET으로 확인한 최신 version",',
      '  "parentId": "GET으로 확인한 현재 parentId"',
      "}",
      "",
      "409 충돌이면 문서를 다시 조회해 최신 version으로 다시 요청합니다.",
      "하위 문서를 만들거나 parentId를 현재 documentId로 바꾸지 않습니다.",
    ].join("\n"),
    [additionalInstruction, base, documentId, documentTitle],
  );

  return (
    <ApiGuideDialogShell
      title="본문 편집 API"
      description={`본문 ‘${documentTitle}’ 자체를 조회·수정합니다. 하위 문서 작업은 포함하지 않습니다.`}
      copyText={instruction}
      onClose={onClose}
      ariaLabel="본문 편집 API"
      copyLabel="전체 복사"
      footer="수정 전 조회한 parentId를 그대로 보내 문서 위치가 바뀌지 않게 합니다."
    >
      <div className="grid min-h-full min-w-0 grid-cols-1 lg:grid-cols-2">
        <section className="min-h-0 overflow-auto border-b border-surface-border-soft bg-surface-raised p-5 lg:border-b-0 lg:border-r">
          <label className="block">
            <span className="mb-1 block text-sm font-black text-text-primary">추가 지시</span>
            <span className="mb-2 block text-[11px] font-semibold leading-5 text-text-muted">본문에 반영할 범위·표현·검증 조건을 적으면 오른쪽 작업 지시에 포함됩니다.</span>
            <textarea
              value={additionalInstruction}
              onChange={(event) => setAdditionalInstruction(event.target.value)}
              rows={5}
              placeholder="예: saveAndFlush 설명을 Repository 문서 맨 아래로 옮기고, 중복 설명은 제거하세요."
              className="w-full resize-y rounded-lg border border-surface-border-soft bg-surface p-3 text-xs leading-5 text-text-primary outline-none focus:border-brand-border"
            />
          </label>

          <div className="mt-5">
            <h3 className="text-sm font-black text-text-primary">본문 편집 API</h3>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-text-muted">현재 문서 자체만 다룹니다. 하위 문서 생성 API는 포함하지 않습니다.</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-surface-border-soft">
              <div className="grid grid-cols-[72px_minmax(0,1fr)] border-b border-surface-border-soft bg-surface-muted px-3 py-2 text-[11px] font-black text-text-secondary">
                <span>방식</span><span>API와 하는 일</span>
              </div>
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 border-b border-surface-border-soft px-3 py-3 text-xs">
                <span className="h-fit w-fit rounded bg-emerald-100 px-1.5 py-1 font-mono text-[10px] font-black text-emerald-700">GET</span>
                <div><code className="break-all font-mono text-[11px] text-text-primary">{base}/documents/{documentId}</code><p className="mt-1 font-semibold leading-5 text-text-muted">본문, 최신 version, 현재 parentId를 확인합니다.</p></div>
              </div>
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 px-3 py-3 text-xs">
                <span className="h-fit w-fit rounded bg-amber-100 px-1.5 py-1 font-mono text-[10px] font-black text-amber-700">PATCH</span>
                <div><code className="break-all font-mono text-[11px] text-text-primary">{base}/documents/{documentId}/content</code><p className="mt-1 font-semibold leading-5 text-text-muted">최신 version과 기존 parentId를 유지해 제목·Lexical 본문을 수정합니다.</p></div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-900">
            <strong>위치 유지:</strong> PATCH 요청의 parentId는 조회한 값을 그대로 사용합니다. 현재 문서 ID를 넣거나 null로 바꾸지 않습니다.
          </div>
        </section>

        <section aria-label="Codex 작업 지시 미리보기" className="flex min-h-0 flex-col bg-surface-muted/20 p-5">
          <div><h3 className="text-sm font-black text-text-primary">Codex에 보낼 작업 지시</h3><p className="mt-1 text-[11px] font-semibold text-text-muted">추가 지시를 입력하면 즉시 반영됩니다.</p></div>
          <textarea
            readOnly
            value={instruction}
            aria-label="본문 편집 작업 지시"
            className="mt-3 min-h-[560px] flex-1 resize-y rounded-lg border border-surface-border-soft bg-surface-raised p-3 font-mono text-[11px] leading-5 text-text-secondary outline-none"
          />
        </section>
      </div>
    </ApiGuideDialogShell>
  );
}
