import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prepareTauriSidecar } from "./prepare-tauri-sidecar.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticDir = path.join(projectRoot, ".next", "static");
const publicDir = path.join(projectRoot, "public");
const distDir = path.join(projectRoot, "dist");

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
writeFileSync(
  path.join(distDir, "index.html"),
  `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PKT Study</title><style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#f4f7fb;color:#475569;font:600 14px system-ui,sans-serif}.spinner{width:24px;height:24px;margin:auto auto 12px;border:3px solid #cbd5e1;border-top-color:#0878c8;border-radius:50%;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}</style><body><main><div class="spinner"></div>PKT Study를 시작하는 중입니다.</main></body></html>`,
);

// Keep the packaged server outside `.next`, which is cleared by `next dev`.
cpSync(standaloneDir, path.join(distDir, "next"), { recursive: true });

// Bundle the exact Node runtime used for this native target as a Tauri sidecar.
prepareTauriSidecar();
console.log("Prepared Next standalone server and Node sidecar.");
