import ApiGuideDialogShell from "./ApiGuideDialogShell";
import ApiGuideTabs, { type ApiGuideTab } from "./ApiGuideTabs";
import LexicalSamplePreview from "./LexicalSamplePreview";

type AiEditConnectionDialogProps = { connection: string; documentTitle: string; isChildDocument: boolean; onClose: () => void };

export default function AiEditConnectionDialog({ connection, documentTitle, isChildDocument, onClose }: AiEditConnectionDialogProps) {
  const lines = connection.split("\n");
  const getLines = lines.filter((line) => line.startsWith("GET ") || line.startsWith("Authorization:") || line.startsWith("TOKEN:"));
  const patchLines = lines.filter((line) => line.startsWith("PATCH ") || line.startsWith("PATCH body:"));
  const rulesStart = lines.indexOf("CONTENT FORMAT:");
  const rules = rulesStart >= 0 ? lines.slice(rulesStart).join("\n") : "content는 기존 Lexical EditorState JSON 문자열을 유지합니다.";
  const sections: ApiGuideTab[] = [
    { id: "scope", label: "사용 범위", summary: "발급된 토큰은 현재 문서 하나만 조회·수정합니다.", content: `문서: ${documentTitle}\n문서 유형: ${isChildDocument ? "TODO 하위 문서(이 TODO의 Step 1~N)" : "2차 주제 본문 문서(전체 TODO 계획)"}\n\n${isChildDocument ? "이 문서 안에서 해당 TODO의 Step 1~N을 순서대로 작성합니다." : "전체 목표와 TODO 1~N 계획만 작성하고 Step 상세는 하위 문서로 분리합니다."}\n\n다른 문서 생성·삭제·정렬은 2차 주제 전체 노트 관리 API를 사용합니다.` },
    { id: "get", label: "GET 조회", method: "GET", summary: "저장 전에 현재 문서와 최신 version을 조회합니다.", content: getLines.join("\n") || "GET {documentEndpoint}\nAuthorization: Bearer <TOKEN>" },
    { id: "patch", label: "PATCH 수정", method: "PATCH", summary: "조회한 최신 version을 expectedVersion으로 보내 한 번 저장합니다.", content: `${patchLines.join("\n")}\nAuthorization: Bearer <TOKEN>\n\n저장 전 GET으로 기존 문서 전체를 조회하고 root 구조와 노드를 유지합니다.` },
    { id: "lexical", label: "Lexical 규칙", summary: "본문은 Markdown이 아니라 Lexical EditorState JSON 문자열입니다.", content: rules },
    { id: "security", label: "토큰 주의", summary: "토큰은 한 번 저장한 뒤 폐기되며 만료 시간이 있습니다.", content: "토큰은 외부에 노출하지 않습니다.\n한 번 저장하면 폐기됩니다.\nexpiresAt 이후에는 사용할 수 없습니다.\n토큰 오류가 나면 새 연결 정보를 발급받습니다." },
  ];

  return <ApiGuideDialogShell title="개별 문서 편집 API for LLM" description={`${isChildDocument ? "TODO 하위 문서" : "2차 주제 본문 문서"} · ${documentTitle}`} copyText={connection} onClose={onClose} ariaLabel="개별 문서 편집 API for LLM" contentAriaLabel="분류된 개별 문서 API 지침" previewAriaLabel="Lexical 본문 샘플" previewTitle="개별 문서 편집 Lexical 샘플" previewDescription="본문 TODO 계획과 하위 문서 Step 1~N 샘플입니다." preview={<LexicalSamplePreview initialTab={isChildDocument ? "step1" : "todo"} />} footer="이 API는 현재 문서 하나만 대상으로 합니다. 전체 복사는 토큰을 포함하므로 필요한 경우에만 사용하고 외부에 노출하지 마세요."><ApiGuideTabs sections={sections} /></ApiGuideDialogShell>;
}
