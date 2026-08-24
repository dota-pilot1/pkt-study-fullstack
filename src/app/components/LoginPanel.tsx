"use client";

import { FormEvent, useState } from "react";

type User = { email: string; username: string; role: { name: string } };

export function LoginPanel({ user }: { user: User | null }) {
  const [email, setEmail] = useState("terecal@daum.net");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  if (user) {
    return <div className="auth-status"><span><strong>{user.username}</strong> · {user.role.name} · {user.email}</span><button type="button" onClick={logout}>로그아웃</button></div>;
  }

  return (
    <section>
      <h2>로컬 인증</h2>
      <form onSubmit={submit}>
        <div className="form-row auth-row">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일" required />
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호" required />
          <button type="submit" disabled={busy}>{busy ? "로그인 중…" : "로그인"}</button>
        </div>
      </form>
      {error ? <p className="error" role="alert">{error}</p> : <p className="hint">개발용 기본 계정: terecal@daum.net / password123</p>}
    </section>
  );
}
