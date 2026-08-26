"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BookOpenCheck,
  Boxes,
  Check,
  ChevronRight,
  Coffee,
  Code2,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FolderGit2,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  Leaf,
  Layers,
  MousePointerClick,
  Navigation,
  Palette,
  Search,
  Sparkles,
  SquarePen,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/shared/ui/PageHeader";
import { copyToClipboard } from "@/shared/lib/clipboard";
import { useToast } from "@/shared/ui/toast";
import packageJson from "../../../package.json";

const RELEASE_URL = "https://github.com/dota-pilot1/pkt-study-fullstack/releases/latest";
const REPOSITORY_URL = "https://github.com/dota-pilot1/pkt-study-fullstack";

interface NoteItem {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  tags: string[];
}

interface NoteGroup {
  id: string;
  title: string;
  badge: string;
  badgeClass: string;
  iconClass: string;
  borderClass: string;
  items: NoteItem[];
}

const NOTE_GROUPS: NoteGroup[] = [
  {
    id: "backend",
    title: "백엔드 아키텍처",
    badge: "Backend",
    badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    iconClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    borderClass: "hover:border-amber-500/40",
    items: [
      {
        id: "스프링 노트",
        title: "스프링 노트",
        desc: "Spring Boot 3, JPA, DDD 계층 구조 및 RESTful API 엔드포인트 설계",
        icon: Leaf,
        tags: ["Spring Boot", "JPA", "DDD"],
      },
      {
        id: "자바 노트",
        title: "자바 노트",
        desc: "Java 문법, 객체지향, 컬렉션과 Stream API를 스프링 코드와 연결해 정리",
        icon: Coffee,
        tags: ["Java", "OOP", "Collection"],
      },
      {
        id: "DB 테이블 설계",
        title: "DB 테이블 설계",
        desc: "PostgreSQL 스키마, ERD 모델링, 인덱스 최적화 및 쿼리 설계",
        icon: Database,
        tags: ["PostgreSQL", "ERD", "Schema"],
      },
    ],
  },
  {
    id: "frontend",
    title: "프론트엔드 엔지니어링",
    badge: "Frontend",
    badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    iconClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    borderClass: "hover:border-emerald-500/40",
    items: [
      {
        id: "리액트 노트",
        title: "리액트 노트",
        desc: "React 19, Next.js 16 App Router, Feature-Sliced Design 아키텍처",
        icon: Workflow,
        tags: ["React 19", "Next.js", "FSD"],
      },
      {
        id: "JS·TS 노트",
        title: "JS·TS 노트",
        desc: "map·filter·reduce부터 TypeScript 타입과 React 코드 읽기까지",
        icon: Code2,
        tags: ["JavaScript", "TypeScript", "Array"],
      },
      {
        id: "기본 화면 설계",
        title: "기본 화면 설계",
        desc: "페이지 단위 레이아웃, 와이어프레임 구조화 및 화면 전환 흐름",
        icon: GraduationCap,
        tags: ["UI Flow", "Wireframe", "UX"],
      },
    ],
  },
  {
    id: "design",
    title: "UI·UX 디자인 시스템",
    badge: "Design System",
    badgeClass: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
    iconClass: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    borderClass: "hover:border-purple-500/40",
    items: [
      {
        id: "공통 컴포넌트",
        title: "공통 컴포넌트",
        desc: "Button, Input, Badge, Dialog 등 재사용 가능한 아토믹 UI 부품",
        icon: Boxes,
        tags: ["Atomic UI", "Radix", "Tailwind"],
      },
      {
        id: "메뉴·네비게이션",
        title: "메뉴·네비게이션",
        desc: "Sidebar Rail, Header, Breadcrumb, Tab 네비게이션 패턴",
        icon: Navigation,
        tags: ["Navigation", "Rail", "Routing"],
      },
      {
        id: "폼·유효성 검사",
        title: "폼·유효성 검사",
        desc: "React Hook Form, Zod 스키마 검증, 필드 에러 상태 바인딩",
        icon: SquarePen,
        tags: ["RHF", "Zod", "Validation"],
      },
      {
        id: "레이아웃·페이지",
        title: "레이아웃·페이지",
        desc: "Grid & Flexbox 시스템, 반응형 대시보드, Master/Detail 분할",
        icon: LayoutGrid,
        tags: ["Dashboard", "Grid", "Responsive"],
      },
      {
        id: "인터랙션·상태",
        title: "인터랙션·상태",
        desc: "Loading Skeleton, 비동기 Toast, Hover 피드백 및 Empty State",
        icon: MousePointerClick,
        tags: ["Feedback", "Async UX", "Toast"],
      },
    ],
  },
  {
    id: "guide",
    title: "학습 가이드 & 문서 템플릿",
    badge: "Docs & Template",
    badgeClass: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400",
    iconClass: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    borderClass: "hover:border-sky-500/40",
    items: [
      {
        id: "샘플 노트",
        title: "샘플 노트",
        desc: "Lexical 에디터 마크다운 작성법, 코드 블록 가이드 및 문서 템플릿",
        icon: BookOpenCheck,
        tags: ["Lexical", "Markdown", "Guidelines"],
      },
    ],
  },
];

