import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

// 참조앱과 동일하게, 네이티브 신호등 대신 공용 헤더에서 창 조작을 제공한다.
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const windowControlClass =
  "flex size-8 items-center justify-center rounded-md border border-transparent text-text-muted transition-colors hover:border-surface-border-soft hover:bg-surface-muted hover:text-text-primary";

function WindowControls() {
  const win = isTauri;
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!win) return;
    let disposed = false;
    void invoke<boolean>("window_is_maximized")
      .then((value) => { if (!disposed) setMaximized(value); })
      .catch((error) => console.error("window_is_maximized failed", error));
    return () => {
      disposed = true;
    };
  }, [win]);

  const toggleMaximize = async () => {
    if (!win) return;
    try {
      const value = await invoke<boolean>("window_toggle_maximize");
      setMaximized(value);
    } catch (error) {
      console.error("window_toggle_maximize failed", error);
    }
  };

  if (!win) return null;

  return (
    <div className="flex shrink-0 items-center gap-1" data-no-drag>
      <button
        type="button"
        onClick={() => void invoke("window_minimize").catch((error) => console.error("window_minimize failed", error))}
        title="최소화"
        aria-label="최소화"
        className={windowControlClass}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="2.5" y1="6" x2="9.5" y2="6" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => void toggleMaximize()}
        title="최대화 / 복원"
        aria-label="최대화 / 복원"
        className={windowControlClass}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          {maximized ? <path d="M4 4.5h4.5v4.5M3.5 7.5V3.5H7.5" strokeLinecap="round" strokeLinejoin="round" /> : <rect x="2.5" y="2.5" width="7" height="7" rx="1.5" />}
        </svg>
      </button>
      <button
        type="button"
        onClick={() => void invoke("window_close").catch((error) => console.error("window_close failed", error))}
        title="닫기"
        aria-label="닫기"
        className={`${windowControlClass} hover:border-destructive hover:bg-destructive hover:text-destructive-foreground`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="3" y1="3" x2="9" y2="9" strokeLinecap="round" />
          <line x1="9" y1="3" x2="3" y2="9" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export default WindowControls;
