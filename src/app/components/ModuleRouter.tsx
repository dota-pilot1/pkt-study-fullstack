"use client";

import { useActiveModule } from "./FullstackShell";
import HospitalPlaybookModule from "../../widgets/hospital-playbook/HospitalPlaybookModule";
import SettingsModule from "./SettingsModule";

const modules: Record<string, { domain: "SPRING_BOOT" | "JAVA" | "DB" | "FRONTEND" | "FRONTEND_DOMAIN" | "JS_TS" | "PKT_FRONT_LEV1" | "COMPONENT_SKETCH" | "UIUX" | "UI_NAV" | "UI_FORM" | "UI_LAYOUT" | "UI_STATE" | "NOTE_SAMPLE"; title: string }> = {
  "샘플 노트": { domain: "NOTE_SAMPLE", title: "샘플 노트" },
  "스프링 노트": { domain: "SPRING_BOOT", title: "스프링 노트" },
  "자바 노트": { domain: "JAVA", title: "자바 노트" },
  "DB 테이블 설계": { domain: "DB", title: "DB 테이블 설계" },
  "리액트 노트": { domain: "FRONTEND", title: "리액트 노트" },
  "도메인 분석": { domain: "FRONTEND_DOMAIN", title: "프론트 도메인 분석" },
  "JS·TS 노트": { domain: "JS_TS", title: "JS·TS 노트" },
  "기본 화면 설계": { domain: "PKT_FRONT_LEV1", title: "기본 화면 설계" },
  "컴포넌트 스케치": { domain: "COMPONENT_SKETCH", title: "컴포넌트 스케치" },
};

export function ModuleRouter({ children }: { children: React.ReactNode; tree?: unknown }) {
  const active = useActiveModule();
  if (active === "노트 홈") return <>{children}</>;
  if (active === "설정") return <SettingsModule />;
  const moduleConfig = modules[active];
  if (moduleConfig) return <main className="flex min-h-0 min-w-0 flex-1"><HospitalPlaybookModule key={active} domain={moduleConfig.domain} title={moduleConfig.title} /></main>;
  return <main className="flex min-h-0 min-w-0 flex-1"><section className="module-empty"><p className="eyebrow">PKT MODULE</p><h1>{active}</h1><p>선택한 모듈을 준비하고 있습니다.</p></section></main>;
}
