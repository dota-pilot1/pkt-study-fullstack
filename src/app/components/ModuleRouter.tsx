"use client";

import { useActiveModule } from "./FullstackShell";
import HospitalPlaybookModule from "../../widgets/hospital-playbook/HospitalPlaybookModule";
import SettingsModule from "./SettingsModule";
import SearchModule from "./SearchModule";

const modules: Record<string, { domain: "SPRING_BOOT" | "SPRING_SECURITY" | "SPRING_AI" | "SPRING_API" | "JAVA" | "JAVA_OOP" | "DB" | "FRONTEND" | "FRONTEND_DOMAIN" | "FRONTEND_LIBRARY" | "JS_TS" | "BASIC_COMPONENTS" | "CLONE_CODING" | "PROTOTYPE" | "UI_CHALLENGE" | "AX_BASIC" | "AX_CHALLENGE" | "TESTING" | "DEBUGGING" | "CI_CD" | "DEPLOYMENT" | "MONITORING" | "INFRASTRUCTURE" | "PKT_FRONT_LEV1" | "COMPONENT_SKETCH" | "UI_NAV" | "UI_FORM" | "UI_LAYOUT" | "UI_STATE" | "NOTE_SAMPLE"; title: string }> = {
  "샘플 노트": { domain: "NOTE_SAMPLE", title: "샘플 노트" },
  "스프링 부트": { domain: "SPRING_BOOT", title: "스프링 부트" },
  "스프링 시큐리티": { domain: "SPRING_SECURITY", title: "스프링 시큐리티" },
  "스프링 AI": { domain: "SPRING_AI", title: "스프링 AI" },
  "API 설계 및 문서화": { domain: "SPRING_API", title: "API 설계 및 문서화" },
  "자바 노트": { domain: "JAVA", title: "자바 노트" },
  "OOP 실습": { domain: "JAVA_OOP", title: "OOP 실습" },
  "DB 테이블 설계": { domain: "DB", title: "DB 테이블 설계" },
  "리액트 노트": { domain: "FRONTEND", title: "리액트 노트" },
  "라이브러리 활용": { domain: "FRONTEND_LIBRARY", title: "라이브러리 활용" },
  "도메인 분석": { domain: "FRONTEND_DOMAIN", title: "프론트 도메인 분석" },
  "JS·TS 노트": { domain: "JS_TS", title: "JS·TS 노트" },
  "기본 컴포넌트": { domain: "BASIC_COMPONENTS", title: "기본 컴포넌트" },
  "기본 화면 설계": { domain: "PKT_FRONT_LEV1", title: "기본 화면 설계" },
  "클론 코딩": { domain: "CLONE_CODING", title: "클론 코딩" },
  "프로토타입": { domain: "PROTOTYPE", title: "프로토타입" },
  "UI 챌린지": { domain: "UI_CHALLENGE", title: "UI 챌린지" },
  "AX 기초": { domain: "AX_BASIC", title: "AX 기초" },
  "AX 챌린지": { domain: "AX_CHALLENGE", title: "AX 챌린지" },
  "테스팅": { domain: "TESTING", title: "테스팅" },
  "디버깅": { domain: "DEBUGGING", title: "디버깅" },
  "CI/CD": { domain: "CI_CD", title: "CI/CD" },
  "배포": { domain: "DEPLOYMENT", title: "배포" },
  "모니터링": { domain: "MONITORING", title: "모니터링" },
  "환경·인프라": { domain: "INFRASTRUCTURE", title: "환경·인프라" },
};

export function ModuleRouter({ children }: { children: React.ReactNode; tree?: unknown }) {
  const active = useActiveModule();
  if (active === "노트 홈") return <>{children}</>;
  if (active === "설정") return <SettingsModule />;
  if (active === "통합 검색") return <SearchModule />;
  const moduleConfig = modules[active];
  if (moduleConfig) return <main className="flex min-h-0 min-w-0 flex-1"><HospitalPlaybookModule key={active} domain={moduleConfig.domain} title={moduleConfig.title} /></main>;
  return <main className="flex min-h-0 min-w-0 flex-1"><section className="module-empty"><p className="eyebrow">PKT MODULE</p><h1>{active}</h1><p>선택한 모듈을 준비하고 있습니다.</p></section></main>;
}
