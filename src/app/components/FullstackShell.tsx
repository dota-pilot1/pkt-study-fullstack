"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Boxes, Database, Factory, GraduationCap, LayoutDashboard, LayoutGrid, Leaf, LogOut,
  MousePointerClick, Navigation, Settings, SquarePen, User, Workflow, type LucideIcon,
} from "lucide-react";
import { ContentRefreshProvider } from "@/shared/lib/content-refresh";
import { RailToggleProvider } from "@/shared/lib/rail-toggle";
import { ToastProvider } from "@/shared/ui/toast";

type RailGroup = "core" | "backend" | "frontend" | "design";
type RailItem = { label: string; icon: LucideIcon; group: RailGroup };

const railGroups: Array<{ id: RailGroup; label: string | null }> = [
  { id: "core", label: null }, { id: "backend", label: "백엔드" },
  { id: "frontend", label: "프론트" }, { id: "design", label: "디자인" },
];
const railItems: RailItem[] = [
  { label: "노트 홈", icon: LayoutDashboard, group: "core" },
  { label: "스프링 노트", icon: Leaf, group: "backend" },
  { label: "DB 테이블 설계", icon: Database, group: "backend" },
  { label: "리액트 노트", icon: Workflow, group: "frontend" },
  { label: "기본 화면 설계", icon: GraduationCap, group: "frontend" },
  { label: "공통 컴포넌트", icon: Boxes, group: "design" },
  { label: "메뉴·네비게이션", icon: Navigation, group: "design" },
  { label: "폼·유효성 검사", icon: SquarePen, group: "design" },
  { label: "레이아웃·페이지", icon: LayoutGrid, group: "design" },
  { label: "인터랙션·상태", icon: MousePointerClick, group: "design" },
];
const groupBand: Record<RailGroup, string | undefined> = {
  core: undefined, backend: "#b45309", frontend: "#059669", design: "#7c3aed",
};

const ActiveModuleContext = createContext("노트 홈");
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
const RAIL_COLLAPSED_KEY = "pkt.study.railCollapsed.v2";

type ShellUser = {
  username: string;
  email: string;
  role: { name: string };
};

type WindowResizeDirection = "East" | "North" | "NorthEast" | "NorthWest" | "South" | "SouthEast" | "SouthWest" | "West";

const windowResizeHandles: Array<{
  direction: WindowResizeDirection;
  className: string;
  cursor: string;
}> = [
  { direction: "North", className: "inset-x-2 top-0 h-1.5", cursor: "n-resize" },
  { direction: "South", className: "inset-x-2 bottom-0 h-1.5", cursor: "s-resize" },
  { direction: "West", className: "bottom-2 left-0 top-2 w-1.5", cursor: "w-resize" },
  { direction: "East", className: "bottom-2 right-0 top-2 w-1.5", cursor: "e-resize" },
  { direction: "NorthWest", className: "left-0 top-0 size-3", cursor: "nw-resize" },
  { direction: "NorthEast", className: "right-0 top-0 size-3", cursor: "ne-resize" },
  { direction: "SouthWest", className: "bottom-0 left-0 size-3", cursor: "sw-resize" },
  { direction: "SouthEast", className: "bottom-0 right-0 size-3", cursor: "se-resize" },
];

function WindowResizeHandles() {
  const isTauri = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window,
    () => false,
  );
  if (!isTauri) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[999]" aria-hidden="true">
      {windowResizeHandles.map(({ direction, className, cursor }) => (
        <div
          key={direction}
          className={`pointer-events-auto absolute ${className}`}
          style={{ cursor }}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            void getCurrentWindow().startResizeDragging(direction);
          }}
        />
      ))}
    </div>
  );
}

export function useActiveModule() { return useContext(ActiveModuleContext); }

