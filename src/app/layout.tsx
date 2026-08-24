import type { Metadata } from "next";
import "./styles.css";
import "./playbook.css";

export const metadata: Metadata = {
  title: "PKT Study Fullstack",
  description: "Tauri + Next.js + SQLite runtime proof",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
