"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, GraduationCap, LayoutDashboard, Newspaper, Search, type LucideIcon } from "lucide-react";
import PageHeader from "@/shared/ui/PageHeader";
import { useToast } from "@/shared/ui/toast";

const BOOKMARKS: Array<{ name: string; description: string; href: string; icon: LucideIcon }> = [
  { name: "긱뉴스", description: "개발자 뉴스와 기술 이야기", href: "https://news.hada.io/", icon: Newspaper },
  { name: "Spring Guides", description: "Spring 공식 가이드", href: "https://spring.io/guides/", icon: GraduationCap },
  { name: "React Docs", description: "React 공식 학습 문서", href: "https://react.dev/learn", icon: LayoutDashboard },
  { name: "Next.js Docs", description: "Next.js 공식 문서", href: "https://nextjs.org/docs", icon: Search },
];

type LearningGoal = {
  id: number;
  groupName: string;
  task: string;
  skill: string;
  progress: number;
  completed: boolean;
  orderIdx: number;
};

const EMPTY_LEARNING_GOALS: LearningGoal[] = [];

async function readApiError(response: Response) {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? "요청을 처리하지 못했습니다.";
}

export function HomeModule(_props: { userName?: string; email?: string }) {
  const [activeTab, setActiveTab] = useState<"goals" | "news">("goals");
  const [goalFilter, setGoalFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredGoals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return learningGoals.filter((goal) => {
      const matchesGroup = goalFilter === "all" || goal.groupName === goalFilter;
      const matchesQuery = !query || [goal.task, goal.skill, goal.groupName, String(goal.orderIdx + 1)]
        .some((value) => value.toLowerCase().includes(query));
      return matchesGroup && matchesQuery;
    });
  }, [goalFilter, learningGoals, searchQuery]);

  const goalGroups = useMemo(
    () => ["all", ...Array.from(new Set(learningGoals.map((goal) => goal.groupName)))],
    [learningGoals],
  );

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

      <main className="min-h-0 flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto flex w-full max-w-6xl gap-5 px-5 py-6 xl:px-7" style={{ alignItems: "flex-start" }}>
          <aside className="h-fit rounded-2xl border border-brand-border bg-surface-raised p-6 shadow-sm" style={{ flex: "0 0 31%" }}>
            <div className="flex items-center justify-center rounded-xl bg-brand-glass/60" style={{ height: "8rem" }}>
              <Image src="/tikitaka-mascot.png" alt="로봇과 노트가 대화하는 티키타카 노트 마스코트" width={1254} height={1254} priority style={{ width: "10rem", height: "8rem", objectFit: "contain" }} />
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-glass px-2.5 py-1 text-[11px] font-black text-brand-primary">
              TIKITAKA NOTE
            </span>
            <h1 className="mt-4 text-[24px] font-black leading-tight tracking-tight text-text-primary">개발의 다음 단계를 이어가는 노트</h1>
            <p className="mt-3 text-[13px] leading-6 text-text-secondary">구현 과정의 결정과 검증을 남기고, 다음 작업과 Agent가 같은 맥락에서 이어갈 수 있게 정리합니다.</p>
            <div className="mt-6 border-t border-surface-border-soft pt-4 text-[12px] leading-5 text-text-muted">
              좌측 메뉴에서 학습 영역을 열고, 현재 계획에서 진행률을 관리하세요.
            </div>
          </aside>

          <div className="min-w-0" style={{ flex: "1 1 0%" }}>
            <nav className="mb-5 flex items-center gap-1 border-b border-surface-border pb-3" aria-label="홈 콘텐츠">
              <button type="button" onClick={() => setActiveTab("goals")} className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition-all ${activeTab === "goals" ? "bg-brand-primary text-text-on-brand shadow-sm" : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"}`}>
                <GraduationCap className="size-3.5" /> 현재 계획
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeTab === "goals" ? "bg-white/20" : "bg-surface-raised text-text-muted"}`}>{learningGoals.length}</span>
              </button>
              <button type="button" onClick={() => setActiveTab("news")} className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition-all ${activeTab === "news" ? "bg-brand-primary text-text-on-brand shadow-sm" : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"}`}>
                <Newspaper className="size-3.5" /> 뉴스
              </button>
            </nav>

            {activeTab === "goals" && (
              <section className="space-y-4" aria-label="현재 계획">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-black tracking-tight text-text-primary">현재 계획</h2>
                <span className="rounded-full bg-brand-glass px-2 py-0.5 text-[10px] font-black text-brand-primary">{learningGoals.length}개</span>
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1">
                  {goalGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setGoalFilter(group)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${goalFilter === group ? "border-brand-primary bg-brand-glass text-brand-primary" : "border-surface-border bg-surface-raised text-text-secondary hover:text-text-primary"}`}
                    >
                      {group === "all" ? "전체" : group}
                    </button>
                  ))}
                </div>
                <label className="relative w-full sm:w-56">
                  <span className="sr-only">현재 계획 검색</span>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
                  <input type="search" placeholder="과제명, 스킬 검색..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-lg border border-surface-border bg-surface-raised py-1.5 pl-8 pr-3 text-[11.5px] text-text-primary placeholder:text-text-muted focus:border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-border" />
                </label>
              </div>

              <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-sm">
                <div className="border-b border-surface-border px-4 py-2.5 text-[11.5px] font-bold text-text-secondary">
                  {goalsQuery.isLoading ? "현재 계획을 불러오는 중..." : `총 ${filteredGoals.length}개 과제`}
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
                      {filteredGoals.map((goal) => {
                        const progress = progressEdits[goal.id] ?? goal.progress;
                        return (
                          <tr key={goal.id} className="transition-colors hover:bg-brand-glass/25">
                            <td className="px-3.5 py-2.5 text-center font-black tabular-nums text-text-muted">{String(goal.orderIdx + 1).padStart(2, "0")}</td>
                            <td className="px-3.5 py-2.5"><span className="inline-block rounded border border-surface-border bg-surface-muted px-1.5 py-0.5 text-[10.5px] font-bold text-text-secondary">{goal.groupName}</span></td>
                            <td className="px-3.5 py-2.5 font-bold text-text-primary"><span className={progress === 100 ? "text-text-muted line-through" : undefined}>{goal.task}</span>{progress === 100 && <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">완료</span>}</td>
                            <td className="px-3.5 py-2.5"><span className="inline-block rounded bg-brand-glass px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-primary">{goal.skill}</span></td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <input type="range" min="0" max="100" step="5" value={progress} onChange={(event) => setProgressEdits((current) => ({ ...current, [goal.id]: Number(event.target.value) }))} onMouseUp={() => void saveProgress(goal, progress)} onTouchEnd={() => void saveProgress(goal, progress)} onKeyUp={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) void saveProgress(goal, progress); }} aria-label={`${goal.task} 학습 완성도`} className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--primary)]" />
                                <span className="w-9 text-right text-[11px] font-black tabular-nums text-brand-primary">{progress}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!goalsQuery.isLoading && filteredGoals.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-[12px] text-text-muted">일치하는 실습 과제가 없습니다.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              </section>
            )}

            {activeTab === "news" && (
              <section aria-label="개발 뉴스와 참고 자료">
              <div className="mb-4 flex items-center gap-2">
                <Newspaper className="size-4 text-brand-primary" />
                <h2 className="text-[16px] font-black tracking-tight text-text-primary">뉴스</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {BOOKMARKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a key={item.name} href={item.href} target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised p-4 shadow-sm transition hover:border-brand-border hover:bg-brand-glass/25">
                      <span className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-brand-glass text-brand-primary"><Icon className="size-4" /></span>
                        <span><strong className="block text-[13px] text-text-primary">{item.name}</strong><span className="mt-0.5 block text-[11px] text-text-muted">{item.description}</span></span>
                      </span>
                      <ArrowUpRight className="size-4 text-text-muted transition group-hover:text-brand-primary" />
                    </a>
                  );
                })}
              </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
