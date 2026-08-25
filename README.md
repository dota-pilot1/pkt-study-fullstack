# PKT Study Fullstack

PKT 학습 노트를 Next.js, SQLite, TanStack Query, Lexical, Tauri로 구성한 독립 애플리케이션입니다.

## Development

```bash
npm install
npm run dev
```

웹 개발 서버는 `http://localhost:4300`에서 실행됩니다.

```bash
npm run tauri dev
```

## Verification

```bash
npm run lint
npm run build
```

로컬 SQLite 데이터와 백업은 `.data/`에 저장되며 Git에 포함되지 않습니다.
## SQLite 데이터 보존

로컬 실행은 프로젝트 루트의 `.data/pkt-study.db`를 사용합니다. Tauri 릴리즈 빌드에서는 이 DB를 첫 실행용 seed로 패키징하고, 설치 앱은 Tauri의 사용자 데이터 경로에 DB를 복사해 사용합니다. 따라서 앱 업데이트·재설치로 앱 번들이 교체되어도 사용자 노트는 유지됩니다.

설치 앱의 백업·복원은 앱 내부 설정의 SQLite 백업 기능을 사용합니다. `PKT_STUDY_DATA_DIR`는 Tauri가 자동으로 주입하며, 릴리즈 업데이트에서 이 값을 앱 번들 경로로 변경하면 안 됩니다.
