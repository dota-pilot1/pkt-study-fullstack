import { getCurrentUser } from "@/server/auth";
import { LoginPanel } from "../components/LoginPanel";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black tracking-[0.16em] text-blue-600">PKT STUDY</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">다시 로그인해 주세요</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">세션이 만료되었거나 인증 정보가 없습니다.</p>
        <div className="mt-6"><LoginPanel user={user} /></div>
      </section>
    </main>
  );
}
