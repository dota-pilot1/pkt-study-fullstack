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
