"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  BookOpen,
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
  Leaf,
  Layers,
  Newspaper,
  Palette,
  Search,
  Sparkles,
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
        id: "스프링 부트",
        title: "스프링 부트",
        desc: "Spring Boot 3, JPA, DDD 계층 구조 및 RESTful API 엔드포인트 설계",
        icon: Leaf,
        tags: ["Spring Boot", "JPA", "DDD"],
      },
      {
        id: "스프링 시큐리티",
        title: "스프링 시큐리티",
        desc: "Spring Security 인증·인가와 RBAC 권한 설계",
        icon: BookOpen,
        tags: ["Security", "JWT", "RBAC"],
      },
      {
        id: "스프링 AI",
        title: "스프링 AI",
        desc: "LLM 연동, 프롬프트 설계와 Agent 활용 패턴",
        icon: Sparkles,
        tags: ["LLM", "Agent", "MCP"],
      },
      {
        id: "API 설계 및 문서화",
        title: "API 설계 및 문서화",
        desc: "REST API 계약과 읽기 쉬운 기술 문서 작성 방식",
        icon: BookOpen,
        tags: ["REST", "OpenAPI", "Docs"],
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
        id: "라이브러리 활용",
        title: "라이브러리 활용",
        desc: "팀에 맞는 라이브러리 선택과 적용 패턴",
        icon: BookOpen,
        tags: ["Library", "Pattern", "Guide"],
      },
      {
        id: "도메인 분석",
        title: "도메인 분석",
        desc: "도메인 모델과 요구사항을 화면·기능으로 구조화",
        icon: Workflow,
        tags: ["Domain", "Model", "Analysis"],
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
    id: "gallery",
    title: "컴포넌트 스케치",
    badge: "Gallery",
    badgeClass: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400",
    iconClass: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    borderClass: "hover:border-sky-500/40",
    items: [
      {
        id: "컴포넌트 스케치",
        title: "컴포넌트 스케치",
        desc: "재사용 가능한 UI 컴포넌트와 화면 패턴 실험",
        icon: Boxes,
        tags: ["Component", "UI", "Sketch"],
      },
    ],
  },
];

const TIKITAKA_PRINCIPLES: Array<{ title: string; description: string; icon: LucideIcon; iconClass: string }> = [
  {
    title: "한방 구현보다 부분 구현",
    description: "작업을 쪼개고, 구현·검증을 반복해 다음 단계로 안전하게 이어갑니다.",
    icon: Layers,
    iconClass: "bg-blue-500/10 text-blue-600",
  },
  {
    title: "잘 만든 패턴을 팀 자산화",
    description: "이해 가능한 코드와 컨벤션을 팀 표준으로 다듬고 재사용합니다.",
    icon: BookOpen,
    iconClass: "bg-violet-500/10 text-violet-600",
  },
  {
    title: "살아있는 기술 베이스",
    description: "아키텍처·API·DB·공통 컴포넌트를 Agent가 참조할 지식으로 관리합니다.",
    icon: Database,
    iconClass: "bg-emerald-500/10 text-emerald-600",
  },
  {
    title: "문제 해결 경험까지 축적",
    description: "디버깅, 기술 검증, 실패와 의사결정의 이유를 다음 개발에 다시 씁니다.",
    icon: GraduationCap,
    iconClass: "bg-amber-500/10 text-amber-600",
  },
  {
    title: "AI 레버리지를 복잡한 곳에",
    description: "반복 작업과 대규모 코드·문서·테스트·리팩터링에 AI의 힘을 집중합니다.",
    icon: Sparkles,
    iconClass: "bg-rose-500/10 text-rose-600",
  },
];

const BOOKMARKS: Array<{ name: string; description: string; href: string; icon: LucideIcon }> = [
  { name: "긱뉴스", description: "개발자 뉴스와 기술 이야기", href: "https://news.hada.io/", icon: Newspaper },
  { name: "Spring Guides", description: "Spring 공식 가이드", href: "https://spring.io/guides/", icon: Leaf },
  { name: "React Docs", description: "React 공식 학습 문서", href: "https://react.dev/learn", icon: Workflow },
  { name: "Next.js Docs", description: "Next.js 공식 문서", href: "https://nextjs.org/docs", icon: Code2 },
];

type LearningGoal = { id: number; groupName: string; task: string; skill: string; progress: number; completed: boolean; orderIdx: number };
const EMPTY_LEARNING_GOALS: LearningGoal[] = [];

async function readApiError(response: Response) {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? "요청을 처리하지 못했습니다.";
}

