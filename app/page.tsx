"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; timestamp: string; showDownloadPrompt?: boolean; unverifiedList?: string[] };
type CsvData = { fileName: string; headers: string[]; rows: Record<string, string>[] };
type VerificationRecord = { chassisNumber: string; timestamp: string; matchedData?: Record<string, string>; sourceFile?: string };

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "こんにちは！カメラ認証AIです。\n\n📋 手順:\n1. CSVファイルをアップロード（📎ボタン）\n2. カメラで書類を撮影（📷ボタン）\n3. 自動で車台番号を抽出してCSVと照合\n4. 読み込み完了で未認証を確認",
  timestamp: "2025-01-01T00:00:00.000Z",
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [csvFiles, setCsvFiles] = useState<CsvData[]>([]);
  const [verifiedRecords, setVerifiedRecords] = useState<VerificationRecord[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => setIsClient(true), []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);
  
  useEffect(() => {
    if (!navigator.mediaDevices) {
      setMessages(m => [...m, { role: "assistant", content: "⚠️ カメラ機能はHTTPS接続で利用可能です。\n\n開発環境では以下のいずれかが必要です：\n• VercelなどでHTTPSデプロイ\n• ローカルでSSL証明書を設定\n• ngrokなどでHTTPSトンネル", timestamp: new Date().toISOString() }]);
    }
  }, []);
  
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      console.log("videoRefにストリーム設定完了");
    }
  }, [cameraActive]);

  // CSVの値を正しくパース（引用符で囲まれた値を考慮）
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // エスケープされた引用符
          current += '"';
          i++; // 次の文字をスキップ
        } else {
          // 引用符の開始/終了
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // カンマ（引用符の外側）
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    // 最後の値を追加
    values.push(current.trim());
    return values;
  };

  const parseCSV = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 3) throw new Error("CSVファイルの形式が正しくありません");
    const headerLine = lines[2];
    const headers = parseCSVLine(headerLine);
    const rows: Record<string, string>[] = [];
    for (let i = 3; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.every(v => !v)) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { 
        // 引用符を削除（最初と最後の文字が引用符の場合）
        let value = (values[idx] || "").trim();
        if (value.startsWith('"') && value.endsWith('"') && value.length > 1) {
          value = value.slice(1, -1);
        }
        row[h] = value;
      });
      rows.push(row);
    }
    return { headers, rows };
  };

  const matchChassisNumber = (target: string): { data: Record<string, string>, matchType: "exact" | "partial", csvChassisNumber: string, sourceFile: string } | null => {
    if (csvFiles.length === 0) return null;
    
    const norm = (s: string) => s.replace(/\s/g, "").toUpperCase();
    const t = norm(target);
    console.log("照合対象:", target, "→ 正規化:", t);
    
    // すべてのCSVファイルを検索
    for (const csvData of csvFiles) {
      const headers = csvData.headers;
      console.log(`CSVファイル "${csvData.fileName}" を検索中...`);
      
      // I列（インデックス8）を取得
      const col = headers[8] || headers.find(h => h.includes("車台番号") || h.toUpperCase().includes("CHASSIS") || h.toUpperCase().includes("VIN"));
      console.log("車台番号列:", col, "(I列)");
      
      if (!col) {
        console.log("車台番号列が見つかりません");
        continue;
      }
      
      for (const row of csvData.rows) {
        if (!row[col]) continue;
        const csvValue = norm(row[col]);
        console.log("CSVの車台番号:", row[col], "→ 正規化:", csvValue);
        
        // 完全一致
        if (csvValue === t) {
          console.log(`照合結果: 完全一致 (${csvData.fileName})`);
          return { data: row, matchType: "exact", csvChassisNumber: row[col], sourceFile: csvData.fileName };
        }
        
        // 部分一致
        if (csvValue.includes(t) || t.includes(csvValue)) {
          console.log(`照合結果: 部分一致 (${csvData.fileName})`);
          return { data: row, matchType: "partial", csvChassisNumber: row[col], sourceFile: csvData.fileName };
        }
      }
    }
    console.log("照合結果: 不一致（すべてのCSVファイルを検索しました）");
    return null;
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // HTTP環境ではHTML5ファイル入力を使用
      console.log("HTTP環境: ファイル入力を使用");
      fileInputRef.current?.click();
      return;
    }
    
    try {
      console.log("カメラ起動開始...");
      let stream;
      try {
        // まず環境カメラ（背面カメラ）を試す
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        console.log("背面カメラ取得成功");
      } catch (e1) {
        console.log("背面カメラ失敗、前面カメラを試します...");
        try {
          // 失敗したら前面カメラを試す
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          console.log("前面カメラ取得成功");
        } catch (e2) {
          console.log("前面カメラも失敗、デフォルトカメラを試します...");
          // それも失敗したらカメラ指定なしで試す
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log("デフォルトカメラ取得成功");
        }
      }
      
      console.log("カメラストリーム取得成功", stream);
      streamRef.current = stream;
      console.log("setCameraActive(true) 実行");
      setCameraActive(true);
    } catch (e) {
      console.error("カメラ起動エラー:", e);
      const error = e as Error;
      let errorMessage = "カメラエラーが発生しました";
      
      if (error.name === "NotAllowedError" || error.message.includes("Permission")) {
        errorMessage = "❌ カメラへのアクセスが拒否されました。\n\nブラウザの設定でカメラ権限を許可してください。";
      } else if (error.name === "NotFoundError") {
        errorMessage = "❌ カメラが見つかりませんでした。";
      } else {
        errorMessage = `❌ カメラエラー: ${error.message}`;
      }
      
      setMessages(m => [...m, { role: "assistant", content: errorMessage, timestamp: new Date().toISOString() }]);
    }
  };
  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); setCameraActive(false); };
  const capturePhoto = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const url = c.toDataURL("image/jpeg", 0.95);
    stopCamera();
    processImage(url);
  };

  const extractChassisNumber = (text: string): string | null => {
    const patterns = [
      /([A-Z0-9]{4,6}[-\s]?[0-9]{4,10})/i,  // HNT32 -117910 パターン対応
      /([A-Z0-9]{4,6}[-\s]?[0-9]{6,8})/i,
      /車台番号[:\s]*([A-Z0-9-]{6,})/i,
      /CHASSIS[:\s]*([A-Z0-9-]{6,})/i,
    ];
    for (const p of patterns) { const m = text.match(p); if (m) return m[1].replace(/\s/g, "").toUpperCase(); }
    return null;
  };

  const processImage = async (imageDataUrl: string) => {
    setLoading(true);
    try {
      if (csvFiles.length === 0) {
        setMessages(m => [...m, { role: "assistant", content: "⚠️ 先にCSVをアップロードしてください。", timestamp: new Date().toISOString() }]);
        return;
      }
      setMessages(m => [...m, { role: "assistant", content: "⏳ 画像OCR中...", timestamp: new Date().toISOString() }]);
      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "OCR失敗");
      const data = await res.json();
      const text = String(data.transcript || "");
      console.log("OCR結果:", text);
      const ch = extractChassisNumber(text);
      console.log("抽出された車台番号:", ch);
      if (!ch) {
        setMessages(m => [...m.slice(0, -1), { role: "assistant", content: `❌ 車台番号が見つかりませんでした。\n\nOCR結果:\n${text.substring(0, 200)}...`, timestamp: new Date().toISOString() }]);
        return;
      }
      const matched = matchChassisNumber(ch);
      if (matched) {
        setVerifiedRecords(v => [...v, { chassisNumber: ch, timestamp: new Date().toISOString(), matchedData: matched.data, sourceFile: matched.sourceFile }]);
        const disp = Object.entries(matched.data).map(([k, v]) => `${k}: ${v}`).join("\n");
        const matchMessage = matched.matchType === "exact" 
          ? "✅ 認証成功（完全一致）"
          : `⚠️ 認証成功（部分一致）\n\n📝 注意: 車台番号が部分一致でマッチしました\n抽出値: ${ch}\nCSV値: ${matched.csvChassisNumber}`;
        setMessages(m => [...m.slice(0, -1), { role: "assistant", content: `${matchMessage}\n\n📁 参照CSV: ${matched.sourceFile}\n車台番号: ${ch}\n\n${disp}`, timestamp: new Date().toISOString() }]);
      } else {
        setMessages(m => [...m.slice(0, -1), { role: "assistant", content: `⚠️ すべてのCSVファイルに存在しない車台番号です: ${ch}\n\n📁 検索したCSV: ${csvFiles.length}件`, timestamp: new Date().toISOString() }]);
      }
    } catch (e) {
      setMessages(m => [...m.slice(0, -1), { role: "assistant", content: `❌ エラー: ${(e as Error).message}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const csvFilesToProcess = files.filter(f => f.name.endsWith(".csv") || f.type.includes("csv"));
    const imageFiles = files.filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
    
    // CSVファイルを処理
    if (csvFilesToProcess.length > 0) {
      setLoading(true);
      try {
        for (const f of csvFilesToProcess) {
          try {
            const text = await f.text();
            const parsedData = parseCSV(text);
            const csvData: CsvData = { fileName: f.name, ...parsedData };
            
            // 既に同じファイル名のCSVが読み込まれているかチェック
            const existingIndex = csvFiles.findIndex(csv => csv.fileName === f.name);
            if (existingIndex >= 0) {
              // 既存のCSVを更新
              const updated = [...csvFiles];
              updated[existingIndex] = csvData;
              setCsvFiles(updated);
              setMessages(m => [...m, { role: "assistant", content: `🔄 CSV更新: ${csvData.fileName} (${csvData.rows.length}件)`, timestamp: new Date().toISOString() }]);
            } else {
              // 新しいCSVを追加
              setCsvFiles(prev => [...prev, csvData]);
              setMessages(m => [...m, { role: "assistant", content: `✅ CSV追加: ${csvData.fileName} (${csvData.rows.length}件)\n📁 読み込み済みCSV: ${csvFiles.length + 1}件`, timestamp: new Date().toISOString() }]);
            }
          } catch (e) {
            setMessages(m => [...m, { role: "assistant", content: `❌ CSVエラー (${f.name}): ${(e as Error).message}` , timestamp: new Date().toISOString() }]);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    
    // 画像/PDFファイルの処理（最初の1つだけ）
    if (imageFiles.length > 0) {
      const f = imageFiles[0];
      // 画像/PDF → OCR
      const fd = new FormData(); fd.append("file", f);
      setLoading(true);
      try {
        if (csvFiles.length === 0) { setMessages(m => [...m, { role: "assistant", content: "⚠️ 先にCSVをアップロードしてください。", timestamp: new Date().toISOString() }]); return; }
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "OCR失敗");
        const data = await res.json();
        const ch = extractChassisNumber(String(data.transcript || ""));
        if (!ch) { setMessages(m => [...m, { role: "assistant", content: "❌ 車台番号が見つかりませんでした。", timestamp: new Date().toISOString() }]); return; }
        const matched = matchChassisNumber(ch);
        if (matched) {
          setVerifiedRecords(v => [...v, { chassisNumber: ch, timestamp: new Date().toISOString(), matchedData: matched.data, sourceFile: matched.sourceFile }]);
          const disp = Object.entries(matched.data).map(([k, v]) => `${k}: ${v}`).join("\n");
          const matchMessage = matched.matchType === "exact" 
            ? "✅ 認証成功（完全一致）"
            : `⚠️ 認証成功（部分一致）\n\n📝 注意: 車台番号が部分一致でマッチしました\n抽出値: ${ch}\nCSV値: ${matched.csvChassisNumber}`;
          setMessages(m => [...m, { role: "assistant", content: `${matchMessage}\n\n📁 参照CSV: ${matched.sourceFile}\n車台番号: ${ch}\n\n${disp}`, timestamp: new Date().toISOString() }]);
        } else {
          setMessages(m => [...m, { role: "assistant", content: `⚠️ すべてのCSVファイルに存在しない車台番号です: ${ch}\n\n📁 検索したCSV: ${csvFiles.length}件`, timestamp: new Date().toISOString() }]);
        }
      } catch (e) {
        setMessages(m => [...m, { role: "assistant", content: `❌ エラー: ${(e as Error).message}`, timestamp: new Date().toISOString() }]);
      } finally { setLoading(false); }
    } else {
      setMessages(m => [...m, { role: "assistant", content: "⚠️ 対応していないファイル形式です。CSV/画像/PDFを選択してください。", timestamp: new Date().toISOString() }]);
    }
  };

  const checkAllRecords = () => {
    if (csvFiles.length === 0) { setMessages(m => [...m, { role: "assistant", content: "⚠️ CSVが未読込です。", timestamp: new Date().toISOString() }]); return; }
    
    // すべてのCSVファイルから車台番号を集計
    const allChassisNumbers = new Set<string>();
    const chassisByFile: Record<string, string[]> = {};
    
    for (const csvData of csvFiles) {
      const col = csvData.headers.find(h => h.includes("車台番号") || h.toUpperCase().includes("CHASSIS") || h.toUpperCase().includes("VIN"));
      if (!col) continue;
      
      const chassisNumbers = csvData.rows
        .filter(r => r[col])
        .map(r => r[col].replace(/\s/g, "").toUpperCase());
      
      chassisByFile[csvData.fileName] = chassisNumbers;
      chassisNumbers.forEach(ch => allChassisNumbers.add(ch));
    }
    
    const total = allChassisNumbers.size;
    const verified = verifiedRecords.length;
    const unverified = total - verified;
    
    const done = new Set(verifiedRecords.map(r => r.chassisNumber.replace(/\s/g, "").toUpperCase()));
    const miss = Array.from(allChassisNumbers).filter(v => !done.has(v));
    
    if (unverified === 0) {
      setMessages(m => [...m, { role: "assistant", content: `🎉 全件認証完了 ${verified}/${total}件\n\n📁 検索したCSV: ${csvFiles.length}件`, timestamp: new Date().toISOString() }]);
    } else {
      const sample = miss.slice(0, 10).map(v => `- ${v}`).join("\n");
      setMessages(m => [...m, { role: "assistant", content: `⚠️ 未認証 ${unverified}件\n\n${sample}${miss.length > 10 ? `\n...他${miss.length - 10}件` : ""}\n\n📁 検索したCSV: ${csvFiles.length}件`, timestamp: new Date().toISOString(), showDownloadPrompt: true, unverifiedList: miss }]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(m => [...m, { role: "user", content: input, timestamp: new Date().toISOString() }]);
    setInput("");
  };

  const handleDownloadYes = (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message.unverifiedList || csvFiles.length === 0) return;
    
    // すべてのCSVファイルから未認証の行を抽出
    const allUnverifiedRows: Array<{ row: Record<string, string>; fileName: string; headers: string[] }> = [];
    
    for (const csvData of csvFiles) {
      const col = csvData.headers.find(h => h.includes("車台番号") || h.toUpperCase().includes("CHASSIS") || h.toUpperCase().includes("VIN"));
      if (!col) continue;
      
      const unverifiedRows = csvData.rows.filter(r => {
        if (!r[col]) return false;
        const normalized = r[col].replace(/\s/g, "").toUpperCase();
        return message.unverifiedList!.includes(normalized);
      });
      
      unverifiedRows.forEach(row => {
        allUnverifiedRows.push({ row, fileName: csvData.fileName, headers: csvData.headers });
      });
    }
    
    if (allUnverifiedRows.length === 0) return;
    
    // すべての列を統合（最初のCSVのヘッダーを使用）
    const allHeaders = csvFiles[0]?.headers || [];
    const csvContent = [
      ["ファイル名", ...allHeaders].join(","),
      ...allUnverifiedRows.map(({ row, fileName, headers }) => {
        const values = [fileName, ...allHeaders.map(h => {
          const headerIndex = headers.indexOf(h);
          return headerIndex >= 0 ? (row[headers[headerIndex]] || "") : "";
        })];
        return values.map(v => v.includes(",") ? `"${v}"` : v).join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `未認証データ_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessages(m => m.map((msg, idx) => idx === messageIndex ? { ...msg, showDownloadPrompt: false } : msg));
    setMessages(m => [...m, { role: "assistant", content: "✅ ファイルをダウンロードしました", timestamp: new Date().toISOString() }]);
  };

  const handleDownloadNo = (messageIndex: number) => {
    setMessages(m => m.map((msg, idx) => idx === messageIndex ? { ...msg, showDownloadPrompt: false } : msg));
  };

  return (
    <main className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-64 bg-gray-900 text-white p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold mb-2">📷 カメラ認証AI</h1>
          <p className="text-xs text-gray-400">CSV照合・カメラOCR</p>
        </div>
        <div className="flex-1" />
        <div className="pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">© 2025 カメラ認証AI</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">書類認証・データ抽出</h2>
        </div>

        {cameraActive && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <div className="relative w-full h-full">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-black bg-opacity-50" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, 10% 15%, 90% 15%, 90% 85%, 10% 85%, 10% 15%)' }} />
                <div className="relative" style={{ width: '80%', height: '70%', maxWidth: '600px', maxHeight: '400px' }}>
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-purple-500" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-purple-500" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-purple-500" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-purple-500" />
                  <div className="absolute inset-0 border-2 border-purple-500 border-dashed" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black bg-opacity-70 px-6 py-3 rounded-lg">
                      <p className="text-white text-base font-semibold text-center">ここに文字を合わせてください</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-8 left-0 right-0 text-center z-10">
                <div className="bg-black bg-opacity-70 inline-block px-6 py-3 rounded-lg">
                  <p className="text-white text-lg font-bold">📄 書類を枠内に配置してください</p>
                </div>
              </div>
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-10">
                <button onClick={capturePhoto} disabled={loading} className="w-20 h-20 rounded-full bg-white border-4 border-purple-500 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-purple-600" />
                </button>
                <button onClick={stopCamera} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m, i) => (
              <div key={i} className="space-y-3">
                <div className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center"><span className="text-white text-sm">🤖</span></div>}
                  <div className={`rounded-2xl px-6 py-4 max-w-2xl ${m.role === "user" ? "bg-purple-600 text-white" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    {isClient && <div className={`text-xs mt-2 ${m.role === "user" ? "text-purple-200" : "text-gray-400"}`}>{m.timestamp === INITIAL_MESSAGE.timestamp ? "" : new Date(m.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</div>}
                  </div>
                  {m.role === "user" && <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center"><span className="text-white text-sm">👤</span></div>}
                </div>
                {m.showDownloadPrompt && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center"><span className="text-white text-sm">🤖</span></div>
                    <div className="rounded-2xl px-6 py-4 max-w-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md">
                      <div className="font-semibold mb-3">ファイルをダウンロードしますか？</div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleDownloadYes(i)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                        >
                          はい
                        </button>
                        <button
                          onClick={() => handleDownloadNo(i)}
                          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition-colors"
                        >
                          いいえ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-4 items-end">
              <input ref={fileInputRef} type="file" className="hidden" accept=".csv,text/csv,application/csv,image/*,application/pdf" multiple onChange={handleFileChange} />
              {csvFiles.length > 0 && (
                <button type="button" onClick={checkAllRecords} disabled={loading} className="flex-shrink-0 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold">
                  読み込み完了 {verifiedRecords.length}/{csvFiles.reduce((sum, csv) => sum + csv.rows.length, 0)} ({csvFiles.length}ファイル)
                </button>
              )}
              <button type="button" onClick={startCamera} disabled={loading || cameraActive} className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center" title="カメラで書類撮影">📷</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center">📎</button>
              <div className="flex-1"><textarea value={input} onChange={e => setInput(e.target.value)} placeholder="質問を入力 | 📎CSVアップロード | 📷書類撮影" rows={1} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" /></div>
              <button type="submit" disabled={!input.trim() || loading} className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center">➡️</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
