import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import { playbookApi, type PlaybookSampleKey, type PlaybookSampleSummary } from "../../features/hospital-playbook/api";

type ImplementationNoteSamplePreviewProps = {
  minHeight?: string;
  selectedKeys?: PlaybookSampleKey[];
  onSelectedKeysChange?: (keys: PlaybookSampleKey[]) => void;
};

/** DB에 저장된 노트 템플릿을 고르고, 필요한 경우 한 건만 GET으로 상세 확인한다. */
export default function ImplementationNoteSamplePreview({ minHeight = "620px", selectedKeys, onSelectedKeysChange }: ImplementationNoteSamplePreviewProps) {
  const samples = useQuery({
    queryKey: ["hospital-playbook", "samples"],
    queryFn: playbookApi.sampleDocuments,
  });
  const [previewKey, setPreviewKey] = useState<PlaybookSampleKey | null>(null);
  const [localSelectedKeys, setLocalSelectedKeys] = useState<PlaybookSampleKey[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sampleKeyDraft, setSampleKeyDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [editingRowKey, setEditingRowKey] = useState<PlaybookSampleKey | null>(null);
  const [rowTitle, setRowTitle] = useState("");
  const [rowKey, setRowKey] = useState("");
  const queryClient = useQueryClient();
  const activeSelectedKeys = selectedKeys ?? localSelectedKeys;
  const sampleKey = previewKey ?? samples.data?.[0]?.sampleKey ?? null;
  const sample = useQuery({
    queryKey: ["hospital-playbook", "sample", sampleKey],
    queryFn: () => playbookApi.sampleDocument(sampleKey!),
    enabled: sampleKey !== null,
  });

  const save = useMutation({
    mutationFn: () => {
      if (!sample.data) throw new Error("저장할 예제가 없습니다.");
      return playbookApi.updateSampleDocument(sample.data.sampleKey, {
        sampleKey: sampleKeyDraft,
        title: title.trim() || sample.data.title,
        content,
        expectedVersion: sample.data.version,
      });
    },
    onSuccess: async (updated) => {
      setEditing(false);
      setPreviewKey(updated.sampleKey);
      const nextSelected = activeSelectedKeys.map((item) => item === sample.data?.sampleKey ? updated.sampleKey : item);
      if (selectedKeys === undefined) setLocalSelectedKeys(nextSelected);
      onSelectedKeysChange?.(nextSelected);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hospital-playbook", "samples"] }),
        queryClient.removeQueries({ queryKey: ["hospital-playbook", "sample", sampleKey] }),
        queryClient.invalidateQueries({ queryKey: ["hospital-playbook", "sample", updated.sampleKey] }),
      ]);
    },
  });

  const create = useMutation({
    mutationFn: () => playbookApi.createSampleDocument(newKey, newTitle),
    onSuccess: async (created) => {
      setAdding(false);
      setNewKey("");
      setNewTitle("");
      setPreviewKey(created.sampleKey);
      await queryClient.invalidateQueries({ queryKey: ["hospital-playbook", "samples"] });
    },
  });

  const remove = useMutation({
    mutationFn: (key: PlaybookSampleKey) => playbookApi.deleteSampleDocument(key),
    onSuccess: async (_, deletedKey) => {
      setEditing(false);
      const nextSelected = activeSelectedKeys.filter((item) => item !== deletedKey);
      if (selectedKeys === undefined) setLocalSelectedKeys(nextSelected);
      onSelectedKeysChange?.(nextSelected);
      setPreviewKey(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hospital-playbook", "samples"] }),
        queryClient.removeQueries({ queryKey: ["hospital-playbook", "sample", deletedKey] }),
      ]);
    },
  });

  const saveRow = useMutation({
    mutationFn: (item: PlaybookSampleSummary) => playbookApi.updateSampleDocument(item.sampleKey, {
      sampleKey: rowKey,
      title: rowTitle.trim() || item.title,
      content: item.content,
      expectedVersion: item.version,
    }),
    onSuccess: async (updated, item) => {
      setEditingRowKey(null);
      const nextSelected = activeSelectedKeys.map((key) => key === item.sampleKey ? updated.sampleKey : key);
      if (selectedKeys === undefined) setLocalSelectedKeys(nextSelected);
      onSelectedKeysChange?.(nextSelected);
      if (previewKey === item.sampleKey) setPreviewKey(updated.sampleKey);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hospital-playbook", "samples"] }),
        queryClient.removeQueries({ queryKey: ["hospital-playbook", "sample", item.sampleKey] }),
        queryClient.invalidateQueries({ queryKey: ["hospital-playbook", "sample", updated.sampleKey] }),
      ]);
    },
  });

  const beginEdit = () => {
    if (!sample.data) return;
    setTitle(sample.data.title);
    setContent(sample.data.content);
    setSampleKeyDraft(sample.data.sampleKey);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (sample.data) {
      setTitle(sample.data.title);
      setContent(sample.data.content);
      setSampleKeyDraft(sample.data.sampleKey);
    }
    setEditing(false);
  };

  const toggle = (key: PlaybookSampleKey) => {
    const next = activeSelectedKeys.includes(key)
      ? activeSelectedKeys.filter((item) => item !== key)
      : [...activeSelectedKeys, key];
    if (selectedKeys === undefined) setLocalSelectedKeys(next);
    onSelectedKeysChange?.(next);
  };

  const beginRowEdit = (item: PlaybookSampleSummary) => {
    setEditingRowKey(item.sampleKey);
    setRowTitle(item.title);
    setRowKey(item.sampleKey);
  };

  const preview = (item: PlaybookSampleSummary) => {
    setEditing(false);
    setPreviewKey(item.sampleKey);
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-surface-border-soft bg-surface-raised px-4 py-3">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold leading-5 text-text-muted">행을 누르면 상세를 엽니다. 체크한 예제의 GET 주소만 복사합니다.</p><button type="button" onClick={() => setAdding((current) => !current)} className="ui-icon-button-brand h-8 shrink-0 px-2.5 text-[11px] font-black">{adding ? "닫기" : "+ 예제"}</button></div>
        {adding && <div className="mt-3 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3"><div className="grid gap-2 sm:grid-cols-2"><input value={newKey} onChange={(event) => setNewKey(event.target.value.toUpperCase())} placeholder="예제 키: POLICY_DOCUMENT" className="ui-input h-8 font-mono text-xs" /><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="예제 제목" className="ui-input h-8 text-xs" /></div><div className="mt-2 flex items-center justify-between gap-2"><p className="text-[10px] font-semibold text-text-muted">빈 Lexical 문서가 만들어집니다. 만든 뒤 상세에서 편집하세요.</p><button type="button" disabled={create.isPending || !newKey.trim() || !newTitle.trim()} onClick={() => create.mutate()} className="ui-icon-button-brand h-7 px-2 text-[10px] font-black disabled:opacity-50">{create.isPending ? "추가 중" : "추가"}</button></div>{create.isError && <p role="alert" className="mt-2 text-xs font-bold text-destructive">{create.error instanceof Error ? create.error.message : "예제를 추가하지 못했습니다."}</p>}</div>}
        {samples.isLoading ? <p className="mt-3 text-xs font-bold text-text-muted">예제 목록을 불러오는 중입니다.</p> : samples.isError ? <p role="alert" className="mt-3 text-xs font-bold text-destructive">예제 목록을 불러오지 못했습니다.</p> : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-surface-border-soft">
            <table className="w-full min-w-[570px] border-collapse text-left text-xs">
              <thead className="bg-surface-muted text-text-secondary"><tr><th className="w-12 px-3 py-2.5 text-center font-black">선택</th><th className="px-3 py-2.5 font-black">예제</th><th className="w-28 px-3 py-2.5 text-center font-black">관리</th></tr></thead>
              <tbody>{samples.data?.map((item) => <tr key={item.sampleKey} onClick={() => preview(item)} className={`cursor-pointer border-t border-surface-border-soft transition-colors ${sampleKey === item.sampleKey ? "bg-brand-primary/5 hover:bg-brand-primary/10" : "hover:bg-surface-muted/60"}`}>
                <td className="!align-middle px-3 py-3 text-center"><input type="checkbox" checked={activeSelectedKeys.includes(item.sampleKey)} onClick={(event) => event.stopPropagation()} onChange={() => toggle(item.sampleKey)} aria-label={item.title + " 선택"} className="size-4 accent-brand-primary" /></td>
                <td className="px-3 py-3">{editingRowKey === item.sampleKey ? <div className="grid gap-1.5 sm:grid-cols-2"><input value={rowTitle} onChange={(event) => setRowTitle(event.target.value)} aria-label={item.title + " 제목"} className="ui-input h-8 min-w-0 text-xs font-black" /><input value={rowKey} onChange={(event) => setRowKey(event.target.value.toUpperCase())} aria-label={item.title + " 키"} className="ui-input h-8 min-w-0 font-mono text-[11px]" /></div> : <><p className="font-black text-text-primary">{item.title}</p><p className="mt-1 font-mono text-[10px] text-text-muted">{item.sampleKey}</p></>}</td>
                <td className="!align-middle px-3 py-3 text-center"><div className="flex justify-center gap-1">{editingRowKey === item.sampleKey ? <><button type="button" onClick={(event) => { event.stopPropagation(); setEditingRowKey(null); }} disabled={saveRow.isPending} className="ui-icon-button h-7 px-2 text-[10px] font-black">취소</button><button type="button" onClick={(event) => { event.stopPropagation(); saveRow.mutate(item); }} disabled={saveRow.isPending || !rowTitle.trim() || !rowKey.trim()} className="ui-icon-button-brand h-7 px-2 text-[10px] font-black disabled:opacity-50">저장</button></> : <button type="button" onClick={(event) => { event.stopPropagation(); beginRowEdit(item); }} className="ui-icon-button h-7 px-2 text-[10px] font-black">수정</button>}</div>{editingRowKey === item.sampleKey && saveRow.isError && <p role="alert" className="mt-1 text-[10px] font-bold text-destructive">저장 실패</p>}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
      <div className="min-h-0 p-4">
        {!sampleKey ? <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-surface-border-soft text-sm font-bold text-text-muted">등록된 예제가 없습니다.</div> : sample.isLoading ? (
          <div className="grid min-h-[320px] place-items-center rounded-lg border border-surface-border-soft bg-surface-muted text-sm font-bold text-text-muted">샘플 노트를 불러오는 중입니다.</div>
        ) : sample.isError || !sample.data ? (
          <div role="alert" className="grid min-h-[320px] place-items-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 text-center text-sm font-bold text-destructive">구현 노트 기준 샘플을 불러오지 못했습니다. 내부 샘플 데이터를 확인해 주세요.</div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between gap-3">
              {editing ? <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2"><input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="예제 제목" className="ui-input h-8 min-w-0 text-sm font-black" /><input value={sampleKeyDraft} onChange={(event) => setSampleKeyDraft(event.target.value.toUpperCase())} aria-label="예제 키" className="ui-input h-8 min-w-0 font-mono text-xs" /></div> : <p className="min-w-0 truncate text-sm font-black text-text-primary">{sample.data.title}</p>}
              <div className="flex shrink-0 items-center gap-1.5">
                {!editing && <span className="hidden rounded bg-surface-muted px-2 py-1 font-mono text-[10px] text-text-muted xl:inline">GET /samples/{sample.data.sampleKey}</span>}
                {editing ? <><button type="button" onClick={cancelEdit} disabled={save.isPending} className="ui-icon-button h-7 px-2 text-[10px] font-black">취소</button><button type="button" onClick={() => save.mutate()} disabled={save.isPending || !title.trim()} className="ui-icon-button-brand h-7 px-2 text-[10px] font-black disabled:opacity-50">{save.isPending ? "저장 중" : "저장"}</button></> : <><button type="button" onClick={beginEdit} className="ui-icon-button h-7 px-2 text-[10px] font-black text-brand-primary">편집</button><button type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`'${sample.data.title}' 예제를 삭제할까요?`)) remove.mutate(sample.data.sampleKey); }} className="ui-icon-button h-7 px-2 text-[10px] font-black text-destructive disabled:opacity-50">삭제</button></>}
              </div>
            </div>
            {save.isError && <p role="alert" className="mb-2 text-xs font-bold text-destructive">{save.error instanceof Error ? save.error.message : "예제를 저장하지 못했습니다."}</p>}
            <LexicalEditor key={editing ? `${sampleKey}-editing-${sample.data.version}` : `${sampleKey}-${sample.data.version}`} initialState={editing ? content : sample.data.content} onChange={editing ? setContent : () => undefined} readOnly={!editing} minHeight={minHeight} scrollable />
          </>
        )}
      </div>
    </div>
  );
}