export function HomeModule(_props: { userName?: string; email?: string }) {
  const [activeTab, setActiveTab] = useState<"intro" | "spaces" | "goals">("intro");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [progressEdits, setProgressEdits] = useState<Record<number, number>>({});
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const goalsQuery = useQuery({
    queryKey: ["learning-goals"],
    queryFn: async () => {
      const response = await fetch("/api/learning-goals", { credentials: "same-origin" });
      if (!response.ok) throw new Error(await readApiError(response));
      return response.json() as Promise<LearningGoal[]>;
    },
  });
  const learningGoals = goalsQuery.data ?? EMPTY_LEARNING_GOALS;

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
    return learningGoals.filter((item) => {
      const matchesGroup = goalFilter === "all" || item.groupName === goalFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.task.toLowerCase().includes(q) ||
        item.skill.toLowerCase().includes(q) ||
        item.groupName.toLowerCase().includes(q) ||
        String(item.orderIdx + 1).includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [goalFilter, learningGoals, searchQuery]);

  const goalGroups = useMemo(() => {
    const set = new Set(learningGoals.map((g) => g.groupName));
    return ["all", ...Array.from(set)];
  }, [learningGoals]);

  const saveProgress = async (goal: LearningGoal, progress: number) => {
    try {
      const response = await fetch(`/api/learning-goals/${goal.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: goal.groupName, task: goal.task, skill: goal.skill, progress }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      await queryClient.invalidateQueries({ queryKey: ["learning-goals"] });
      setProgressEdits((current) => {
        const next = { ...current };
        delete next[goal.id];
        return next;
      });
      showToast(`학습 완성도를 ${progress}%로 저장했습니다.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "학습 완성도를 저장하지 못했습니다.", "error");
    }
  };

  return (
    <>
      <PageHeader>
        <LayoutDashboard className="size-4 text-brand-primary" />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">티키타카 노트</span>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted">
        <div className="w-full px-5 py-6 space-y-6 xl:px-7">
          {/* Top Banner Card */}
          <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-raised p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-glass px-3 py-1 text-[11px] font-bold text-brand-primary">
                    <Sparkles className="size-3.5" /> 티키타카 노트
                  </span>
                  <span className="rounded-full border border-surface-border bg-surface-muted px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-text-secondary">
                    v{packageJson.version}
                  </span>
                  <span className="text-[11px] font-medium text-text-muted">· 직원 학습 콘솔</span>
                </div>

                <h1 className="text-[22px] font-black tracking-tight text-text-primary sm:text-[24px]">
                  팀의 개발 방식을 Agent가 반복해서 잘 일하게 만드는 지식 기반
                </h1>

                <p className="text-[12.5px] leading-relaxed text-text-secondary">
                  작업을 쪼개고, 검증하고, 잘 만든 패턴을 축적해 사람과 AI가 같은 방식으로 다음 구현을 이어갑니다.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <div className="hidden h-[104px] w-[150px] overflow-hidden sm:block" aria-label="로봇과 노트가 대화하는 티키타카 노트 마스코트">
                  <Image src="/tikitaka-mascot.png" alt="로봇과 노트가 말풍선 공을 주고받는 모습" width={1254} height={1254} priority className="h-full w-full scale-[1.2] object-contain" />
                </div>
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
                  <p className="text-[12px] font-bold text-text-primary">부분 구현 · 빠른 검증</p>
                  <p className="truncate text-[11px] text-text-muted">작업을 쪼개고 다음 단계로 연결</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-surface-border-soft bg-surface-muted/50 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
                  <Palette className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-text-primary">팀 구현 패턴 자산화</p>
                  <p className="truncate text-[11px] text-text-muted">코드·컨벤션·예제를 팀 표준으로</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-surface-border-soft bg-surface-muted/50 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Sparkles className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-text-primary">Agent가 참조하는 기술 베이스</p>
                  <p className="truncate text-[11px] text-text-muted">필요한 지식을 MCP로 반복 공급</p>
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
                    onClick={() => setActiveTab("intro")}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition-all ${
                      activeTab === "intro"
                        ? "bg-brand-primary text-text-on-brand shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Layers className="size-3.5" />
                    <span>티키타카 노트</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("spaces")}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition-all ${
                      activeTab === "spaces"
                        ? "bg-brand-primary text-text-on-brand shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <BookOpen className="size-3.5" />
                    <span>노트 둘러보기</span>
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${activeTab === "spaces" ? "bg-white/20 text-white" : "bg-surface-muted text-text-muted"}`}>
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
                      {learningGoals.length}
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
              {activeTab === "intro" && (
                <section className="overflow-hidden rounded-xl border border-brand-border bg-surface-raised shadow-sm">
                    <div className="border-b border-brand-border bg-brand-glass px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-primary px-2.5 py-1 text-[11px] font-black tracking-wide text-text-on-brand">TIKITAKA DEVELOPMENT NOTE</span>
                        <span className="text-[12px] font-semibold text-brand-primary">코드를 맡기는 도구를 넘어, 팀의 개발 방식을 구조화합니다.</span>
                      </div>
                      <h2 className="mt-3 text-[22px] font-black tracking-tight text-text-primary">사람과 Agent가 같은 맥락으로 다음 구현을 이어가는 방법</h2>
                      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text-secondary">개발 노트는 단순 기록이 아니라 구현 패턴, 기술 결정, 검증 경험을 모아 Agent가 반복해서 참고하는 팀의 지식 기반입니다.</p>
                    </div>
                    <div className="grid gap-px bg-surface-border-soft sm:grid-cols-2 xl:grid-cols-5">
                      {TIKITAKA_PRINCIPLES.slice(0, 4).map(({ title, description, icon: Icon, iconClass }) => (
                        <article key={title} className="bg-surface-raised p-5">
                          <span className={`grid size-9 place-items-center rounded-lg ${iconClass}`}><Icon className="size-[18px]" /></span>
                          <h3 className="mt-3 text-[15px] font-black leading-snug text-text-primary">{title}</h3>
                          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{description}</p>
                        </article>
                      ))}
                    </div>
                    {(() => {
                      const { title, description, icon: Icon, iconClass } = TIKITAKA_PRINCIPLES[4];
                      return (
                        <article className="border-t border-surface-border-soft bg-surface-raised p-5">
                          <span className={`grid size-9 place-items-center rounded-lg ${iconClass}`}><Icon className="size-[18px]" /></span>
                          <h3 className="mt-3 text-[15px] font-black leading-snug text-text-primary">{title}</h3>
                          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{description}</p>
                        </article>
                      );
                    })()}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border-soft bg-surface-muted/70 px-5 py-3">
                      <p className="text-[14px] font-bold text-text-primary">티키타카 개발 노트 = 사람과 Agent의 티키타카를 팀의 개발 생산성으로 연결하는 AI 시대의 전술 전략 노트</p>
                      <span className="text-[12.5px] font-semibold text-text-muted">작업 분해 → 부분 구현 → 검증 → 패턴 축적</span>
                    </div>
                </section>
              )}

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
                      {goalsQuery.isLoading ? "학습 과제를 불러오는 중..." : `총 ${filteredGoals.length}개 과제`}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] border-collapse text-left text-[12px]">
                        <thead className="bg-surface-muted text-[11px] font-bold uppercase text-text-secondary">
                          <tr>
                            <th className="w-14 px-3.5 py-2.5 text-center">No</th>
                            <th className="w-28 px-3.5 py-2.5">분류</th>
                            <th className="px-3.5 py-2.5">과제명</th>
                            <th className="px-3.5 py-2.5">핵심 스킬</th>
                            <th className="w-64 px-3.5 py-2.5">학습 완성도</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border-soft">
                          {filteredGoals.map((g) => {
                            const progress = progressEdits[g.id] ?? g.progress;
                            return <tr key={g.id} className="transition-colors hover:bg-brand-glass/25">
                              <td className="px-3.5 py-2.5 text-center font-black tabular-nums text-text-muted">
                                {String(g.orderIdx + 1).padStart(2, "0")}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="inline-block rounded border border-surface-border bg-surface-muted px-1.5 py-0.5 text-[10.5px] font-bold text-text-secondary">
                                  {g.groupName}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-bold text-text-primary">
                                <span className={progress === 100 ? "text-text-muted line-through" : undefined}>{g.task}</span>
                                {progress === 100 && <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">완료</span>}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="inline-block rounded bg-brand-glass px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-primary">
                                  {g.skill}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={progress}
                                    onChange={(event) => setProgressEdits((current) => ({ ...current, [g.id]: Number(event.target.value) }))}
                                    onMouseUp={() => void saveProgress(g, progress)}
                                    onTouchEnd={() => void saveProgress(g, progress)}
                                    onKeyUp={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) void saveProgress(g, progress); }}
                                    aria-label={`${g.task} 학습 완성도`}
                                    className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--primary)]"
                                  />
                                  <span className="w-9 text-right text-[11px] font-black tabular-nums text-brand-primary">{progress}%</span>
                                </div>
                              </td>
                            </tr>
                          })}
                          {!goalsQuery.isLoading && filteredGoals.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-[12px] text-text-muted">
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
              {/* Developer Bookmarks */}
              <div className="rounded-xl border border-surface-border bg-surface-raised p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2.5 border-b border-surface-border-soft">
                  <h3 className="text-[12.5px] font-black text-text-primary">즐겨찾기</h3>
                  <span className="text-[10.5px] text-text-muted">개발 자료</span>
                </div>
                <div className="mt-2.5 space-y-1">
                  {BOOKMARKS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-muted hover:text-brand-primary"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="size-3.5 text-text-muted" />
                          <span><span className="block text-[12px] font-semibold">{item.name}</span><span className="block text-[9.5px] text-text-muted">{item.description}</span></span>
                        </div>
                        <ArrowUpRight className="size-3 text-text-muted" />
                      </a>
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
                    <span className="font-bold text-text-primary">{learningGoals.length}개</span>
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
