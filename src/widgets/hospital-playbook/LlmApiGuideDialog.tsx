import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { PlaybookDomain, PlaybookSampleKey } from "../../features/hospital-playbook/api";
import { getApiBase } from "../../shared/api/client";
import { copyToClipboard } from "../../shared/lib/clipboard";
import { useToast } from "../../shared/ui/toast";
import ApiGuideDialogShell from "./ApiGuideDialogShell";
import ImplementationNoteSamplePreview from "./ImplementationNoteSamplePreview";

type CopyMode = "default" | "document" | "implementation" | "review" | "all";
type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
type ApiItem = { id: string; label: string; method: HttpMethod; endpoint: string; summary: string; content: string };

type LlmApiGuideDialogProps = {
  domain: PlaybookDomain;
  topicId?: number | null;
  parentDocumentId?: number | null;
  onClose: () => void;
};

const methodClass: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PATCH: "bg-amber-100 text-amber-700",
  DELETE: "bg-rose-100 text-rose-700",
};

const modes: Array<{ id: CopyMode; label: string; description: string }> = [
  { id: "default", label: "기본", description: "필요한 API만 직접 골라 LLM에 전달할 때" },
  { id: "document", label: "문서 작성", description: "정책·요구사항·설계 문서를 새로 쓰거나 고칠 때" },
  { id: "implementation", label: "구현 기록", description: "실제 API·프론트 구현 과정과 검증을 기록할 때" },
  { id: "review", label: "코드 리뷰", description: "기존 문서와 구현 맥락을 읽고 검토할 때" },
  { id: "all", label: "전체", description: "모든 API를 직접 선택할 때" },
];