const LEARNING_GOALS = [
  { no: "01", group: "기초 UI", task: "LOT 목록 테이블 만들기", skill: "map, component, props" },
  { no: "02", group: "기초 UI", task: "LOT 상태별 Badge 표시", skill: "조건부 렌더링" },
  { no: "03", group: "기초 UI", task: "LOT 클릭 → 상세 패널 출력", skill: "useState" },
  { no: "04", group: "조회·필터", task: "LOT명/ID 검색 입력", skill: "controlled input" },
  { no: "05", group: "조회·필터", task: "공정 상태 드롭다운 필터", skill: "filter, Select" },
  { no: "06", group: "조회·필터", task: "날짜 범위 조회조건 연동", skill: "DatePicker, 상태관리" },
  { no: "07", group: "폼·검증", task: "LOT 등록 Form 구현", skill: "RHF 기초" },
  { no: "08", group: "폼·검증", task: "필수값 및 형식 유효성 검증", skill: "Zod + RHF" },
  { no: "09", group: "폼·검증", task: "LOT 수정 Modal 다이얼로그", skill: "Dialog, Form 재사용" },
  { no: "10", group: "폼·검증", task: "삭제 확인 인터랙션 Dialog", skill: "UX + mutation 기초" },
  { no: "11", group: "데이터 테이블", task: "LOT Master → 공정이력 Detail", skill: "Master/Detail 패턴" },
  { no: "12", group: "데이터 테이블", task: "공정이력 Timeline 렌더링", skill: "배열 렌더링/컴포넌트 설계" },
  { no: "13", group: "데이터 테이블", task: "공정이력 테이블 다중 정렬", skill: "sorting state" },
  { no: "14", group: "데이터 테이블", task: "테이블 컬럼 숨김/표시 제어", skill: "table column state" },
  { no: "15", group: "데이터 테이블", task: "서버 사이드 페이지네이션", skill: "server pagination" },
  { no: "16", group: "서버 비동기", task: "TanStack Query 데이터 페칭", skill: "useQuery" },
  { no: "17", group: "서버 비동기", task: "조회 조건 변경 시 자동 갱신", skill: "queryKey 캐시 설계" },
  { no: "18", group: "서버 비동기", task: "LOT 수정 후 목록 자동 무효화", skill: "useMutation + invalidate" },
  { no: "19", group: "서버 비동기", task: "Loading, Skeleton, Error UI", skill: "비동기 피드백 UX" },
  { no: "20", group: "서버 비동기", task: "검색조건 URL searchParams 동기화", skill: "URL State 동기화" },
  { no: "21", group: "고급 최적화", task: "LOT → Wafer → 공정이력 계층 탐색", skill: "Drill-down 계층 UI" },
  { no: "22", group: "고급 최적화", task: "설비 목록 + 가동상태 Dashboard", skill: "KPI 카드 + 집계 뷰" },
  { no: "23", group: "고급 최적화", task: "설비 가동상태 실시간 피드", skill: "SSE / WebSocket" },
  { no: "24", group: "고급 최적화", task: "이상 이벤트 실시간 Toast 알림", skill: "실시간 이벤트 버스" },
  { no: "25", group: "고급 최적화", task: "10,000건 대량 행 가상 스크롤", skill: "Virtualization" },
  { no: "26", group: "고급 최적화", task: "다중 행 선택 및 일괄 처리", skill: "Row Selection" },
  { no: "27", group: "고급 최적화", task: "역할 기반 버튼/기능 권한 제어", skill: "RBAC Guard" },
  { no: "28", group: "고급 최적화", task: "조회조건 전역 저장소 관리", skill: "Zustand Store" },
  { no: "29", group: "고급 최적화", task: "Excel 다운로드/업로드 파서", skill: "Blob / File API" },
  { no: "30", group: "고급 최적화", task: "PKT Mini 종합 프로젝트 완성", skill: "전체 풀스택 통합" },
];

