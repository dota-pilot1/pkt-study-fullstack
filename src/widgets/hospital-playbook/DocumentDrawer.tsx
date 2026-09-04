/* eslint-disable react-hooks/set-state-in-effect -- drawer state resets when the selected document changes. */
import { BookmarkButton } from "@/features/hospital-playbook/bookmarks";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clipboard, Copy, ExternalLink, GitBranch, Link2, Loader2, Pencil, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaybookDocument, PlaybookDocumentSummary } from "../../features/hospital-playbook/api";
import { playbookApi } from "../../features/hospital-playbook/api";
import { lexicalToMarkdown } from "../../features/hospital-playbook/lexicalToMarkdown";
import { ApiError, getApiBase } from "../../shared/api/client";
import { copyToClipboard } from "../../shared/lib/clipboard";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import { useToast } from "../../shared/ui/toast";
import DocumentComments from "./DocumentComments";
import DocumentLocationDialog from "./DocumentLocationDialog";
import DocumentPane from "./DocumentPane";

const DRAWER_SIZE_KEY = "pkt-study-document-drawer-size";
const DRAWER_SIZES = [
  { label: "S", value: 40 },
  { label: "M", value: 60 },
  { label: "L", value: 80 },
  { label: "XL", value: 92 },
] as const;

function storedDrawerSize() {
  const value = Number(window.localStorage.getItem(DRAWER_SIZE_KEY));
  return DRAWER_SIZES.some((size) => size.value === value) ? value : 60;
}

