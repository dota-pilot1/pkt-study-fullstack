import { useMemo, useState } from "react";
import { getApiBase } from "../../shared/api/client";
import type { PlaybookDomain } from "../../features/hospital-playbook/api";
import ApiGuideDialogShell from "./ApiGuideDialogShell";
import LexicalSamplePreview from "./LexicalSamplePreview";

type LlmApiGuideDialogProps = {
  domain: PlaybookDomain;
  topicId?: number | null;
  parentDocumentId?: number | null;
  onClose: () => void;
};

type GuideSection = {
  id: string;
  label: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  summary: string;
  content: string;
};

const methodClass: Record<NonNullable<GuideSection["method"]>, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PATCH: "bg-amber-100 text-amber-700",
  DELETE: "bg-rose-100 text-rose-700",
};

export default function LlmApiGuideDialog({ domain, topicId = null, parentDocumentId = null, onClose }: LlmApiGuideDialogProps) {
  const [activeSection, setActiveSection] = useState("workflow");
  const guide = useMemo(() => {
    const base = `${getApiBase()}/api/llm/hospital-playbook`;
    const sections: GuideSection[] = [
      {
        id: "workflow", label: "작업 순서", summary: "조회부터 시작하고 생성·수정·정렬 후 다시 확인합니다.",
        content: `# 기본 작업 순서

1. GET ${base}/tree?spaceCode=${domain} 또는 GET ${base}/topics/${topicId ?? "{topicId}"}
2. 기존 본문 문서와 최신 version 확인
3. 없으면 POST로 본문 문서 생성
4. 본문 계획 저장은 PATCH로 수행
5. TODO마다 POST로 하위 문서 생성
6. 필요하면 POST로 하위 문서 순서 정렬
7. 마지막에 GET으로 저장 결과 재조회

## 문서 구조
2차 주제 → 본문 문서(전체 TODO 계획) → TODO 하위 문서(TODO 하나의 Step 1~N)

- Step마다 별도 문서를 만들지 않습니다.
- 존재하는 문서를 중복 생성하지 않습니다.
- 구현 전 실제 파일·API·응답을 조회합니다.
- 구현 후 실제 파일 경로, 코드, 테스트 결과를 문서에 반영합니다.
- 409가 나오면 최신 문서를 다시 조회하고 expectedVersion을 갱신합니다.`,
      },
      {
        id: "get", label: "GET 조회", method: "GET", summary: "구조·주제·문서를 조회하고 ID와 version을 확보합니다.",
        content: `# 조회 API

GET ${base}/tree?spaceCode=${domain}
GET ${base}/categories/{categoryId}
GET ${base}/topics/${topicId ?? "{topicId}"}
GET ${base}/documents/{documentId}

주제 조회 결과에 기존 본문 문서가 있으면 새로 만들지 않습니다. 수정 전에는 반드시 최신 version을 확인합니다.`,
      },
      {
        id: "post", label: "POST 생성·정렬", method: "POST", summary: "구조·본문·TODO 문서를 생성하고 하위 문서 순서를 바꿉니다.",
        content: `# 생성·정렬 API

## 구조 생성
POST ${base}/structure
Content-Type: application/json

{
  "spaceCode": "${domain}",
  "categoryTitle": "기본 UI 실습",
  "topicTitles": ["기본 테이블", "컴포넌트 만들기"]
}

구조 생성 전 GET으로 중복 여부를 확인합니다.

## 본문 문서 생성
POST ${base}/topics/${topicId ?? "{topicId}"}/documents

{
  "title": "전체 구현 계획",
  "content": "Lexical JSON 문자열",
  "parentId": null
}

## TODO 하위 문서 생성
POST ${base}/topics/${topicId ?? "{topicId}"}/children

{
  "parentId": ${parentDocumentId ?? "{parentDocumentId}"},
  "title": "TODO 1. 구현 단위",
  "content": "TODO 1의 Step 1~N을 담은 Lexical JSON 문자열"
}

## 하위 문서 정렬
POST ${base}/topics/${topicId ?? "{topicId}"}/documents/reorder

{
  "ids": [201, 202, 203],
  "parentId": ${parentDocumentId ?? "{parentDocumentId}"}
}`,
      },
      {
        id: "patch", label: "PATCH 수정", method: "PATCH", summary: "최신 version을 기준으로 문서 본문을 수정합니다.",
        content: `# 본문 수정

PATCH ${base}/documents/{documentId}/content
Content-Type: application/json

{
  "title": "LOT 조회 페이지네이션 서버 구현 전체 계획",
  "content": "Lexical JSON 문자열",
  "expectedVersion": 3,
  "parentId": null
}

expectedVersion은 수정 직전에 GET으로 확인한 최신 version을 사용합니다. 충돌이 발생하면 문서를 다시 조회한 뒤 재시도합니다.`,
      },
      {
        id: "delete", label: "DELETE 삭제", method: "DELETE", summary: "대상을 확인한 뒤 문서와 하위 문서를 삭제합니다.",
        content: `# 문서 삭제

DELETE ${base}/documents/{documentId}

삭제 전 GET tree 또는 GET document로 대상 ID와 하위 문서 범위를 확인합니다. 문서 삭제 시 하위 문서와 댓글도 함께 삭제될 수 있습니다.`,
      },
      {
        id: "lexical", label: "Lexical 규칙", summary: "content는 Markdown이 아닌 JSON.stringify(EditorState) 문자열입니다.",
        content: `# Lexical content 규칙

- content는 Markdown이나 HTML이 아니라 JSON.stringify(editorState) 결과입니다.
- 최상위 구조는 {"root":{"children":[...]}}입니다.
- 제목은 heading, 일반 문단은 paragraph, 목록은 list/listitem을 사용합니다.
- 섹션 설명은 quote 노드로 묶습니다.
- 파일 경로와 실제 코드는 quote 밖의 독립 code 블록으로 둡니다.
- 파일 경로 code의 language는 text, 실제 코드는 java·typescript·tsx·bash·json 등 실제 언어를 사용합니다.
- code 블록의 전체 코드를 code-highlight.text에 넣습니다.
- 섹션 사이에는 빈 paragraph 2개를 둡니다. 목록 항목 사이에는 넣지 않습니다.
- 설명용 생략 부호(...) 대신 이해 가능한 실제 함수·훅·컴포넌트·설정 단위 코드를 기록합니다.
- JSON 문자열 안의 줄바꿈은 JSON 직렬화에 맡깁니다. 수동 이중 escape하지 않습니다.`,
      },
    ];
    const header = `# PKT Playbook LLM API\n\nbaseUrl: ${base}\nspaceCode: ${domain}\ntopicId: ${topicId ?? "{topicId}"}\n\n`;
    return { sections, full: header + sections.map((section) => section.content).join("\n\n---\n\n") };
  }, [domain, parentDocumentId, topicId]);

  const selected = guide.sections.find((section) => section.id === activeSection) ?? guide.sections[0];

  return (
    <ApiGuideDialogShell
      title="2차 주제 전체 노트 관리 API"
      description={`선택한 주제(${topicId ?? "ID 미확인"})의 LLM 작업 지침입니다.`}
      copyText={guide.full}
      onClose={onClose}
      ariaLabel="2차 주제 전체 노트 관리 API"
      contentAriaLabel="분류된 LLM API 지침"
      previewAriaLabel="2차 주제 본문·하위 문서 Lexical 샘플"
      previewTitle="Lexical 작성 샘플"
      previewDescription="본문에는 TODO 계획을, 하위 문서에는 TODO 하나의 Step 1~N을 작성합니다."
      preview={<LexicalSamplePreview />}
      footer={<p><strong className="text-text-primary">전체 복사</strong>는 모든 분류의 지침을 한 번에 복사하고, 왼쪽 탭에서는 필요한 API 종류만 확인합니다.</p>}
    >
      <div className="flex min-h-full flex-col bg-surface-raised">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-surface-border-soft px-4 py-3" role="tablist" aria-label="API 지침 분류">
          {guide.sections.map((section) => (
            <button key={section.id} type="button" role="tab" aria-selected={selected.id === section.id} onClick={() => setActiveSection(section.id)} className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-black transition ${selected.id === section.id ? "bg-brand-primary text-white" : "text-text-muted hover:bg-surface-muted hover:text-text-primary"}`}>
              {section.method && <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${selected.id === section.id ? "bg-white/20 text-white" : methodClass[section.method]}`}>{section.method}</span>}
              {section.label}
            </button>
          ))}
        </nav>
        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="mb-4 rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
            <h3 className="text-base font-black text-text-primary">{selected.label}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">{selected.summary}</p>
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border border-surface-border-soft bg-surface-muted px-5 py-4 font-mono text-[11px] leading-5 text-text-primary">{selected.content}</pre>
        </div>
      </div>
    </ApiGuideDialogShell>
  );
}
