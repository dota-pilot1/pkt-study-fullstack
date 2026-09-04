import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { PlaybookSampleKey } from "../../features/hospital-playbook/api";
import { getApiBase } from "../../shared/api/client";
import { copyToClipboard } from "../../shared/lib/clipboard";
import { useToast } from "../../shared/ui/toast";
import ApiGuideDialogShell from "./ApiGuideDialogShell";
import ImplementationNoteSamplePreview from "./ImplementationNoteSamplePreview";

type HttpMethod = "GET" | "POST" | "PATCH";
type ApiItem = { id: string; label: string; method: HttpMethod; endpoint: string; summary: string; content: string };
type DocumentContextApiDialogProps = { documentId: number; topicId: number; documentTitle: string; onClose: () => void };
type ApiPreset = "default" | "basic-edit" | "custom";

const methodClass: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PATCH: "bg-amber-100 text-amber-700",
};

export default function DocumentContextApiDialog({ documentId, topicId, documentTitle, onClose }: DocumentContextApiDialogProps) {
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<ApiPreset>("default");
  const [selectedSampleKeys, setSelectedSampleKeys] = useState<PlaybookSampleKey[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCopied, setSelectedCopied] = useState(false);
  const base = "/api/llm/hospital-playbook";
  const items = useMemo<ApiItem[]>(() => [
    {
      id: "get-context", label: "본문·하위 문서 전체 조회", method: "GET", endpoint: `${base}/documents/${documentId}/context`,
      summary: "현재 본문과 모든 하위 문서를 트리로 읽고, 중복 생성 여부와 최신 version을 확인합니다.",
      content: `GET ${base}/documents/${documentId}/context\n\n현재 본문(${documentTitle})과 모든 하위 문서를 children 트리로 조회합니다. 새 하위 문서를 만들기 전에 먼저 사용합니다.`,
    },
    {
      id: "get-child", label: "하위 문서 하나 조회", method: "GET", endpoint: `${base}/documents/{childDocumentId}`,
      summary: "선택한 하위 문서의 제목·본문·parentId·최신 version을 읽습니다.",
      content: `GET ${base}/documents/{childDocumentId}\n\n{childDocumentId}에는 context 응답의 children.id를 넣습니다. 수정 전 version과 parentId를 확인합니다.`,
    },
    {
      id: "create-child", label: "하위 문서 추가", method: "POST", endpoint: `${base}/topics/${topicId}/children`,
      summary: "현재 본문 아래에 실제 코드·명령어·검증을 기록할 상세 문서를 만듭니다.",
      content: `POST ${base}/topics/${topicId}/children\nContent-Type: application/json\n\n{\n  "parentId": ${documentId},\n  "title": "TODO 1. Docker PostgreSQL 실행",\n  "content": "Lexical JSON 문자열"\n}\n\nparentId에는 현재 본문 문서 ID ${documentId}를 사용합니다.`,
    },
    {
      id: "patch-child", label: "하위 문서 편집", method: "PATCH", endpoint: `${base}/documents/{childDocumentId}/content`,
      summary: "조회한 최신 expectedVersion으로 하위 문서의 제목과 Lexical 본문을 저장합니다.",
      content: `PATCH ${base}/documents/{childDocumentId}/content\nContent-Type: application/json\n\n{\n  "title": "수정 제목",\n  "content": "Lexical JSON 문자열",\n  "expectedVersion": "GET으로 확인한 최신 version",\n  "parentId": ${documentId}\n}\n\n409 충돌이면 하위 문서를 다시 GET한 뒤 최신 version으로 다시 요청합니다.`,
    },
    {
      id: "get-samples", label: "작성 샘플 목록 조회", method: "GET", endpoint: `${base}/samples`,
      summary: "등록된 본문·하위 문서 작성 샘플의 제목과 sampleKey 목록을 읽습니다.",
      content: `GET ${base}/samples\n\n등록된 샘플의 sampleKey와 제목을 확인합니다. 실제 샘플 본문은 단건 조회 API로 읽습니다.`,
    },
    {
      id: "get-sample", label: "작성 샘플 하나 조회", method: "GET", endpoint: `${base}/samples/{sampleKey}`,
      summary: "선택한 샘플의 Lexical 본문, 제목, 최신 version과 하위 샘플을 읽습니다.",
      content: `GET ${base}/samples/{sampleKey}\n\n{sampleKey}에는 목록 조회에서 확인한 키를 넣습니다. 현재 작업에 맞는 Lexical 구조를 참고합니다.`,
    },
    {
      id: "create-sample", label: "작성 샘플 등록", method: "POST", endpoint: `${base}/samples`,
      summary: "반복해서 쓸 본문 또는 하위 문서 작성 형식을 새 샘플로 등록합니다.",
      content: `POST ${base}/samples\nContent-Type: application/json\n\n{\n  "sampleKey": "DB_SETUP_IMPLEMENTATION",\n  "title": "DB 설정 구현 기록 샘플",\n  "content": "Lexical JSON 문자열"\n}\n\nsampleKey는 대문자 스네이크 케이스로 정하고, 실제 작업 문서가 아닌 재사용 가능한 형식만 등록합니다.`,
    },
    {
      id: "patch-sample", label: "작성 샘플 편집", method: "PATCH", endpoint: `${base}/samples/{sampleKey}`,
      summary: "샘플의 키·제목·Lexical 본문을 최신 version 기준으로 수정합니다.",
      content: `PATCH ${base}/samples/{sampleKey}\nContent-Type: application/json\n\n{\n  "sampleKey": "DB_SETUP_IMPLEMENTATION",\n  "title": "DB 설정 구현 기록 샘플",\n  "content": "Lexical JSON 문자열",\n  "expectedVersion": <GET으로 확인한 최신 version>\n}\n\n수정 전 반드시 단건 조회로 최신 version을 확인합니다.`,
    },
  ], [base, documentId, documentTitle, topicId]);
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const allSelected = selectedIds.length === items.length;
  const fullUrl = (endpoint: string) => `${window.location.origin}${getApiBase()}${endpoint}`;
  const selectedGuide = [
    "# 하위 문서 작업 API",
    "",
    `topicId: ${topicId}`,
    `parentDocumentId: ${documentId}`,
    `parentDocumentTitle: ${documentTitle}`,
    "",
    ...selectedItems.flatMap((item) => [`# ${item.label}`, "", item.content, ""]),
    ...selectedSampleKeys.flatMap((sampleKey) => ["# 작성 샘플 참고", "", `GET ${base}/samples/${sampleKey}`, "", `${sampleKey} 샘플의 Lexical 작성 구조를 조회합니다.`, ""]),
  ].join("\n");

  const applyPreset = (nextPreset: Exclude<ApiPreset, "custom">) => {
    setPreset(nextPreset);
    setSelectedIds(nextPreset === "basic-edit" ? ["get-context", "get-child", "create-child", "patch-child"] : []);
  };
  const toggleItem = (id: string) => {
    setPreset("custom");
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const toggleAll = () => {
    setPreset("custom");
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  };
  const copyItem = async (item: ApiItem) => {
    try {
      await copyToClipboard([`${item.method} ${fullUrl(item.endpoint)}`, "", item.summary].join("\n"));
      setCopiedId(item.id);
      showToast("API 전체 URL과 설명을 복사했습니다.");
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      showToast("클립보드에 복사하지 못했습니다.", "error");
    }
  };
  const copySelected = async () => {
    if (selectedItems.length === 0) {
      showToast("복사할 API를 선택하세요.", "info");
      return;
    }
    const text = selectedItems.map((item) => [`# ${item.label}`, `${item.method} ${fullUrl(item.endpoint)}`, "", item.summary].join("\n")).join("\n\n---\n\n");
    try {
      await copyToClipboard(text);
      setSelectedCopied(true);
      showToast("선택한 하위 문서 API를 복사했습니다.");
      window.setTimeout(() => setSelectedCopied(false), 1600);
    } catch {
      showToast("클립보드에 복사하지 못했습니다.", "error");
    }
  };

  return (
    <ApiGuideDialogShell
      title="하위 문서 작업 API"
      description={`본문 ‘${documentTitle}’ 아래의 구현 상세 문서를 조회·추가·편집합니다.`}
      copyText={selectedGuide}
      onClose={onClose}
      ariaLabel="하위 문서 작업 API"
      contentAriaLabel="하위 문서 API 선택"
      previewAriaLabel="하위 문서 작성 샘플 관리"
      previewTitle="하위 문서 작성 샘플"
      previewDescription="샘플을 조회하고, 재사용할 작성 형식은 등록·수정할 수 있습니다."
      preview={<ImplementationNoteSamplePreview selectedKeys={selectedSampleKeys} onSelectedKeysChange={setSelectedSampleKeys} />}
      copyLabel={`선택 항목 복사 (${selectedItems.length + selectedSampleKeys.length})`}
      footer="본문은 목표·범위·완료 조건만 관리합니다. 실제 구현 기록은 하위 문서에 작성합니다."
    >
      <div className="flex min-h-full min-w-0 flex-col bg-surface-raised p-5">
        <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
          <h3 className="text-base font-black text-text-primary">하위 문서 작업</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">필요한 API를 체크한 뒤 복사하세요. 각 행의 복사 버튼은 전체 URL과 사용 설명을 함께 복사합니다.</p>
        </div>
        <div className="mb-2 mt-4 flex items-center justify-between gap-3">
          <div className="flex rounded-lg border border-surface-border-soft bg-surface-muted p-1" role="group" aria-label="하위 문서 API 선택 프리셋">
            <button type="button" onClick={() => applyPreset("default")} className={`rounded-md px-3 py-1.5 text-[11px] font-black transition ${preset === "default" ? "bg-brand-primary text-white shadow-sm" : "text-text-muted hover:bg-white hover:text-text-primary"}`}>디폴트</button>
            <button type="button" onClick={() => applyPreset("basic-edit")} className={`rounded-md px-3 py-1.5 text-[11px] font-black transition ${preset === "basic-edit" ? "bg-brand-primary text-white shadow-sm" : "text-text-muted hover:bg-white hover:text-text-primary"}`}>기본 편집 (4)</button>
          </div>
          <button type="button" onClick={() => void copySelected()} className="ui-icon-button-brand h-8 gap-1.5 px-2.5 text-[11px] font-black">
            {selectedCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            선택 API 복사 ({selectedItems.length})
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-surface-border-soft">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="bg-surface-muted text-text-secondary">
              <tr>
                <th scope="col" className="w-12 px-3 py-3 text-center font-black"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="모든 API 선택" className="size-4 accent-brand-primary" /></th>
                <th scope="col" className="w-16 px-3 py-3 font-black">방식</th>
                <th scope="col" className="min-w-48 px-3 py-3 font-black">API</th>
                <th scope="col" className="min-w-52 px-3 py-3 font-black">하는 일</th>
                <th scope="col" className="w-16 px-3 py-3 text-center font-black">복사</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-surface-border-soft align-top hover:bg-surface-muted/60">
                  <td className="!align-middle px-3 py-3 text-center"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleItem(item.id)} aria-label={`${item.label} 선택`} className="size-4 accent-brand-primary" /></td>
                  <td className="px-3 py-3"><span className={`rounded px-1.5 py-1 font-mono text-[10px] font-black ${methodClass[item.method]}`}>{item.method}</span></td>
                  <td className="break-words px-3 py-3 font-mono text-[11px] leading-5 text-text-primary [overflow-wrap:anywhere]">{item.endpoint}</td>
                  <td className="px-3 py-3 font-semibold leading-5 text-text-muted">{item.summary}</td>
                  <td className="px-2 py-3 text-center"><button type="button" onClick={() => void copyItem(item)} aria-label={`${item.label} API URL과 설명 복사`} title="HTTP 메서드, 전체 URL, 설명 복사" className="ui-icon-button size-7 text-brand-primary">{copiedId === item.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ApiGuideDialogShell>
  );
}
