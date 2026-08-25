"use client";

import { Database, HardDrive, Info, MonitorCog, RefreshCw, Settings2 } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/shared/ui/PageHeader";
import { BackupPanel } from "./BackupPanel";

const APP_VERSION = "0.1.15";

const tabs = [
  { id: "general", label: "일반 설정", icon: Settings2 },
  { id: "device", label: "장치", icon: MonitorCog },
  { id: "update", label: "업데이트", icon: RefreshCw },
  { id: "data", label: "데이터", icon: Database },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SettingsModule() {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  return (
    <>
      <PageHeader>
        <Settings2 className="size-4 text-brand-primary" />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">환경 설정</span>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          <header>
            <h1 className="text-[18px] font-bold tracking-tight text-text-primary">환경 설정</h1>
            <p className="mt-1 text-[12px] text-text-secondary">앱 실행 환경과 로컬 학습 데이터를 확인합니다.</p>
          </header>

          <div role="tablist" aria-label="환경 설정 메뉴" className="mt-5 flex gap-1 overflow-x-auto border-b border-surface-border-soft">
            {tabs.map(({ id, label, icon: Icon }) => {
              const selected = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(id)}
                  className={`relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold transition-colors ${selected ? "text-brand-primary" : "text-text-muted hover:text-text-primary"}`}
                >
                  <Icon className="size-3.5" />
                  {label}
                  {selected && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-primary" />}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-3">
            {activeTab === "general" && <GeneralSettings />}
            {activeTab === "device" && <DeviceSettings />}
            {activeTab === "update" && <UpdateSettings />}
            {activeTab === "data" && <BackupPanel />}
          </div>
        </div>
      </div>
    </>
  );
}

function GeneralSettings() {
  return (
    <>
      <SettingRow label="앱 이름" value="PKT Study Fullstack" />
      <SettingRow label="실행 방식" value="Next.js + Tauri" />
      <SettingRow label="API 대상" value="현재 앱의 로컬 API (/api)" mono />
      <SettingNote>
        이 앱은 별도 외부 API 서버 대신 Next.js Route Handler를 사용합니다. 환경 변수는 서버 실행 시 적용되며,
        브라우저에서 임의로 변경할 수 없습니다.
      </SettingNote>
    </>
  );
}

function DeviceSettings() {
  return (
    <>
      <SettingRow label="장치 모드" value="직원 학습 콘솔 (STAFF)" />
      <SettingRow label="창 크기" value="1280 × 900 (최소 1024 × 700)" />
      <SettingNote>
        데스크톱 앱은 Tauri 창으로 실행됩니다. 창 크기와 리사이즈는 앱 설정에 정의되어 있으며, 장치 등록이나 KIOSK 전환은 아직 제공하지 않습니다.
      </SettingNote>
    </>
  );
}

function UpdateSettings() {
  return (
    <>
      <SettingRow label="현재 버전" value={`v${APP_VERSION}`} />
      <SettingRow label="업데이트 방식" value="Tauri 앱 릴리스" />
      <SettingNote>
        새 버전은 Tauri 릴리스 산출물로 배포됩니다. 현재 화면에서는 버전 확인만 제공하며, 앱 내부 자동 업데이트 설치는 다음 단계에서 연결합니다.
      </SettingNote>
    </>
  );
}

function SettingRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-surface-border-soft bg-surface-raised px-4 py-3">
      <span className="text-[13px] font-bold text-text-primary">{label}</span>
      <span className={`min-w-0 truncate text-right text-[13px] font-semibold text-text-secondary ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function SettingNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-md border border-surface-border-soft bg-surface-raised px-4 py-3 text-[12px] font-semibold leading-5 text-text-muted">
      <Info className="mt-0.5 size-4 shrink-0 text-brand-primary" />
      <span>{children}</span>
    </p>
  );
}

export default SettingsModule;