/** 문서를 읽고 같은 드로어 안에서 바로 수정할 수 있는 우측 드로어. */
function DocumentDrawer({
  document,
  previous,
  next,
  onNavigate,
  onDelete,
  onClose,
  onOpenPage,
  onOpenContextApi,
  onChanged,
  documents,
  onMove,
  deleting = false,
  deleteError,
  loading = false,
  canDelete = true,
}: {
  document: PlaybookDocument;
  previous?: PlaybookDocument;
  next?: PlaybookDocument;
  onNavigate: (document: PlaybookDocument) => void;
  onDelete: () => void;
  onClose: () => void;
  onOpenPage?: () => void;
  onOpenContextApi: () => void;
  onChanged: () => void;
  documents: PlaybookDocumentSummary[];
  onMove: (parentId: number | null) => Promise<void>;
  deleting?: boolean;
  deleteError?: string;
  loading?: boolean;
  canDelete?: boolean;
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [drawerSize, setDrawerSize] = useState(storedDrawerSize);
  const { showToast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [contentCopied, setContentCopied] = useState(false);
  const [lookupCopied, setLookupCopied] = useState(false);
  const [updateCopied, setUpdateCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClosing(false);
    setIsEditing(false);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchMatchIndex(0);
    setSearchMatchCount(0);
  }, [document.id]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchMatchIndex(0);
    setSearchMatchCount(0);
  }, []);

  const openSearch = useCallback(() => {
    if (isEditing || !document.content.trim()) return;
    setSearchOpen(true);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [document.content, isEditing]);

  const selectSearchMatch = (index: number) => {
    if (!searchMatchCount) return;
    setSearchMatchIndex((index + searchMatchCount) % searchMatchCount);
  };

  const moveSearchMatch = (direction: 1 | -1) => {
    selectSearchMatch(searchMatchIndex + direction);
  };

  const copyShareLink = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const { token } = await playbookApi.shareDocument(document.id);
      const url = `${getApiBase()}/api/public/hospital-playbook/documents/${token}`;
      await copyToClipboard(url);
      setShareCopied(true);
      showToast("공유 링크를 복사했습니다.");
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (error) {
      showToast(error instanceof ApiError ? `공유 링크 발급 실패: ${error.message}` : "클립보드에 복사하지 못했습니다.", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const copyDocumentContent = async () => {
    try {
      const markdown = lexicalToMarkdown(document.content);
      await copyToClipboard([`# ${document.title}`, "", markdown].join("\n"));
      setContentCopied(true);
      showToast("문서 내용을 복사했습니다.");
      window.setTimeout(() => setContentCopied(false), 1800);
    } catch (error) {
      showToast(error instanceof ApiError ? `내용 복사 실패: ${error.message}` : "문서 내용을 클립보드에 복사하지 못했습니다.", "error");
    }
  };

  const copyDocumentLookup = async () => {
    const url = `${window.location.origin}${getApiBase()}/api/llm/hospital-playbook/documents/${document.id}`;
    try {
      await copyToClipboard([`GET ${url}`, "", "현재 문서의 제목·Lexical 본문·parentId·최신 version을 조회합니다."].join("\n"));
      setLookupCopied(true);
      showToast("문서 조회 URL과 설명을 복사했습니다.");
      window.setTimeout(() => setLookupCopied(false), 1800);
    } catch {
      showToast("문서 조회 정보를 클립보드에 복사하지 못했습니다.", "error");
    }
  };

  const copyDocumentUpdate = async () => {
    const url = `${window.location.origin}${getApiBase()}/api/llm/hospital-playbook/documents/${document.id}/content`;
    try {
      await copyToClipboard([
        `PATCH ${url}`,
        "",
        "현재 문서의 제목과 Lexical 본문을 저장합니다.",
        `expectedVersion: ${document.version}`,
        `parentId: ${document.parentId ?? "null"}`,
      ].join("\n"));
      setUpdateCopied(true);
      showToast("문서 수정 URL과 저장 정보를 복사했습니다.");
      window.setTimeout(() => setUpdateCopied(false), 1800);
    } catch {
      showToast("문서 수정 정보를 클립보드에 복사하지 못했습니다.", "error");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "f" &&
        !isEditing &&
        document.content.trim()
      ) {
        event.preventDefault();
        openSearch();
        return;
      }
      if (event.key === "Escape") {
        if (searchOpen) {
          closeSearch();
          return;
        }
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [document.content, isEditing, searchOpen, handleClose, closeSearch, openSearch]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/25 ${
        isClosing ? "animate-drawer-fade-out" : "animate-drawer-fade-in"
      }`}
      onMouseDown={handleClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${document.title} 상세 보기`}
        onMouseDown={(event) => event.stopPropagation()}
        className={`relative flex h-full w-full max-w-[760px] flex-col border-l border-surface-border bg-surface-raised shadow-2xl transition-[width] duration-300 ease-in-out ${
          isClosing ? "animate-drawer-slide-out" : "animate-drawer-slide-in"
        }`}
        style={{ width: `${drawerSize}vw`, maxWidth: "none" }}
      >
        {loading && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-surface-raised/75 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-4 py-3 text-sm font-bold text-text-secondary shadow-lg">
              <Loader2 className="size-4 animate-spin text-brand-primary" />
              문서를 불러오는 중...
            </div>
          </div>
        )}
        {/* 패널 사이드 일체형 도구 레일 */}
        <div
          className="absolute left-0 top-28 z-20 flex -translate-x-full flex-col items-center rounded-l-xl border border-r-0 border-surface-border bg-surface-raised p-1 shadow-[-4px_0_14px_rgba(0,0,0,0.07)]"
          aria-label="상세 패널 도구"
        >
          <button
            type="button"
            className={`grid size-7.5 place-items-center rounded-lg text-xs font-black transition-all ${
              searchOpen
                ? "border border-emerald-500 bg-white text-emerald-600 shadow-xs scale-105"
                : "border border-transparent text-text-muted hover:bg-surface-muted hover:text-text-primary"
            }`}
            onClick={searchOpen ? closeSearch : openSearch}
            disabled={isEditing || !document.content.trim()}
            title="본문 검색 (⌘/Ctrl+F)"
            aria-label="본문 검색"
            aria-pressed={searchOpen}
          >
            <Search className="size-3.5" />
          </button>
          <div className="my-1 h-px w-5 bg-surface-border-soft" />
          {DRAWER_SIZES.map((size) => {
            const selected = drawerSize === size.value;
            return (
              <button
                key={size.label}
                type="button"
                aria-label={`드로워 크기 ${size.label} (${size.value}%)`}
                title={`너비 ${size.label} (${size.value}%)`}
                aria-pressed={selected}
                onClick={() => {
                  setDrawerSize(size.value);
                  window.localStorage.setItem(DRAWER_SIZE_KEY, String(size.value));
                }}
                className={`grid size-7.5 place-items-center rounded-lg text-xs font-black transition-all ${
                  selected
                    ? "bg-brand-primary text-white shadow-xs scale-105"
                    : "text-text-muted hover:bg-surface-muted hover:text-text-primary"
                }`}
              >
                {size.label}
              </button>
            );
          })}

        </div>
        <header className="flex shrink-0 items-center gap-3 border-b border-surface-border px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-brand-primary">개발 노트 · {isEditing ? "수정" : "상세 보기"}</p>
            {!isEditing && <h2 className="mt-0.5 truncate text-lg font-black text-text-primary">{document.title}</h2>}
          </div>
          <div className="drawer-action-group flex shrink-0 items-center gap-1">
            <BookmarkButton document={document} />
            <button
              type="button"
              className={`ui-icon-button size-8 ${isEditing ? "bg-brand-primary text-white" : ""}`}
              onClick={() => {
                closeSearch();
                setIsEditing(true);
              }}
              title="수정"
            >
              <Pencil className="size-4" />
            </button>
            <button type="button" className="ui-icon-button size-8" onClick={() => setLocationDialogOpen(true)} disabled={isEditing} title="문서 위치 이동" aria-label="문서 위치 이동">
              <GitBranch className="size-4" />
            </button>
            {onOpenPage && <button type="button" className="ui-icon-button size-8" onClick={onOpenPage} title="전체 페이지로 보기">
              <ExternalLink className="size-4" />
            </button>}
          </div>
          <div className="drawer-action-group flex shrink-0 items-center gap-1">
            <button type="button" className="ui-icon-button size-8 text-brand-primary" onClick={() => void copyShareLink()} disabled={isSharing} title="로그인 없이 읽는 API 링크 복사">
              {shareCopied ? <Check className="size-4" /> : <Link2 className="size-4" />}
            </button>
            <span className="ml-1 text-[10px] font-black text-text-muted">본문</span>
            <button type="button" className="ui-icon-button size-8" onClick={() => void copyDocumentContent()} title="본문 내용 복사" aria-label="본문 내용 복사">
              {contentCopied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
            </button>
            <button type="button" className="ui-icon-button h-8 gap-1 px-2 text-[10px] font-black text-brand-primary" onClick={() => void copyDocumentLookup()} title="본문 조회 URL과 설명 복사" aria-label="본문 조회 URL과 설명 복사">
              {lookupCopied ? <Check className="size-3.5" /> : <><span>조회</span><Copy className="size-3.5" /></>}
            </button>
            <button type="button" className="ui-icon-button h-8 gap-1 px-2 text-[10px] font-black text-brand-primary" onClick={() => void copyDocumentUpdate()} title="본문 수정 URL과 저장 정보 복사" aria-label="본문 수정 URL과 저장 정보 복사">
              {updateCopied ? <Check className="size-3.5" /> : <><span>수정</span><Copy className="size-3.5" /></>}
            </button>
            <button type="button" className="ui-icon-button h-8 gap-1 px-2 text-[10px] font-black text-brand-primary" onClick={onOpenContextApi} title="하위 문서 작업 API">
              <span>하위</span><span className="font-mono text-xs leading-none">{"{}"}</span>
            </button>
          </div>
          <div className="drawer-action-group drawer-action-group-danger flex shrink-0 items-center gap-1">
            {canDelete ? <button type="button" className="ui-icon-button size-8 text-destructive" onClick={() => setDeleteConfirmOpen(true)} title="삭제"><Trash2 className="size-4" /></button> : null}
            <button type="button" className="ui-icon-button size-8" onClick={handleClose} title="닫기">
              <X className="size-4" />
            </button>
          </div>
        </header>

        {searchOpen && !isEditing && (
          <div className="flex shrink-0 items-center gap-2 border-b border-surface-border-soft bg-surface-muted px-5 py-2">
            <Search className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchMatchIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeSearch();
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  moveSearchMatch(event.shiftKey ? -1 : 1);
                }
              }}
              placeholder="본문에서 검색"
              aria-label="본문에서 검색"
              className="h-8 min-w-0 flex-1 bg-transparent text-xs font-semibold text-text-primary outline-none placeholder:text-text-muted"
            />
            <span className="shrink-0 text-[11px] font-bold text-text-muted">{searchMatchCount ? `${searchMatchIndex + 1}/${searchMatchCount}` : "0/0"}</span>
            <button type="button" onClick={() => moveSearchMatch(-1)} disabled={!searchMatchCount} className="ui-icon-button size-7 disabled:opacity-35" title="이전 검색 결과" aria-label="이전 검색 결과"><ChevronUp className="size-3.5" /></button>
            <button type="button" onClick={() => moveSearchMatch(1)} disabled={!searchMatchCount} className="ui-icon-button size-7 disabled:opacity-35" title="다음 검색 결과" aria-label="다음 검색 결과"><ChevronDown className="size-3.5" /></button>
            <button type="button" onClick={closeSearch} className="ui-icon-button size-7" title="검색 닫기" aria-label="검색 닫기"><X className="size-3.5" /></button>
          </div>
        )}

        <div ref={contentRef} className="drawer-document-scroll min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {isEditing ? (
            <DocumentPane
              documentId={document.id}
              onChanged={onChanged}
              onSaved={() => setIsEditing(false)}
              onCancel={() => setIsEditing(false)}
            />
          ) : document.content.trim() ? (
            <div className="drawer-document-content overflow-hidden rounded-lg border border-surface-border-soft bg-white">
              <LexicalEditor
                key={`${document.id}-${document.version}`}
                initialState={document.content}
                onChange={() => undefined}
                readOnly
                minHeight="240px"
                searchQuery={searchOpen ? searchQuery : ""}
                searchMatchIndex={searchMatchIndex}
                searchContainerRef={contentRef}
                onSearchMatchesChange={setSearchMatchCount}
              />
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-surface-border bg-surface-muted px-6 text-center">
              <div>
                <p className="text-sm font-black text-text-primary">아직 작성된 내용이 없습니다.</p>
                <p className="mt-1 text-xs font-semibold text-text-muted">상단의 수정 버튼을 눌러 학습 내용을 작성하세요.</p>
              </div>
            </div>
          )}
          <p className="mt-3 text-right text-[11px] font-semibold text-text-muted">
            마지막 수정 {new Date(document.updatedAt).toLocaleString("ko-KR")}
          </p>
          <DocumentComments documentId={document.id} />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-surface-border px-4 py-3">
          <button
            type="button"
            className="ui-icon-button h-9 gap-1.5 px-3 text-xs font-black disabled:opacity-35"
            onClick={() => previous && onNavigate(previous)}
            disabled={isEditing || !previous}
          >
            <ChevronLeft className="size-4" /> 이전 문서
          </button>
          <button
            type="button"
            className="ui-icon-button h-9 gap-1.5 px-3 text-xs font-black disabled:opacity-35"
            onClick={() => next && onNavigate(next)}
            disabled={isEditing || !next}
          >
            다음 문서 <ChevronRight className="size-4" />
          </button>
        </footer>

        {deleteConfirmOpen && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/30 p-5">
            <div className="w-full max-w-sm rounded-lg border border-surface-border bg-surface-raised p-5 shadow-xl">
              <h3 className="text-base font-black text-text-primary">문서를 삭제할까요?</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                <strong>{document.title}</strong> 문서와 하위 문서, 댓글을 함께 삭제합니다. 삭제 후 복구할 수 없습니다.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="ui-icon-button h-9 px-3 text-xs font-black">취소</button>
                <button type="button" disabled={deleting} onClick={onDelete} className="ui-icon-button-danger h-9 px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">
                  {deleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
              {deleteError && <p className="mt-3 text-xs font-bold text-destructive">{deleteError}</p>}
            </div>
          </div>
        )}
        {locationDialogOpen && (
          <DocumentLocationDialog
            document={document}
            documents={documents}
            onClose={() => setLocationDialogOpen(false)}
            onMove={onMove}
          />
        )}
      </aside>
    </div>
  );
}

export default DocumentDrawer;
