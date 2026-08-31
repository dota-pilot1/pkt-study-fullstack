import type { Metadata } from "next";
import "./styles.css";
import "./playbook.css";

export const metadata: Metadata = {
  title: "티키타카 노트",
  description: "AI와 대화하며 함께 완성하는 학습 노트",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
