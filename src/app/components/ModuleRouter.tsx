"use client";

import { useActiveModule } from "./FullstackShell";
import HospitalPlaybookModule from "../../widgets/hospital-playbook/HospitalPlaybookModule";

const modules: Record<string, { domain: "SPRING_BOOT" | "DB" | "FRONTEND" | "PKT_FRONT_LEV1" | "UIUX" | "UI_NAV" | "UI_FORM" | "UI_LAYOUT" | "UI_STATE"; title: string }> = {
  "스프링 노트": { domain: "SPRING_BOOT", title: "스프링 노트" },
  "DB 테이블 설계": { domain: "DB", title: "DB 테이블 설계" },
  "리액트 노트": { domain: "FRONTEND", title: "리액트 노트" },
  "PKT Front Lev1": { domain: "PKT_FRONT_LEV1", title: "PKT Front Lev1" },
  "공통 컴포넌트": { domain: "UIUX", title: "공통 컴포넌트" },
  "메뉴·네비게이션": { domain: "UI_NAV", title: "메뉴·네비게이션" },
  "폼·유효성 검사": { domain: "UI_FORM", title: "폼·유효성 검사" },
  "레이아웃·페이지": { domain: "UI_LAYOUT", title: "레이아웃·페이지" },
  "인터랙션·상태": { domain: "UI_STATE", title: "인터랙션·상태" },
};

export function ModuleRouter({ children }: { children: React.ReactNode; tree?: unknown }) {
  const active = useActiveModule();
  if (active === "노트 홈") return <>{children}</>;
  const module = modules[active];
  if (module) return <main><HospitalPlaybookModule key={active} domain={module.domain} title={module.title} /></main>;
  return <main><section className="module-empty"><p className="eyebrow">PKT MODULE</p><h1>{active}</h1><p>선택한 모듈을 준비하고 있습니다.</p></section></main>;
}
