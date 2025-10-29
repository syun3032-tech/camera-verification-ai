import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "議事録作成AI",
  description: "音声から自動で議事録を作成するAIアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}






