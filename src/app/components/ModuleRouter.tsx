"use client";

import { useActiveModule } from "./FullstackShell";
import HospitalPlaybookModule from "../../widgets/hospital-playbook/HospitalPlaybookModule";
import SettingsModule from "./SettingsModule";

const modules: Record<string, { domain: "UIUX" | "UI_NAV" | "UI_FORM" | "UI_LAYOUT" | "UI_STATE"; title: string }> = {
  "공통 컴포넌트": { domain: "UIUX", title: "공통 UI · 시스템 갤러리" },
  "메뉴·네비게이션": { domain: "UI_NAV", title: "메뉴·네비게이션" },
  "폼 UI": { domain: "UI_FORM", title: "폼 UI · 시스템 갤러리" },
  "레이아웃·페이지": { domain: "UI_LAYOUT", title: "레이아웃·페이지 · 시스템 갤러리" },
  "인터랙션·상태": { domain: "UI_STATE", title: "인터랙션·상태 · 시스템 갤러리" },
};

export function ModuleRouter({ children }: { children: React.ReactNode; tree?: unknown }) {
  const active = useActiveModule();
  if (active === "노트 홈") return <>{children}</>;
  if (active === "설정") return <SettingsModule />;
  const moduleConfig = modules[active];
  if (moduleConfig) return <main className="flex min-h-0 min-w-0 flex-1"><HospitalPlaybookModule key={active} domain={moduleConfig.domain} title={moduleConfig.title} /></main>;
  return <main className="flex min-h-0 min-w-0 flex-1"><section className="module-empty"><p className="eyebrow">PKT MODULE</p><h1>{active}</h1><p>선택한 모듈을 준비하고 있습니다.</p></section></main>;
}