export function FullstackShell({ children, user }: { children: ReactNode; user: ShellUser }) {
  const [active, setActive] = useState("노트 홈");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [contentRefreshKey, setContentRefreshKey] = useState(0);
  const [isRefreshingContent, setIsRefreshingContent] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setRailCollapsed(window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1");
    const applyHash = () => {
      const value = decodeURIComponent(window.location.hash.slice(1));
      if (value) setActive(value);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const close = (event: MouseEvent) => { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setAccountOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [accountOpen]);

  useEffect(() => () => { if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current); }, []);

  const selectModule = (label: string) => {
    setActive(label);
    window.location.hash = encodeURIComponent(label);
  };
  const toggleRail = () => {
    setRailCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
      if (next) setAccountOpen(false);
      return next;
    });
  };
  const refreshContent = () => {
    if (isRefreshingContent) return;
    setIsRefreshingContent(true);
    setContentRefreshKey((key) => key + 1);
    refreshTimerRef.current = window.setTimeout(() => { setIsRefreshingContent(false); refreshTimerRef.current = null; }, 650);
  };
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      // API 실패 여부와 관계없이 클라이언트 화면도 인증 화면으로 되돌린다.
      window.location.replace("/login");
    }
  };
  const railTint = (percent: number) => `color-mix(in srgb, var(--primary-foreground) ${percent}%, transparent)`;

  return (
    <ToastProvider><QueryClientProvider client={queryClient}><ActiveModuleContext.Provider value={active}>
      <div className="relative flex h-screen overflow-hidden">
        <nav aria-hidden={railCollapsed} className={"relative z-50 flex shrink-0 flex-col items-center text-text-on-brand transition-[width] duration-200 ease-in-out " + (railCollapsed ? "pointer-events-none w-0 overflow-hidden" : "w-[92px] overflow-visible")} style={{ backgroundImage: "linear-gradient(180deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 82%, black) 100%)" }}>
          <div className="flex h-12 w-full shrink-0 items-center justify-center border-b" style={{ borderColor: railTint(10) }}><Factory className="h-[28px] w-[28px] shrink-0" strokeWidth={2.2} /><span className="sr-only">PKT 프로젝트</span></div>
          <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto py-2">
            {railGroups.map((group) => <div key={group.id} className="flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-[18px] pb-2 pt-1.5" style={{ backgroundColor: groupBand[group.id] }}>
              {group.label && <span className="pb-0.5 text-[8.5px] font-black uppercase tracking-[0.14em] text-text-on-brand/65">{group.label}</span>}
              {railItems.filter((item) => item.group === group.id).map((item) => {
                const Icon = item.icon; const selected = item.label === active;
                return <button key={item.label} type="button" onClick={() => selectModule(item.label)} title={item.label} className={"flex min-h-[46px] w-[76px] flex-col items-center justify-center gap-1 px-1 py-1.5 transition-all duration-300 ease-in-out " + (selected ? "rounded-[13px]" : "rounded-[20px] hover:rounded-[13px] hover:bg-white/10")} style={{ backgroundColor: selected ? railTint(38) : undefined }}><Icon className="size-[19px] shrink-0" strokeWidth={2} /><span className="w-full overflow-hidden text-center text-[9.5px] font-semibold leading-[1.15] [word-break:keep-all]">{item.label}</span></button>;
              })}
            </div>)}
          </div>
          <div ref={accountRef} className="relative flex min-h-[136px] w-full flex-col items-center gap-2 border-t px-2 py-3" style={{ borderColor: railTint(10) }}>
            <button type="button" onClick={() => selectModule("설정")} title="설정" className={"flex h-[40px] w-[76px] items-center justify-center transition-all duration-200 " + (active === "설정" ? "rounded-[13px]" : "rounded-[20px] hover:rounded-[13px] hover:bg-white/10")} style={{ backgroundColor: active === "설정" ? railTint(25) : undefined }}><Settings className="size-[20px]" strokeWidth={2} /></button>
            <button type="button" onClick={() => setAccountOpen((open) => !open)} title="PKT 관리자" className="grid h-[40px] w-[76px] place-items-center rounded-[20px] border border-transparent p-0 transition-all hover:bg-white/20"><span className="grid h-[30px] w-[30px] place-items-center rounded-full border bg-surface-raised text-text-primary" style={{ borderColor: railTint(30) }}><User className="size-4" /></span></button>
            <span className="mt-0.5 select-none text-[8.5px] font-bold tabular-nums" style={{ color: railTint(85) }}>v0.1.17</span>
            {accountOpen && <div className="absolute bottom-[52px] left-[86px] z-50 w-[200px] rounded-lg border border-surface-border bg-surface-raised p-1.5 text-text-primary shadow-xl"><div className="border-b border-surface-border-soft px-2.5 py-2"><p className="truncate text-[13px] font-black">{user.username}</p><p className="truncate text-[11px] font-semibold text-text-secondary">{user.role.name}</p><p className="truncate text-[10px] text-text-secondary">{user.email}</p></div><button type="button" onClick={() => void logout()} className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-bold text-destructive hover:bg-destructive/10"><LogOut className="size-4" /> 로그아웃</button></div>}
          </div>
        </nav>
        <ContentRefreshProvider value={{ refresh: refreshContent, isRefreshing: isRefreshingContent }}><RailToggleProvider value={{ collapsed: railCollapsed, toggle: toggleRail }}>
          <div key={contentRefreshKey} className={"flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-opacity duration-300 " + (isRefreshingContent ? "opacity-60" : "opacity-100")}>{children}</div>
        </RailToggleProvider></ContentRefreshProvider>
        <WindowResizeHandles />
      </div>
    </ActiveModuleContext.Provider></QueryClientProvider></ToastProvider>
  );
}