export function HomeModule(_props: { userName?: string; email?: string }) {
  const [activeTab, setActiveTab] = useState<"spaces" | "goals">("spaces");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const totalSpacesCount = useMemo(
    () => NOTE_GROUPS.reduce((acc, g) => acc + g.items.length, 0),
    []
  );

  const navigateTo = (title: string) => {
    window.location.replace(`#${encodeURIComponent(title)}`);
  };

  const handleCopyRepo = async () => {
    try {
      await copyToClipboard(REPOSITORY_URL);
      setCopied(true);
      showToast("저장소 주소가 클립보드에 복사되었습니다.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("주소를 복사하지 못했습니다.", "error");
    }
  };

  const visibleGroups = useMemo(() => {
    if (selectedGroup === "all") return NOTE_GROUPS;
    return NOTE_GROUPS.filter((g) => g.id === selectedGroup);
  }, [selectedGroup]);

  const filteredGoals = useMemo(() => {
    return LEARNING_GOALS.filter((item) => {
      const matchesGroup = goalFilter === "all" || item.group === goalFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.task.toLowerCase().includes(q) ||
        item.skill.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.no.includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [goalFilter, searchQuery]);

  const goalGroups = useMemo(() => {
    const set = new Set(LEARNING_GOALS.map((g) => g.group));
    return ["all", ...Array.from(set)];
  }, []);

  return (
    <>
      <PageHeader>
        <LayoutDashboard className="size-4 text-brand-primary" />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">노트 홈</span>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
          {/* Top Banner Card */}
          <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-raised p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-glass px-3 py-1 text-[11px] font-bold text-brand-primary">
                    <Code2 className="size-3.5" /> PKT Developer Workspace
                  </span>
                  <span className="rounded-full border border-surface-border bg-surface-muted px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-text-secondary">
                    v{packageJson.version}
                  </span>
                  <span className="text-[11px] font-medium text-text-muted">· 직원 학습 콘솔</span>
                </div>

                <h1 className="text-[22px] font-black tracking-tight text-text-primary sm:text-[24px]">
                  개발 지식을 쌓고, 함께 나누는 공간
                </h1>

                <p className="text-[12.5px] leading-relaxed text-text-secondary">
                  Spring Boot 백엔드부터 Next.js 프론트엔드, UI 디자인 시스템 및 AI 실습 가이드를 통합 관리합니다.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <a
                  href={RELEASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow-md active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  <Download className="size-3.5" />
                  <span>최신 버전 다운로드</span>
                  <ArrowUpRight className="size-3 opacity-60" />
                </a>

                <div className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-muted p-1 pl-3">
                  <FolderGit2 className="size-3.5 text-text-secondary" />
                  <code className="text-[11px] font-semibold text-text-secondary">pkt-study-fullstack</code>
                  <button
                    type="button"
                    onClick={() => void handleCopyRepo()}
                    title="저장소 주소 복사"
                    className="grid size-7 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-surface-raised hover:text-brand-primary"
                  >
                    {copied ? <Check className="size-3.5 text-brand-primary" /> : <Copy className="size-3.5" />}
                  </button>
                  <a
                    href={REPOSITORY_URL}
                    target="_blank"
                    rel="noreferrer"
                    title="GitHub 저장소 열기"
                    className="grid size-7 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-surface-raised hover:text-brand-primary"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* 3 Core Highlight Badges */}
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-surface-border-soft pt-5 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-surface-border-soft bg-surface-muted/50 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                  <BookOpen className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-text-primary">개발 지식 공유</p>
                  <p className="truncate text-[11px] text-text-muted">경험과 노하우를 문서로 축적</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-surface-border-soft bg-surface-muted/50 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
                  <Palette className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-text-primary">나만의 UI 디자인</p>
                  <p className="truncate text-[11px] text-text-muted">컴포넌트와 화면 직접 실험</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-surface-border-soft bg-surface-muted/50 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Sparkles className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-text-primary">Skill · MCP 연구</p>
                  <p className="truncate text-[11px] text-text-muted">AI 도구 활용법 및 룰 정리</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Split */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
            {/* Left Content Area */}
            <div className="space-y-5">
              {/* Tab Selector & Group Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3">
                <div className="flex items-center gap-1 rounded-xl border border-surface-border bg-surface-raised p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setActiveTab("spaces")}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition-all ${
                      activeTab === "spaces"
                        ? "bg-brand-primary text-text-on-brand shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Layers className="size-3.5" />
                    <span>노트 스페이스</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        activeTab === "spaces" ? "bg-white/20 text-white" : "bg-surface-muted text-text-muted"
                      }`}
                    >
                      {totalSpacesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("goals")}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition-all ${
                      activeTab === "goals"
                        ? "bg-brand-primary text-text-on-brand shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <GraduationCap className="size-3.5" />
                    <span>학습 목표 & 로드맵</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        activeTab === "goals" ? "bg-white/20 text-white" : "bg-surface-muted text-text-muted"
                      }`}
                    >
                      {LEARNING_GOALS.length}
                    </span>
                  </button>
                </div>

                {/* Sub-filter when on Spaces */}
                {activeTab === "spaces" && (
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedGroup("all")}
                      className={`rounded-lg px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                        selectedGroup === "all"
                          ? "border border-brand-border bg-brand-glass text-brand-primary"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      전체 ({totalSpacesCount})
                    </button>
                    {NOTE_GROUPS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGroup(g.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                          selectedGroup === g.id
                            ? "border border-brand-border bg-brand-glass text-brand-primary"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {g.title.split(" ")[0]} ({g.items.length})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* TAB 1: Note Spaces Grouped Sections */}
              {activeTab === "spaces" && (
                <div className="space-y-6">
                  {visibleGroups.map((group) => (
                    <div key={group.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h2 className="text-[14px] font-black text-text-primary">{group.title}</h2>
                          <span
                            className={`rounded-full border px-2 py-0.2 text-[10px] font-bold ${group.badgeClass}`}
                          >
                            {group.badge}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-text-muted">
                          {group.items.length}개 모듈
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => navigateTo(item.id)}
                              className={`group relative flex flex-col justify-between rounded-xl border border-surface-border bg-surface-raised p-4 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] ${group.borderClass}`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`grid size-9 place-items-center rounded-lg border ${group.iconClass}`}
                                  >
                                    <Icon className="size-4.5" />
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] font-bold text-text-muted opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-brand-primary">
                                    <span>열기</span>
                                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                  </span>
                                </div>

                                <h3 className="mt-3 text-[14.5px] font-bold tracking-tight text-text-primary transition-colors group-hover:text-brand-primary">
                                  {item.title}
                                </h3>
                                <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                                  {item.desc}
                                </p>
                              </div>

                              <div className="mt-3.5 flex flex-wrap items-center gap-1 border-t border-surface-border-soft pt-2.5">
                                {item.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded bg-surface-muted px-1.5 py-0.5 text-[9.5px] font-medium text-text-muted"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: Learning Goals Roadmap */}
              {activeTab === "goals" && (
                <div className="space-y-4">
                  {/* Filter & Search Bar */}
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                      {goalGroups.map((grp) => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setGoalFilter(grp)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                            goalFilter === grp
                              ? "border-brand-primary bg-brand-glass text-brand-primary"
                              : "border-surface-border bg-surface-raised text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          {grp === "all" ? "전체" : grp}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        placeholder="과제명, 스킬 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-surface-border bg-surface-raised py-1.5 pl-8 pr-3 text-[11.5px] text-text-primary placeholder:text-text-muted focus:border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-border"
                      />
                    </div>
                  </div>

                  {/* Tasks Table */}
                  <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-sm">
                    <div className="border-b border-surface-border px-4 py-2.5 text-[11.5px] font-bold text-text-secondary">
                      총 {filteredGoals.length}개 과제
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] border-collapse text-left text-[12px]">
                        <thead className="bg-surface-muted text-[11px] font-bold uppercase text-text-secondary">
                          <tr>
                            <th className="w-14 px-3.5 py-2.5 text-center">No</th>
                            <th className="w-28 px-3.5 py-2.5">분류</th>
                            <th className="px-3.5 py-2.5">과제명</th>
                            <th className="px-3.5 py-2.5">핵심 스킬</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border-soft">
                          {filteredGoals.map((g) => (
                            <tr
                              key={g.no}
                              className="transition-colors hover:bg-brand-glass/25"
                            >
                              <td className="px-3.5 py-2.5 text-center font-black tabular-nums text-text-muted">
                                {g.no}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="inline-block rounded border border-surface-border bg-surface-muted px-1.5 py-0.5 text-[10.5px] font-bold text-text-secondary">
                                  {g.group}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-bold text-text-primary">{g.task}</td>
                              <td className="px-3.5 py-2.5">
                                <span className="inline-block rounded bg-brand-glass px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-primary">
                                  {g.skill}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filteredGoals.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-10 text-center text-[12px] text-text-muted">
                                일치하는 실습 과제가 없습니다.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Quick Info & Status */}
            <aside className="space-y-4">
              {/* Quick Jump List */}
              <div className="rounded-xl border border-surface-border bg-surface-raised p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2.5 border-b border-surface-border-soft">
                  <h3 className="text-[12.5px] font-black text-text-primary">빠른 바로가기</h3>
                  <span className="text-[10.5px] text-text-muted">주요 영역</span>
                </div>
                <div className="mt-2.5 space-y-1">
                  {[
                    { name: "스프링 노트", cat: "백엔드", icon: Leaf },
                    { name: "리액트 노트", cat: "프론트", icon: Workflow },
                    { name: "공통 컴포넌트", cat: "디자인", icon: Boxes },
                    { name: "샘플 노트", cat: "가이드", icon: BookOpenCheck },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => navigateTo(item.name)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-text-secondary transition-colors hover:bg-surface-muted hover:text-brand-primary"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="size-3.5 text-text-muted" />
                          <span>{item.name}</span>
                        </div>
                        <ArrowRight className="size-3 text-text-muted" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Box */}
              <div className="rounded-xl border border-surface-border bg-surface-raised p-4 shadow-sm">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
                  Workspace Status
                </p>
                <div className="mt-3 space-y-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">앱 프레임워크</span>
                    <span className="font-semibold text-text-primary">Next.js 16 + Tauri</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">동기화 상태</span>
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      로컬 준비됨
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">총 노트 모듈</span>
                    <span className="font-bold text-text-primary">{totalSpacesCount}개</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">실습 과제</span>
                    <span className="font-bold text-text-primary">{LEARNING_GOALS.length}개</span>
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="rounded-xl border border-surface-border-soft bg-surface-muted/70 p-4 text-[11.5px] leading-relaxed text-text-muted">
                💡 좌측 레일 메뉴 또는 카드를 클릭하면 해당 영역의 계층형 문서 편집기로 이동합니다.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
