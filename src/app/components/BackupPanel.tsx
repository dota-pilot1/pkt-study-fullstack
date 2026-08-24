"use client";

import { useState } from "react";

export function BackupPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function downloadBackup() {
    setDownloading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/backup", { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? `백업 다운로드에 실패했습니다. (${response.status})`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? "pkt-study-backup.db";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      const size = `${(blob.size / 1024).toFixed(1)} KB`;
      setMessage(`백업 다운로드가 완료되었습니다: ${filename} (${size})`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "백업 다운로드에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  async function restore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("backup") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return setMessage("백업 파일을 선택해 주세요.");
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch("/api/backup/restore", { method: "POST", body: form });
      const body = await response.json().catch(() => null) as { message?: string } | null;
      setMessage(body?.message ?? "복구 요청이 완료되지 않았습니다.");
    } catch {
      setMessage("복구 파일 확인 중 연결 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return <section>
    <h2>데이터 백업·복구</h2>
    <div className="backup-actions">
      <button type="button" onClick={downloadBackup} disabled={downloading}>
        {downloading ? "백업 생성 중…" : "SQLite 백업 다운로드"}
      </button>
      <form onSubmit={restore}>
        <input name="backup" type="file" accept=".db,.sqlite" />
        <button type="submit" disabled={busy}>{busy ? "확인 중…" : "복구 파일 확인"}</button>
      </form>
    </div>
    <p className="hint">복구는 현재 DB를 즉시 덮지 않고, 앱을 재시작할 때 적용됩니다.</p>
    {message ? <p className={message.includes("실패") || message.includes("오류") ? "error" : "saved"} role="status">{message}</p> : null}
  </section>;
}
