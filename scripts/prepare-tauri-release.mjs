import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prepareTauriSidecar } from "./prepare-tauri-sidecar.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticDir = path.join(projectRoot, ".next", "static");
const publicDir = path.join(projectRoot, "public");
const distDir = path.join(projectRoot, "dist");
const loadingIllustration = path.join(projectRoot, "src-tauri", "assets", "next-loading.png");

if (!existsSync(path.join(standaloneDir, "server.js"))) {
  throw new Error("Next standalone server is missing. Run `next build` first.");
}

// Next standalone does not copy browser assets itself. It also traces the local
// SQLite directory because that path is dynamic, so never ship development data.
rmSync(path.join(standaloneDir, ".data"), { recursive: true, force: true });
rmSync(path.join(standaloneDir, ".next", "static"), { recursive: true, force: true });
cpSync(staticDir, path.join(standaloneDir, ".next", "static"), { recursive: true });
if (existsSync(publicDir)) {
  rmSync(path.join(standaloneDir, "public"), { recursive: true, force: true });
  cpSync(publicDir, path.join(standaloneDir, "public"), { recursive: true });
}

// Tauri displays this local page while the bundled Next server starts.
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
if (existsSync(loadingIllustration)) {
  cpSync(loadingIllustration, path.join(distDir, "loading.png"));
}
writeFileSync(
  path.join(distDir, "index.html"),
  `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PKT Study</title><style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background:radial-gradient(circle at 50% 42%,#183c68 0,#0a1830 42%,#050914 100%);color:#e6f4ff;font:600 15px system-ui,sans-serif}.shell{text-align:center}.illustration{display:block;width:min(52vw,420px);height:auto;margin:0 auto 18px;border-radius:28px;box-shadow:0 18px 60px #02081799}.spinner{width:22px;height:22px;margin:0 auto 12px;border:3px solid #5b7898;border-top-color:#38bdf8;border-radius:50%;animation:s .8s linear infinite}.status{color:#b8d8ef}@keyframes s{to{transform:rotate(360deg)}}</style><body><main class="shell"><img class="illustration" src="/loading.png" alt="PKT Study 시작 중"><div class="spinner"></div><div class="status">PKT Study를 시작하는 중입니다.</div></main></body></html>`,
);

// Keep the packaged server outside `.next`, which is cleared by `next dev`.
cpSync(standaloneDir, path.join(distDir, "next"), { recursive: true });

// Bundle the exact Node runtime used for this native target as a Tauri sidecar.
prepareTauriSidecar();
console.log("Prepared Next standalone server and Node sidecar.");