export default function LlmApiGuideDialog({ domain, topicId = null, parentDocumentId = null, onClose }: LlmApiGuideDialogProps) {
  const [mode, setMode] = useState<CopyMode>("default");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSampleKeys, setSelectedSampleKeys] = useState<PlaybookSampleKey[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedApisCopied, setSelectedApisCopied] = useState(false);
  const { showToast } = useToast();
  const base = "/api/llm/hospital-playbook";
  const topic = String(topicId ?? "{topicId}");
  const parent = String(parentDocumentId ?? "{parentDocumentId}");

  const items: ApiItem[] = [
    {
      id: "tree", label: "현재 메뉴 위치 확인", method: "GET",
      endpoint: base + "/tree?spaceCode=" + domain,
      summary: "현재 1차·2차 메뉴와 문서 ID를 확인합니다. 새 구조를 만들기 전에 항상 사용합니다.",
      content: ["GET " + base + "/tree?spaceCode=" + domain, "", "현재 화면의 메뉴·주제·문서 ID를 확인합니다.", "같은 이름의 메뉴와 문서가 있으면 중복 생성하지 않습니다."].join("\n"),
    },
    {
      id: "topic", label: "주제와 기존 문서 확인", method: "GET",
      endpoint: base + "/topics/" + topic,
      summary: "선택한 2차 주제의 문서, parentId, 최신 version을 확인합니다.",
      content: ["GET " + base + "/topics/" + topic, "", "기존 문서와 최신 version을 확인합니다.", "문서를 수정할 때는 응답의 version을 expectedVersion으로 사용합니다."].join("\n"),
    },
    {
      id: "topic-documents", label: "주제 문서 트리와 조회 URL 확인", method: "GET",
      endpoint: base + "/topics/" + topic + "/documents",
      summary: "선택한 2차 주제의 본문·하위 문서 전체와 각 문서의 조회·context·본문 URL을 재귀적으로 확인합니다.",
      content: ["GET " + base + "/topics/" + topic + "/documents", "", "선택한 2차 주제의 최상위 문서와 모든 하위 문서를 children 트리로 반환합니다.", "각 문서의 documentUrl, contextUrl, contentUrl을 사용해 필요한 범위만 조회·수정합니다."].join("\n"),
    },
    {
      id: "samples", label: "구현 노트 샘플 조회", method: "GET",
      endpoint: base + "/samples/API_IMPLEMENTATION",
      summary: "실제 파일·코드·검증을 적는 구현 기록 형식을 확인합니다.",
      content: ["GET " + base + "/samples/API_IMPLEMENTATION", "GET " + base + "/samples/FRONTEND_IMPLEMENTATION", "", "구현 기록을 만들기 전에 작업 성격에 맞는 샘플을 조회합니다."].join("\n"),
    },
    {
      id: "create-document", label: "본문 문서 만들기", method: "POST",
      endpoint: base + "/topics/" + topic + "/documents",
      summary: "2차 주제 아래에 새 본문 문서를 만듭니다. 같은 목적의 문서가 없을 때만 사용합니다.",
      content: ["POST " + base + "/topics/" + topic + "/documents", "Content-Type: application/json", "", "{", "  \"title\": \"문서 제목\",", "  \"content\": \"Lexical JSON 문자열\",", "  \"parentId\": null", "}", "", "정책·설계 문서는 목적 하나당 본문 문서 하나를 만듭니다."].join("\n"),
    },
    {
      id: "patch-content", label: "기존 본문 고치기", method: "PATCH",
      endpoint: base + "/documents/{documentId}/content",
      summary: "기존 문서의 제목·본문을 최신 version 기준으로 수정합니다.",
      content: ["PATCH " + base + "/documents/{documentId}/content", "Content-Type: application/json", "", "{", "  \"title\": \"문서 제목\",", "  \"content\": \"Lexical JSON 문자열\",", "  \"expectedVersion\": \"GET으로 확인한 최신 version\",", "  \"parentId\": null", "}", "", "409 충돌이 나면 문서를 다시 조회한 뒤 최신 version으로 다시 요청합니다."].join("\n"),
    },
    {
      id: "create-child", label: "구현 상세 문서 만들기", method: "POST",
      endpoint: base + "/topics/" + topic + "/children",
      summary: "긴 구현 작업을 API·Front 같은 하위 문서로 나눌 때 사용합니다.",
      content: ["POST " + base + "/topics/" + topic + "/children", "Content-Type: application/json", "", "{", "  \"parentId\": " + parent + ",", "  \"title\": \"TODO 1. API 구현\",", "  \"content\": \"Lexical JSON 문자열\"", "}", "", "정책·기획 문서에는 하위 문서를 억지로 만들지 않습니다."].join("\n"),
    },
    {
      id: "reorder", label: "문서 순서 바꾸기", method: "POST",
      endpoint: base + "/topics/" + topic + "/documents/reorder",
      summary: "같은 부모 아래 문서의 표시 순서를 바꿉니다.",
      content: ["POST " + base + "/topics/" + topic + "/documents/reorder", "Content-Type: application/json", "", "{", "  \"ids\": [201, 202, 203],", "  \"parentId\": " + parent, "}", "", "ids에는 같은 부모를 가진 실제 문서 ID를 원하는 순서대로 넣습니다."].join("\n"),
    },
    {
      id: "delete", label: "메뉴·문서 삭제", method: "DELETE",
      endpoint: base + "/documents/{documentId}",
      summary: "대상을 다시 확인한 뒤 문서 또는 메뉴를 삭제합니다.",
      content: ["DELETE " + base + "/documents/{documentId}", "DELETE " + base + "/categories/{categoryId}", "DELETE " + base + "/topics/" + topic, "", "삭제 전에는 tree 또는 document 조회로 대상 ID와 하위 문서 범위를 확인합니다."].join("\n"),
    },
  ];

  const presets: Record<CopyMode, string[]> = {
    default: [],
    document: ["tree", "topic", "topic-documents", "create-document", "patch-content"],
    implementation: ["tree", "topic", "topic-documents", "samples", "create-document", "patch-content", "create-child", "reorder"],
    review: ["tree", "topic", "topic-documents", "samples"],
    all: items.map((item) => item.id),
  };
  const profiles: Record<CopyMode, string> = {
    default: "# API 선택 안내\n- 현재 작업에 필요한 API만 표에서 직접 선택합니다.\n- 문서 위치와 기존 상태를 확인해야 하면 tree, topic, 주제 문서 트리 조회부터 선택합니다.",
    document: "# 문서 작성 규칙\n- 정책·요구사항·설계 문서는 하나의 목적당 본문 문서 하나로 작성합니다.\n- 제목, 설명, 결정할 항목, 목록을 사용합니다. 구현 하위 문서와 실제 코드를 강제하지 않습니다.",
    implementation: "# 구현 기록 규칙\n- TODO 하나를 본문 문서 하나로 작성합니다.\n- 작업이 길면 API 구현·Front 구현 하위 문서로 나누고, 각 문서 안에 Step을 작성합니다.\n- 구현이 끝난 뒤에만 실제 파일 경로, 코드, 테스트 결과를 기록합니다.",
    review: "# 코드 리뷰 규칙\n- 먼저 현재 문서·구현 맥락을 조회합니다.\n- 문제점은 근거, 영향, 수정 방향을 함께 적습니다.\n- 리뷰만 할 때는 새 문서·하위 문서를 만들지 않습니다.",
    all: "# 공통 작성 규칙\n- 현재 위치와 기존 문서를 먼저 조회하고, 같은 문서를 중복 생성하지 않습니다.\n- 수정 전 최신 version을 확인하고, 저장 후 GET으로 결과를 다시 확인합니다.",
  };
  const common = ["# PKT Playbook LLM API", "", "baseUrl: " + base, "spaceCode: " + domain, "topicId: " + topic, "", "작업 전 tree 또는 topic 조회로 현재 위치와 실제 ID를 확인합니다.", "content는 Markdown이나 HTML이 아닌 Lexical EditorState JSON 문자열입니다.", "제목은 heading, 설명은 quote, 목록은 list/listitem으로 저장합니다."].join("\n");
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const selectedSamples = selectedSampleKeys.map((sampleKey) => ["# 작성 예제 참고", "GET " + base + "/samples/" + sampleKey, "", "이 예제의 Lexical 구조와 문서 분리 방식을 참고합니다. 전체 본문을 복사하지 말고 현재 작업에 맞게 작성합니다."].join("\n"));
  const copyText = [common, profiles[mode], ...selectedItems.map((item) => "# " + item.label + "\n\n" + item.content), ...selectedSamples].join("\n\n---\n\n");
  const activeMode = modes.find((item) => item.id === mode) ?? modes[0];

  const selectMode = (nextMode: CopyMode) => {
    setMode(nextMode);
    setSelectedIds(presets[nextMode]);
  };
  const toggleItem = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const allItemsSelected = selectedIds.length === items.length;
  const toggleAllItems = () => {
    setSelectedIds(allItemsSelected ? [] : items.map((item) => item.id));
  };
  const copyApiItem = async (item: ApiItem) => {
    const value = [
      `${item.method} ${window.location.origin}${getApiBase()}${item.endpoint}`,
      "",
      item.summary,
    ].join("\n");
    try {
      await copyToClipboard(value);
      setCopiedId(item.id);
      showToast("API URL과 설명을 복사했습니다.");
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      showToast("클립보드에 복사하지 못했습니다.", "error");
    }
  };
  const copySelectedApis = async () => {
    if (selectedItems.length === 0) {
      showToast("복사할 API를 선택하세요.", "info");
      return;
    }
    const value = selectedItems.map((item) => [
      `# ${item.label}`,
      `${item.method} ${window.location.origin}${getApiBase()}${item.endpoint}`,
      "",
      item.summary,
    ].join("\n")).join("\n\n---\n\n");
    try {
      await copyToClipboard(value);
      setSelectedApisCopied(true);
      showToast("선택한 API 정보를 복사했습니다.");
      window.setTimeout(() => setSelectedApisCopied(false), 1600);
    } catch {
      showToast("클립보드에 복사하지 못했습니다.", "error");
    }
  };

  return (
    <ApiGuideDialogShell
      title="2차 주제 노트 작업 도우미"
      description={"선택한 주제(" + (topicId ?? "ID 미확인") + ")에서 필요한 API만 골라 LLM에 전달합니다."}
      copyText={copyText}
      onClose={onClose}
      ariaLabel="2차 주제 노트 작업 도우미"
      contentAriaLabel="선택형 LLM API 안내"
      previewAriaLabel="저장된 작성 예제"
      preview={<ImplementationNoteSamplePreview selectedKeys={selectedSampleKeys} onSelectedKeysChange={setSelectedSampleKeys} />}
      copyLabel={"선택 항목 복사 (" + (selectedItems.length + selectedSampleKeys.length) + ")"}
      footer={<p><strong className="text-text-primary">선택 항목 복사</strong>는 공통 규칙과 현재 탭의 작성 규칙, 체크한 API·작성 예제 GET 주소만 복사합니다.</p>}
    >
      <div className="flex min-h-full min-w-0 flex-col bg-surface-raised">
        <div className="shrink-0 border-b border-surface-border-soft px-4 py-3">
          <nav className="flex w-fit min-w-full gap-1 overflow-x-auto rounded-lg border border-surface-border-soft bg-surface-muted p-1" role="tablist" aria-label="작업 목적 선택">
            {modes.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} onClick={() => selectMode(item.id)} className={"shrink-0 rounded-md px-3 py-2 text-xs font-black transition " + (mode === item.id ? "bg-brand-primary text-white shadow-sm" : "bg-surface-raised text-text-muted hover:bg-white hover:text-text-primary")}>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-5">
          <div className="mb-4 rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
            <h3 className="text-base font-black text-text-primary">{activeMode.label}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">{activeMode.description} 탭을 누르면 필요한 API가 자동 선택됩니다. 표에서 원하는 항목만 추가하거나 뺄 수 있습니다.</p>
          </div>
          <div className="mb-2 flex justify-end">
            <button type="button" onClick={() => void copySelectedApis()} className="ui-icon-button-brand h-8 gap-1.5 px-2.5 text-[11px] font-black">
              {selectedApisCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              선택 API 복사 ({selectedItems.length})
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-surface-border-soft">
            <table className="w-full min-w-[790px] border-collapse text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary">
                <tr><th scope="col" className="w-12 px-3 py-3 text-center font-black"><input type="checkbox" checked={allItemsSelected} onChange={toggleAllItems} aria-label="모든 API 선택" className="size-4 accent-brand-primary" /></th><th scope="col" className="w-16 px-3 py-3 font-black">방식</th><th scope="col" className="min-w-40 px-3 py-3 font-black">API</th><th scope="col" className="min-w-36 px-3 py-3 font-black">하는 일</th><th scope="col" className="w-32 px-3 py-3 text-center font-black">복사</th></tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const checked = selectedIds.includes(item.id);
                  return <tr key={item.id} className="border-t border-surface-border-soft align-top hover:bg-surface-muted/60">
                    <td className="!align-middle px-3 py-3 text-center"><input type="checkbox" checked={checked} onChange={() => toggleItem(item.id)} aria-label={item.label + " 선택"} className="size-4 accent-brand-primary" /></td>
                    <td className="px-3 py-3"><span className={"rounded px-1.5 py-1 font-mono text-[10px] font-black " + methodClass[item.method]}>{item.method}</span></td>
                    <td className="break-words px-3 py-3 font-mono text-[11px] leading-5 text-text-primary [overflow-wrap:anywhere]">{item.endpoint}</td>
                    <td className="px-3 py-3 font-semibold leading-5 text-text-muted">{item.summary}</td>
                    <td className="!align-middle px-2 py-3 text-center">
                      <div className="flex justify-center">
                        <button type="button" onClick={() => void copyApiItem(item)} aria-label={item.label + " API URL과 설명 복사"} className="ui-icon-button size-7 text-brand-primary" title="HTTP 메서드, 전체 URL, 설명 복사">{copiedId === item.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button>
                      </div>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ApiGuideDialogShell>
  );
}
