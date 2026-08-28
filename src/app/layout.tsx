import type { Metadata } from "next";
import "./styles.css";
import "./playbook.css";

export const metadata: Metadata = {
  title: "Design Playbook",
  description: "공통 UI 시스템 갤러리",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
