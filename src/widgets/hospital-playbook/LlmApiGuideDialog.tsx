import { useMemo, useState } from "react";
import type { PlaybookDomain } from "../../features/hospital-playbook/api";
import ApiGuideDialogShell from "./ApiGuideDialogShell";
import ImplementationNoteSamplePreview from "./ImplementationNoteSamplePreview";
import { SAMPLE_NOTE_REFERENCE_GUIDE } from "./documentApiSamples";

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
    const base = "/api/llm/hospital-playbook";
    const sections: GuideSection[] = [
      {
        id: "workflow", label: "작업 순서", summary: "조회부터 시작하고 생성·수정·정렬 후 다시 확인합니다.",
        content: `# 기본 작업 순서

1. GET ${base}/tree?spaceCode=${domain} 또는 GET ${base}/topics/${topicId ?? "{topicId}"}로 화면의 선택 위치와 현재 ID를 확인
2. 기존 본문 문서와 최신 version 확인
3. 같은 위치에 본문 문서가 없을 때만 POST로 생성
4. TODO 하나를 하나의 본문 문서로 POST하고 목표·범위·선행 조건·완료 기준을 저장
5. TODO가 길면 API 구현·Front 구현 하위 문서를 POST하고 각 문서 안에 Step 1~N 작성
6. 필요하면 POST로 하위 문서 순서 정렬
7. 마지막에 GET으로 저장 결과 재조회

## 문서 구조
2차 주제 → TODO 본문 문서(TODO 하나) → API 구현·Front 구현 하위 문서

- Step마다 별도 문서를 만들지 않습니다.
- TODO 본문 문서에는 해당 기능 하나의 목표·범위·선행 조건·완료 기준을 작성합니다.
- TODO 본문 문서 아래에는 필요할 때 API 구현과 Front 구현 하위 문서를 나눠 만듭니다.
- API·Front 하위 문서에는 실제 파일·함수·훅·컴포넌트·검증을 Step 1~N으로 작성합니다.
- API가 없는 프론트 전용 작업은 API 하위 문서를 억지로 만들지 않습니다.
- 존재하는 문서를 중복 생성하지 않습니다.
- 한 기능이 길어지면 하나의 긴 문서에 API와 Front를 섞지 않고 하위 문서로 분리합니다.
- 문서 ID·topicId·카테고리 제목을 예시에서 복사하지 않고 현재 조회 응답을 사용합니다.
- 구조 생성은 기존 tree에 같은 1차·2차 메뉴가 없을 때만 호출합니다.
- 구현 전 실제 파일·API·응답을 조회합니다.
- 구현 후 실제 파일 경로, 코드, 테스트 결과를 문서에 반영합니다.
- 409가 나오면 최신 문서를 다시 조회하고 expectedVersion을 갱신합니다.`,
      },
      {
        id: "samples", label: "샘플 조회", method: "GET", summary: "앱 내부 SQLite에서 최신 API·프론트 모범 문서를 조회합니다.",
        content: `# 샘플 노트 조회 API

GET ${base}/samples
GET ${base}/samples/API_IMPLEMENTATION
GET ${base}/samples/FRONTEND_IMPLEMENTATION

API_IMPLEMENTATION 응답은 샘플 본문 content와 TODO 상세 문서 children을 함께 반환합니다. 샘플 문서는 내부 기준 데이터이며 documentId를 고정하지 않고 sampleKey로 조회합니다.`,
      },
      {
        id: "get", label: "GET 조회", method: "GET", summary: "구조·주제·문서를 조회하고 ID와 version을 확보합니다.",
        content: `# 조회 API

GET ${base}/tree?spaceCode=${domain}
GET ${base}/categories/{categoryId}
GET ${base}/topics/${topicId ?? "{topicId}"}
GET ${base}/documents/{documentId}

주제 조회 결과에 같은 TODO 본문 문서가 있으면 새로 만들지 않습니다. 수정 전에는 반드시 최신 version을 확인합니다.`,
      },
      {
        id: "post", label: "POST 생성·정렬", method: "POST", summary: "구조·본문·상세 리뷰 문서를 생성하고 하위 문서 순서를 바꿉니다.",
        content: `# 생성·정렬 API

## 구조 생성
POST ${base}/structure
Content-Type: application/json

{
  "spaceCode": "${domain}",
  "categoryTitle": "tree에 없는 새 1차 영역",
  "topicTitles": ["tree에 없는 새 2차 주제"]
}

구조 생성 전 GET으로 중복 여부를 확인합니다. 화면에 이미 존재하는 위치라면 구조 생성 없이 조회한 topicId를 사용합니다.

## TODO 본문 문서 생성
POST ${base}/topics/${topicId ?? "{topicId}"}/documents

{
  "title": "TODO 1. 앱 내부 조회 API 구현",
  "content": "Lexical JSON 문자열",
  "parentId": null
}

## 상세 리뷰 하위 문서 생성
POST ${base}/topics/${topicId ?? "{topicId}"}/children

{
  "parentId": ${parentDocumentId ?? "{parentDocumentId}"},
  "title": "TODO 1. 샘플 조회 Route Handler 상세 리뷰",
  "content": "Route Handler부터 내부 조회 함수·Drizzle 스키마·SQLite·검증까지 담은 Lexical JSON 문자열"
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
  "title": "앱 내부 조회 API 구현",
  "content": "Lexical JSON 문자열",
  "expectedVersion": 3,
  "parentId": null
}

expectedVersion은 수정 직전에 GET으로 확인한 최신 version을 사용합니다. 충돌이 발생하면 문서를 다시 조회한 뒤 재시도합니다.`,
      },
      {
        id: "delete", label: "DELETE 삭제", method: "DELETE", summary: "대상을 확인한 뒤 1·2차 메뉴 또는 문서 트리를 삭제합니다.",
        content: `# 메뉴·문서 삭제

DELETE ${base}/categories/{categoryId}
DELETE ${base}/topics/{topicId}

DELETE ${base}/documents/{documentId}

삭제 전 GET tree 또는 GET document로 대상 ID와 하위 범위를 확인합니다. 1차 메뉴 삭제 시 연결된 2차 주제·문서·댓글이 함께 삭제되고, 2차 주제 삭제 시 연결된 문서·댓글이 함께 삭제됩니다. 이 API는 localhost에서 로그인 없이 사용할 수 있습니다.`,
      },
      {
        id: "lexical", label: "Lexical 규칙", summary: "content는 Markdown이 아닌 JSON.stringify(EditorState) 문자열입니다.",
        content: `# Lexical content 규칙

- content는 Markdown이나 HTML이 아니라 JSON.stringify(editorState) 결과입니다.
- 최상위 구조는 {"root":{"children":[...]}}입니다.
- 제목은 heading, 일반 문단은 paragraph, 목록은 list/listitem을 사용합니다.
- 섹션 설명은 quote 노드로 묶습니다.
- 각 Step은 heading → quote → '파일:' paragraph → 파일 경로 code → '코드:' paragraph → 실제 코드 code 순서로 작성합니다.
- 파일 경로와 실제 코드는 quote 밖의 독립 code 블록으로 둡니다.
- 파일 경로 code에는 설명이나 주석 없이 복사 가능한 경로만 넣습니다.
- 주요 함수·타입·훅·컴포넌트의 역할 주석은 실제 코드 블록 안에서 대상 바로 위에 작성합니다.
- 파일 경로 code의 language는 text, 실제 코드는 typescript·tsx·bash·json 등 실제 언어를 사용합니다.
- code 블록의 전체 코드를 code-highlight.text에 넣습니다.
- 섹션 사이에는 빈 paragraph 2개를 둡니다. 목록 항목 사이에는 넣지 않습니다.
- 설명용 생략 부호(...) 대신 이해 가능한 실제 함수·훅·컴포넌트·설정 단위 코드를 기록합니다.
- JSON 문자열 안의 줄바꿈은 JSON 직렬화에 맡깁니다. 수동 이중 escape하지 않습니다.`,
      },
    ];
    const header = `# PKT Playbook LLM API\n\nruntime: Next.js Route Handler\ndatabase: 앱 내부 SQLite\nexternalServer: 사용하지 않음\nbaseUrl: ${base}\nspaceCode: ${domain}\ntopicId: ${topicId ?? "{topicId}"}\n\n`;
    return { sections, full: header + sections.map((section) => section.content).join("\n\n---\n\n") + `\n\n---\n\n${SAMPLE_NOTE_REFERENCE_GUIDE}` };
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
      previewAriaLabel="API·프론트 구현 노트 모범 예시"
      previewTitle="구현 노트 모범 예시"
      previewDescription="같은 앱의 Next.js·SQLite 구현을 실제 파일·코드·주석·검증으로 정리한 예시입니다."
      preview={<ImplementationNoteSamplePreview />}
      copyLabel="LLM용 전체 복사"
      footer={<p><strong className="text-text-primary">LLM용 전체 복사</strong>는 내부 API 사용법, 현재 문서 구조 기준, API·프론트 예시 조회 방법을 한 번에 복사합니다.</p>}
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
