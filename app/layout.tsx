import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "カメラ認証AI",
  description: "カメラで書類を読み取り、CSVデータと自動照合するAIアプリケーション",
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






