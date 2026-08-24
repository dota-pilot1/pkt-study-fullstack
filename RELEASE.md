# PKT Study Fullstack 릴리즈

## 릴리즈 방식

`v*` 태그를 푸시하면 GitHub Actions가 macOS DMG와 Windows 설치 파일을 빌드해 GitHub Release에 게시합니다.

```bash
npm ci
npm run build
npm run tauri build
```

릴리즈 태그는 `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`의 버전과 일치시킵니다.

```bash
git tag v0.1.1
git push origin v0.1.1
```

현재 릴리즈는 로컬 SQLite/Next standalone 서버를 포함하는 독립형 데스크톱 앱입니다. 원본 `pkt-study-tauri`의 updater 설정은 이 프로젝트에 아직 서명 키와 updater 플러그인이 없으므로 추가하지 않았습니다.
