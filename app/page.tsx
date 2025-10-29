"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// 初期メッセージを定数として定義（サーバーとクライアントで一致）
const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "こんにちは！議事録作成AIです。\n\n音声ファイルをアップロードしていただければ、自動で文字起こしと議事録の作成を行います。\n\nどのようなご用件でしょうか？",
  timestamp: "2025-01-01T00:00:00.000Z", // 固定値でハイドレーションエラーを回避
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // クライアント側のマウント確認
  useEffect(() => {
    setIsClient(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isClient) {
      scrollToBottom();
    }
  }, [messages, isClient]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // ファイルサイズチェック（4MB = 4 * 1024 * 1024 bytes）
      const maxSize = 4 * 1024 * 1024; // 4MB
      if (selectedFile.size > maxSize) {
        const errorMessage: Message = {
          role: "assistant",
          content: `❌ ファイルサイズが大きすぎます。\n\nアップロードされたファイル: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB\n最大サイズ: 4MB\n\n4MB以下のファイルを選択してください。`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);

        // ファイル選択をリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setFile(selectedFile);

      // ファイルが選択されたらメッセージを追加
      const userMessage: Message = {
        role: "user",
        content: `📎 音声ファイル: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);

      // 自動的に処理を開始
      processAudioFile(selectedFile);
    }
  };

  const processAudioFile = async (audioFile: File) => {
    setLoading(true);

    try {
      // 処理中メッセージを追加
      const processingMessage: Message = {
        role: "assistant",
        content: "音声ファイルを処理しています...\n\n⏳ 文字起こしを実行中",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, processingMessage]);

      // 文字起こしAPI呼び出し
      const formData = new FormData();
      formData.append("file", audioFile);

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) {
        if (transcribeRes.status === 413) {
          throw new Error("ファイルサイズが大きすぎます。4MB以下のファイルを選択してください。");
        }
        const errorData = await transcribeRes.json().catch(() => ({}));
        throw new Error(errorData.error || "文字起こしに失敗しました");
      }

      const transcribeData = await transcribeRes.json();
      const transcript = transcribeData.transcript;

      // 文字起こし結果を表示
      const transcriptMessage: Message = {
        role: "assistant",
        content: `✅ 文字起こしが完了しました！\n\n---\n\n${transcript}\n\n---\n\n⏳ 議事録を作成中...`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev.slice(0, -1), transcriptMessage]);

      // 要約API呼び出し
      const summarizeRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!summarizeRes.ok) {
        throw new Error("要約に失敗しました");
      }

      const summarizeData = await summarizeRes.json();
      const summary = summarizeData.summary;

      // 最終結果を表示
      const finalMessage: Message = {
        role: "assistant",
        content: `✅ 議事録が完成しました！\n\n${summary}\n\n---\n\n他に何かお手伝いできることはありますか？`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev.slice(0, -1), finalMessage]);

      setFile(null);
    } catch (err) {
      const errorMessage: Message = {
        role: "assistant",
        content: `❌ エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}\n\nもう一度お試しください。`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !file) return;

    if (input.trim()) {
      const userMessage: Message = {
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInput("");

      // 簡単な応答ロジック
      setLoading(true);
      setTimeout(() => {
        const response: Message = {
          role: "assistant",
          content: "音声ファイルをアップロードしてください。📎ボタンから選択できます。\n\n対応フォーマット: MP3, WAV, M4A, MP4など",
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, response]);
        setLoading(false);
      }, 500);
    }
  };

  return (
    <main className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* サイドバー */}
      <div className="w-64 bg-gray-900 text-white p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold mb-2">🎤 議事録AI</h1>
          <p className="text-xs text-gray-400">Powered by Claude</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">機能</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-gray-300">
                <span>🎯</span> 高精度文字起こし
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span>⚡</span> AI自動要約
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span>💾</span> 議事録保存
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            © 2025 Meeting Minutes AI
          </p>
        </div>
      </div>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            新しい議事録
          </h2>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">🤖</span>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-6 py-4 max-w-2xl ${
                    message.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  {isClient && (
                    <div
                      className={`text-xs mt-2 ${
                        message.role === "user"
                          ? "text-purple-200"
                          : "text-gray-400"
                      }`}
                    >
                      {message.timestamp === "2025-01-01T00:00:00.000Z"
                        ? ""
                        : new Date(message.timestamp).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                      }
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">👤</span>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">🤖</span>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-md">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 入力エリア */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-4 items-end">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="audio/*,video/*"
                onChange={handleFileChange}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="ファイルを添付"
              >
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="メッセージを入力... (Shift+Enterで改行)"
                  disabled={loading}
                  rows={1}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || (!input.trim() && !file)}
                className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
