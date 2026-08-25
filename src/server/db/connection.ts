import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const configuredDataDirectory = process.env.PKT_STUDY_DATA_DIR;
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";
export const dataDirectory = configuredDataDirectory
  ? path.resolve(configuredDataDirectory)
  : isNextBuild
    ? path.join(os.tmpdir(), `pkt-study-build-${process.pid}`)
    : path.join(process.cwd(), ".data");
export const databasePath = path.join(dataDirectory, "pkt-study.db");
export const pendingRestorePath = path.join(dataDirectory, "pkt-study.restore-pending.db");

fs.mkdirSync(dataDirectory, { recursive: true });

if (fs.existsSync(pendingRestorePath)) {
  const restoreProbe = new Database(pendingRestorePath, { readonly: true });
  const hasUsers = restoreProbe.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  const hasSpaces = restoreProbe.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'playbook_spaces'").get();
  restoreProbe.close();
  if (hasUsers && hasSpaces) {
    if (fs.existsSync(databasePath)) fs.copyFileSync(databasePath, `${databasePath}.before-restore`);
    fs.renameSync(pendingRestorePath, databasePath);
  } else {
    fs.unlinkSync(pendingRestorePath);
  }
}

export const sqlite = new Database(databasePath);
sqlite.pragma("busy_timeout = 10000");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
