import { useMemo } from "react";
import { getApiBase } from "../../shared/api/client";
import ApiGuideDialogShell from "./ApiGuideDialogShell";
import ApiGuideTabs, { type ApiGuideTab } from "./ApiGuideTabs";
import LexicalSamplePreview from "./LexicalSamplePreview";

type DocumentContextApiDialogProps = { documentId: number; documentTitle: string; onClose: () => void };

export default function DocumentContextApiDialog({ documentId, documentTitle, onClose }: DocumentContextApiDialogProps) {
  const { guide, tabs } = useMemo(() => {
    const endpoint = `${getApiBase()}/api/llm/hospital-playbook/documents/${documentId}/context`;
    const contentEndpoint = `${getApiBase()}/api/llm/hospital-playbook/documents/${documentId}/content`;
    const tabs: ApiGuideTab[] = [
      { id: "workflow", label: "작업 순서", summary: "문서 전체 조회 후 최신 version으로 본문을 수정합니다.", content: `# 문서 편집 순서\n\n1. GET ${endpoint}로 문서·하위 문서·version을 조회합니다.\n2. 기존 root 구조와 노드를 유지해 title·content를 준비합니다.\n3. PATCH ${contentEndpoint}로 저장합니다.\n4. 409면 다시 GET한 뒤 expectedVersion을 갱신합니다.\n5. GET으로 저장 결과를 확인합니다.\n\n이 API는 현재 문서 하나와 그 하위 문서 조회·본문 저장만 담당합니다.` },
      { id: "get", label: "GET 조회", method: "GET", summary: "현재 문서 메타데이터·본문·하위 문서 전체를 읽습니다.", content: `GET ${endpoint}\nAccept: application/json\n\n응답에는 space, category, topic, document와 재귀적인 children이 포함됩니다. content는 Lexical EditorState를 JSON.stringify한 문자열입니다.` },
      { id: "patch", label: "PATCH 저장", method: "PATCH", summary: "최신 expectedVersion을 사용해 현재 문서 본문을 저장합니다.", content: `PATCH ${contentEndpoint}\nContent-Type: application/json\n\n{\n  "title": "수정 제목",\n  "content": "Lexical JSON 문자열",\n  "expectedVersion": <CURRENT_VERSION>,\n  "parentId": null\n}\n\nexpectedVersion은 직전 GET 응답의 최신 version을 사용합니다.` },
      { id: "response", label: "응답 구조", summary: "하위 문서는 children 안에 재귀적으로 포함됩니다.", content: `{"spaceCode":"<CURRENT_SPACE_CODE>","categoryId":<CURRENT_CATEGORY_ID>,"topicId":<CURRENT_TOPIC_ID>,"document":{"id":${documentId},"parentId":null,"title":"${documentTitle}","content":"Lexical JSON 문자열","version":<CURRENT_VERSION>,"children":[{"id":<CHILD_DOCUMENT_ID>,"parentId":${documentId},"title":"하위 문서 제목","children":[]}]}}\n\n위 값은 응답 형태를 설명하는 예시입니다. 실제 spaceCode·categoryId·topicId·문서 ID·version은 GET 응답을 기준으로 사용합니다.` },
      { id: "lexical", label: "Lexical 규칙", summary: "Markdown이나 HTML이 아닌 Lexical JSON을 유지합니다.", content: `- 일반 본문은 paragraph, 제목은 heading, 목록은 list/listitem입니다.\n- 설명 묶음은 quote 노드로 표현합니다.\n- 파일 경로와 실제 코드는 quote 밖의 독립 code 노드로 둡니다.\n- 경로 code는 language: text, 실제 코드는 java·typescript·tsx·bash·json 등을 사용합니다.\n- code children에는 type: code-highlight를 둡니다.\n- 섹션 사이에는 빈 paragraph 2개를 둡니다. 목록 항목 사이에는 넣지 않습니다.` },
    ];
    return { tabs, guide: `# PKT Playbook 문서 조회·저장 API\n\ndocumentId: ${documentId}\ndocumentTitle: ${documentTitle}\n\n${tabs.map((tab) => `${tab.label}\n${tab.content}`).join("\n\n---\n\n")}` };
  }, [documentId, documentTitle]);

  return <ApiGuideDialogShell title="2차 노트 관리 API" description="문서 조회·저장 지침을 작업별로 확인합니다." copyText={guide} onClose={onClose} ariaLabel="2차 노트 관리 API" contentAriaLabel="분류된 문서 API 지침" previewAriaLabel="Lexical 저장 형식 샘플" previewTitle="Lexical 작성 샘플" previewDescription="본문과 하위 문서에 사용하는 quote·list·code 블록 샘플입니다." preview={<LexicalSamplePreview />} footer="전체 복사는 모든 탭의 지침을 복사합니다. 문서 생성·삭제·정렬은 전체 노트 관리 API를 사용합니다."><ApiGuideTabs sections={tabs} /></ApiGuideDialogShell>;
}
