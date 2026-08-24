import type { ComponentType } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { HeaderDemo } from "./header-demo";
import { Input } from "./input";
import { ModalDemo } from "./modal-demo";
import { Select } from "./select";
import { SidebarDemo } from "./sidebar-demo";
import { TableDemo } from "./table-demo";
import { Toggle } from "./toggle";
import { GALLERY_SOURCE } from "./source-map";

/** 미리보기에서 값을 바꿔볼 수 있는 prop 하나의 정의. */
export type GalleryControl =
  | { name: string; type: "select"; options: string[] }
  | { name: string; type: "boolean" }
  | { name: string; type: "text" }
  | { name: string; type: "number"; min?: number; max?: number };

export type GalleryEntry = {
  id: string;
  label: string;
  // 갤러리 컴포넌트마다 prop 모양이 달라 여기서는 느슨하게 받는다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any>;
  defaultProps: Record<string, unknown>;
  controls: GalleryControl[];
  /** 노트에 함께 보여줄 실제 소스 파일. 아래 raw 글롭의 키와 같아야 한다. */
  sourceFiles: string[];
};

/**
 * 갤러리 소스를 파일에서 그대로 읽어온다.
 * 미리보기와 노트에 실리는 코드가 같은 파일 하나에서 나오므로 둘이 갈라질 수 없다.
 */
export function getGallerySource(file: string): string {
  return GALLERY_SOURCE[file] ?? `// ${file}\n// 원본 gallery 파일을 찾을 수 없습니다.`;
}

export const GALLERY_ENTRIES: GalleryEntry[] = [
  {
    id: "button",
    label: "Button",
    Component: Button,
    defaultProps: { variant: "primary", size: "md", loading: false, children: "저장" },
    controls: [
      { name: "variant", type: "select", options: ["primary", "secondary", "ghost", "danger"] },
      { name: "size", type: "select", options: ["sm", "md", "lg"] },
      { name: "loading", type: "boolean" },
      { name: "disabled", type: "boolean" },
      { name: "children", type: "text" },
    ],
    sourceFiles: ["button.tsx", "button.css"],
  },
  {
    id: "input",
    label: "Input",
    Component: Input,
    defaultProps: { label: "LOT 번호", placeholder: "LOT-24081", size: "md", invalid: false, error: "형식이 올바르지 않습니다.", hint: "" },
    controls: [
      { name: "size", type: "select", options: ["sm", "md", "lg"] },
      { name: "invalid", type: "boolean" },
      { name: "disabled", type: "boolean" },
      { name: "label", type: "text" },
      { name: "placeholder", type: "text" },
      { name: "hint", type: "text" },
    ],
    sourceFiles: ["input.tsx", "input.css"],
  },
  {
    id: "select",
    label: "Select",
    Component: Select,
    defaultProps: { label: "공정", options: ["노광", "식각", "세정", "검사"], placeholder: "선택하세요", size: "md" },
    controls: [
      { name: "size", type: "select", options: ["sm", "md", "lg"] },
      { name: "disabled", type: "boolean" },
      { name: "label", type: "text" },
      { name: "placeholder", type: "text" },
    ],
    sourceFiles: ["select.tsx", "select.css"],
  },
  {
    id: "toggle",
    label: "Checkbox · Radio · Switch",
    Component: Toggle,
    defaultProps: { kind: "checkbox", label: "이상 LOT만 보기", checked: true, disabled: false },
    controls: [
      { name: "kind", type: "select", options: ["checkbox", "radio", "switch"] },
      { name: "checked", type: "boolean" },
      { name: "disabled", type: "boolean" },
      { name: "label", type: "text" },
    ],
    sourceFiles: ["toggle.tsx", "toggle.css"],
  },
  {
    id: "badge",
    label: "Badge",
    Component: Badge,
    defaultProps: { tone: "info", size: "md", dot: true, children: "진행" },
    controls: [
      { name: "tone", type: "select", options: ["neutral", "info", "success", "warning", "danger"] },
      { name: "size", type: "select", options: ["sm", "md"] },
      { name: "dot", type: "boolean" },
      { name: "children", type: "text" },
    ],
    sourceFiles: ["badge.tsx", "badge.css"],
  },
  {
    id: "table",
    label: "Table",
    Component: TableDemo,
    defaultProps: { rowCount: 5, compact: false, striped: true, hover: true },
    controls: [
      { name: "rowCount", type: "number", min: 0, max: 5 },
      { name: "compact", type: "boolean" },
      { name: "striped", type: "boolean" },
      { name: "hover", type: "boolean" },
    ],
    sourceFiles: ["table.tsx", "table.css", "table-demo.tsx"],
  },
  {
    id: "modal",
    label: "Modal · Drawer",
    Component: ModalDemo,
    defaultProps: { kind: "modal", side: "right", open: true, title: "LOT 삭제", description: "되돌릴 수 없습니다." },
    controls: [
      { name: "kind", type: "select", options: ["modal", "drawer"] },
      { name: "side", type: "select", options: ["right", "left"] },
      { name: "open", type: "boolean" },
      { name: "title", type: "text" },
      { name: "description", type: "text" },
    ],
    sourceFiles: ["modal.tsx", "modal.css", "modal-demo.tsx"],
  },
  {
    id: "header",
    label: "Header",
    Component: HeaderDemo,
    defaultProps: { sticky: true, dense: false, search: true },
    controls: [
      { name: "sticky", type: "boolean" },
      { name: "dense", type: "boolean" },
      { name: "search", type: "boolean" },
    ],
    sourceFiles: ["header.tsx", "header.css", "header-demo.tsx"],
  },
  {
    id: "sidebar",
    label: "Sidebar",
    Component: SidebarDemo,
    // label은 nav의 aria-label로만 들어가 화면에 아무 변화가 없다. 컨트롤로 두면 고장처럼 보여 뺐다.
    defaultProps: { collapsed: false, dense: false },
    controls: [
      { name: "collapsed", type: "boolean" },
      { name: "dense", type: "boolean" },
    ],
    sourceFiles: ["sidebar.tsx", "sidebar.css", "sidebar-demo.tsx"],
  },
];

export function findGalleryEntry(id: string): GalleryEntry | undefined {
  return GALLERY_ENTRIES.find((entry) => entry.id === id);
}
