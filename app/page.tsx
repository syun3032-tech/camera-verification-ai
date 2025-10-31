"use client";

import { useState, useRef, useEffect } from "react";
import { uploadAudioFile } from "@/lib/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// 初期メッセージを定数として定義（サーバーとクライアントで一致）
const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "こんにちは！カメラ認証AIです。\n\n📋 手順:\n1. CSVファイルをアップロード（📎ボタン）\n2. カメラで書類を撮影（📷ボタン）\n3. 自動で車台番号を抽出してCSVと照合\n4. 全件チェックで未認証を確認\n\nまずはCSVファイルをアップロードしてください！",
  timestamp: "2025-01-01T00:00:00.000Z", // 固定値でハイドレーションエラーを回避
};

interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
}

interface VerificationRecord {
  chassisNumber: string;
  timestamp: string;
  matchedData?: Record<string, string>;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [verifiedRecords, setVerifiedRecords] = useState<VerificationRecord[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // クライアント側のマウント確認
  useEffect(() => {
    setIsClient(true);
  }, []);

  // カメラ停止処理（コンポーネントのアンマウント時）
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isClient) {
      scrollToBottom();
    }
  }, [messages, isClient]);

  // CSV解析
  const parseCSV = (text: string): CsvData => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSVファイルが空です');
    }

    // 最初の2行をスキップして、3行目をヘッダーとして扱う
    const headerLineIndex = 2; // 0-based index, so 3rd line
    if (lines.length <= headerLineIndex) {
      throw new Error('CSVファイルの形式が正しくありません');
    }

    const headers = lines[headerLineIndex].split(',').map(h => h.trim());
    const rows: Record<string, string>[] = [];

    // ヘッダー行の次からデータとして処理
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      // 空行をスキップ
      if (values.every(v => !v)) {
        continue;
      }
      
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  // CSVファイルを処理
  const processCsvFile = async (csvFile: File) => {
    setLoading(true);

    try {
      const text = await csvFile.text();
      const data = parseCSV(text);
      setCsvData(data);
      setVerifiedRecords([]);

      const message: Message = {
        role: "assistant",
        content: `✅ CSVファイルを読み込みました！\n\n📊 データ件数: ${data.rows.length}件\n📋 列: ${data.headers.join(', ')}\n\nカメラで書類を撮影して認証を開始してください。`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, message]);
    } catch (err) {
      const errorMessage: Message = {
        role: "assistant",
        content: `❌ CSVファイルの読み込みに失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 車台番号でCSVを照合
  const matchChassisNumber = (chassisNumber: string): Record<string, string> | null => {
    if (!csvData) return null;

    // 車台番号列を探す（車台番号、CHASSIS、VINなど）
    const chassisColumn = csvData.headers.find(h => 
      h.includes('車台番号') || h.includes('CHASSIS') || h.includes('VIN') || h.toLowerCase().includes('chassis')
    );

    if (!chassisColumn) {
      return null;
    }

    // 完全一致または部分一致で検索
    const matched = csvData.rows.find(row => {
      const value = row[chassisColumn];
      return value && (value === chassisNumber || value.includes(chassisNumber) || chassisNumber.includes(value));
    });

    return matched || null;
  };

  // カメラ起動
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", // 背面カメラを優先
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("カメラアクセスエラー:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "❌ カメラへのアクセスに失敗しました。\n\nブラウザのカメラ権限を確認してください。",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // カメラ停止
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCapturedImage(null);
  };

  // 写真撮影
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setCapturedImage(imageDataUrl);
        
        // カメラを停止
        stopCamera();
        
        // 画像をOCR処理
        processImage(imageDataUrl);
      }
    }
  };

  // 車台番号を抽出（OCR結果から）
  const extractChassisNumber = (text: string): string | null => {
    // 車台番号のパターンを検索
    // 例: AAZH20-1002549, ABC-1234567, など
    const patterns = [
      /([A-Z0-9]{4,6}[-\s]?[0-9]{7,8})/i,  // AAZH20-1002549 形式
      /車台番号[:\s]*([A-Z0-9-]{10,})/i,  // 「車台番号: XXX」形式
      /CHASSIS[:\s]*([A-Z0-9-]{10,})/i,   // 「CHASSIS: XXX」形式
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].replace(/\s/g, '').toUpperCase();
      }
    }

    return null;
  };

  // 画像をOCR処理
  const processImage = async (imageDataUrl: string) => {
    setLoading(true);

    try {
      // 撮影完了メッセージ
      const captureMessage: Message = {
        role: "user",
        content: "📷 書類を撮影しました",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, captureMessage]);

      // CSVチェック
      if (!csvData) {
        const warningMessage: Message = {
          role: "assistant",
          content: "⚠️ CSVファイルが読み込まれていません。\n\n先にCSVファイルをアップロードしてください。",
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, warningMessage]);
        setLoading(false);
        return;
      }

      // 処理中メッセージ
      const processingMessage: Message = {
        role: "assistant",
        content: "画像を処理しています...\n\n⏳ OCR解析を実行中",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, processingMessage]);

      // Data URLをBlobに変換
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      // OCR API呼び出し
      const formData = new FormData();
      formData.append("file", file);

      const ocrRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!ocrRes.ok) {
        const errorData = await ocrRes.json().catch(() => ({}));
        throw new Error(errorData.error || "OCR処理に失敗しました");
      }

      const ocrData = await ocrRes.json();
      const extractedText = ocrData.transcript;

      // 車台番号を抽出
      const chassisNumber = extractChassisNumber(extractedText);

      if (!chassisNumber) {
        const errorMessage: Message = {
          role: "assistant",
          content: `❌ 車台番号が見つかりませんでした。\n\n【抽出されたテキスト】\n---\n${extractedText}\n---\n\n書類を再度撮影するか、手動で車台番号を入力してください。`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        setLoading(false);
        return;
      }

      // CSVと照合
      const matchedData = matchChassisNumber(chassisNumber);

      if (matchedData) {
        // 認証成功
        const record: VerificationRecord = {
          chassisNumber,
          timestamp: new Date().toISOString(),
          matchedData,
        };
        setVerifiedRecords(prev => [...prev, record]);

        // データを表示
        const dataDisplay = Object.entries(matchedData)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');

        const successMessage: Message = {
          role: "assistant",
          content: `✅ 認証成功！\n\n🔍 車台番号: ${chassisNumber}\n\n【マッチしたデータ】\n---\n${dataDisplay}\n---\n\n✅ 認証済み: ${verifiedRecords.length + 1}/${csvData.rows.length}件`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(0, -1), successMessage]);
      } else {
        // 認証失敗（CSVに存在しない）
        const failMessage: Message = {
          role: "assistant",
          content: `⚠️ CSVに存在しません！\n\n🔍 車台番号: ${chassisNumber}\n\nこの車台番号はCSVファイルに登録されていません。\n\n確認してください。`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(0, -1), failMessage]);
      }

    } catch (err) {
      const errorMessage: Message = {
        role: "assistant",
        content: `❌ エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}\n\nもう一度お試しください。`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setLoading(false);
      setCapturedImage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      setFile(selectedFile);

      // ファイルが選択されたらメッセージを追加
      const userMessage: Message = {
        role: "user",
        content: `📎 ファイル: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);

      // ファイルタイプで処理を分岐
      if (selectedFile.name.endsWith('.csv') || selectedFile.type.includes('csv')) {
        // CSVファイル
        processCsvFile(selectedFile);
      } else if (selectedFile.type.startsWith("image/") || selectedFile.type === "application/pdf") {
        // 画像ファイル・PDF（OCR処理）
        processImageFile(selectedFile);
      } else {
        // 音声ファイル
        processAudioFile(selectedFile);
      }
    }
  };

  // 画像ファイルをOCR処理
  const processImageFile = async (imageFile: File) => {
    setLoading(true);

    try {
      // CSVチェック
      if (!csvData) {
        const warningMessage: Message = {
          role: "assistant",
          content: "⚠️ CSVファイルが読み込まれていません。\n\n先にCSVファイルをアップロードしてください。",
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, warningMessage]);
        setLoading(false);
        return;
      }

      // 処理中メッセージ
      const processingMessage: Message = {
        role: "assistant",
        content: "画像を処理しています...\n\n⏳ OCR解析を実行中",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, processingMessage]);

      // OCR API呼び出し
      const formData = new FormData();
      formData.append("file", imageFile);

      const ocrRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!ocrRes.ok) {
        const errorData = await ocrRes.json().catch(() => ({}));
        throw new Error(errorData.error || "OCR処理に失敗しました");
      }

      const ocrData = await ocrRes.json();
      const extractedText = ocrData.transcript;

      // 車台番号を抽出
      const chassisNumber = extractChassisNumber(extractedText);

      if (!chassisNumber) {
        const errorMessage: Message = {
          role: "assistant",
          content: `❌ 車台番号が見つかりませんでした。\n\n【抽出されたテキスト】\n---\n${extractedText}\n---\n\n書類を再度撮影するか、手動で車台番号を入力してください。`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        setLoading(false);
        return;
      }

      // CSVと照合
      const matchedData = matchChassisNumber(chassisNumber);

      if (matchedData) {
        // 認証成功
        const record: VerificationRecord = {
          chassisNumber,
          timestamp: new Date().toISOString(),
          matchedData,
        };
        setVerifiedRecords(prev => [...prev, record]);

        // データを表示
        const dataDisplay = Object.entries(matchedData)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');

        const successMessage: Message = {
          role: "assistant",
          content: `✅ 認証成功！\n\n🔍 車台番号: ${chassisNumber}\n\n【マッチしたデータ】\n---\n${dataDisplay}\n---\n\n✅ 認証済み: ${verifiedRecords.length + 1}/${csvData.rows.length}件`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(0, -1), successMessage]);
      } else {
        // 認証失敗（CSVに存在しない）
        const failMessage: Message = {
          role: "assistant",
          content: `⚠️ CSVに存在しません！\n\n🔍 車台番号: ${chassisNumber}\n\nこの車台番号はCSVファイルに登録されていません。\n\n確認してください。`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(0, -1), failMessage]);
      }

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

      // ファイルサイズに応じて処理方法を変える
      const maxDirectUploadSize = 4 * 1024 * 1024; // 4MB
      let transcribeRes: Response;

      if (audioFile.size > maxDirectUploadSize) {
        // 大きなファイルの場合：Supabase Storageにアップロード
        const uploadingMessage: Message = {
          role: "assistant",
          content: `音声ファイルを処理しています...\n\n⏳ ファイルをアップロード中 (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(0, -1), uploadingMessage]);

        const audioUrl = await uploadAudioFile(audioFile);

        const processingMessage2: Message = {
          role: "assistant",
          content: "音声ファイルを処理しています...\n\n✅ アップロード完了\n⏳ 文字起こしを実行中",
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(0, -1), processingMessage2]);

        // URLを使って文字起こし
        transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioUrl }),
        });
      } else {
        // 小さなファイルの場合：直接アップロード
        const formData = new FormData();
        formData.append("file", audioFile);

        transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
      }

      if (!transcribeRes.ok) {
        if (transcribeRes.status === 413) {
          throw new Error("ファイルサイズが大きすぎます。");
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

  // 全件チェック機能
  const checkAllRecords = () => {
    if (!csvData) {
      const message: Message = {
        role: "assistant",
        content: "⚠️ CSVファイルが読み込まれていません。",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, message]);
      return;
    }

    const totalRecords = csvData.rows.length;
    const verifiedCount = verifiedRecords.length;
    const unverifiedCount = totalRecords - verifiedCount;

    // 認証済みの車台番号リスト
    const verifiedChassisNumbers = new Set(
      verifiedRecords.map(r => r.chassisNumber)
    );

    // 車台番号列を取得
    const chassisColumn = csvData.headers.find(h => 
      h.includes('車台番号') || h.includes('CHASSIS') || h.includes('VIN') || h.toLowerCase().includes('chassis')
    );

    if (!chassisColumn) {
      const message: Message = {
        role: "assistant",
        content: "⚠️ CSVに車台番号列が見つかりません。",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, message]);
      return;
    }

    // 未認証の項目をリストアップ
    const unverifiedItems = csvData.rows.filter(row => {
      const chassisNumber = row[chassisColumn];
      return chassisNumber && !verifiedChassisNumbers.has(chassisNumber.replace(/\s/g, '').toUpperCase());
    });

    if (unverifiedCount === 0) {
      // 全件完了
      const message: Message = {
        role: "assistant",
        content: `🎉 全件認証完了！\n\n✅ 認証済み: ${verifiedCount}/${totalRecords}件\n\n全ての書類の認証が完了しました。お疲れ様でした！`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, message]);
    } else {
      // 未認証あり
      const unverifiedList = unverifiedItems
        .slice(0, 10)
        .map(item => `- ${item[chassisColumn]}`)
        .join('\n');

      const moreCount = unverifiedItems.length > 10 ? `\n...他${unverifiedItems.length - 10}件` : '';

      const message: Message = {
        role: "assistant",
        content: `⚠️ 未認証の項目があります\n\n📊 進捗状況:\n✅ 認証済み: ${verifiedCount}/${totalRecords}件\n❌ 未認証: ${unverifiedCount}件\n\n【未認証リスト】\n${unverifiedList}${moreCount}\n\n引き続き書類を撮影して認証してください。`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, message]);
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
          content: "書類をアップロードしてください。\n\n📷 カメラボタン：書類を撮影\n📎 添付ボタン：画像ファイル、CSV\n\n対応フォーマット: JPG, PNG, PDF, CSV",
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
          <h1 className="text-xl font-bold mb-2">📷 カメラ認証AI</h1>
          <p className="text-xs text-gray-400">Powered by AI</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">機能</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-gray-300">
                <span>📷</span> カメラ撮影
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span>🤖</span> AI自動認証
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span>📊</span> データ抽出
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span>🔍</span> リスト照合
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            © 2025 カメラ認証AI
          </p>
        </div>
      </div>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            書類認証・データ抽出
          </h2>
        </div>

        {/* カメラビュー */}
        {cameraActive && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* ガイドオーバーレイ */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* 暗い背景オーバーレイ（中央の枠を除く） */}
                <div className="absolute inset-0 bg-black bg-opacity-50" style={{
                  clipPath: 'polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, 10% 15%, 90% 15%, 90% 85%, 10% 85%, 10% 15%)'
                }}></div>
                
                {/* 中央のガイド枠 */}
                <div className="relative" style={{ width: '80%', height: '70%', maxWidth: '600px', maxHeight: '400px' }}>
                  {/* 四隅のコーナーマーカー */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-purple-500"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-purple-500"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-purple-500"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-purple-500"></div>
                  
                  {/* 中央の枠線 */}
                  <div className="absolute inset-0 border-2 border-purple-500 border-dashed"></div>
                  
                  {/* ガイドテキスト（中央） */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black bg-opacity-70 px-6 py-3 rounded-lg">
                      <p className="text-white text-base font-semibold text-center">
                        ここに文字を合わせてください
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 上部のガイドテキスト */}
              <div className="absolute top-8 left-0 right-0 text-center z-10">
                <div className="bg-black bg-opacity-70 inline-block px-6 py-3 rounded-lg">
                  <p className="text-white text-lg font-bold">
                    📄 書類を枠内に配置してください
                  </p>
                </div>
              </div>
              
              {/* 下部のボタン */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-10">
                <button
                  onClick={capturePhoto}
                  disabled={loading}
                  className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 transition-colors flex items-center justify-center shadow-2xl disabled:opacity-50 border-4 border-purple-500"
                >
                  <div className="w-16 h-16 rounded-full bg-purple-600"></div>
                </button>
                <button
                  onClick={stopCamera}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center shadow-2xl"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

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
                accept=".csv,text/csv,application/csv,image/*,application/pdf"
                onChange={handleFileChange}
                disabled={loading}
              />
              
              {/* 読み込み完了ボタン */}
              {csvData && (
                <button
                  type="button"
                  onClick={checkAllRecords}
                  disabled={loading}
                  className="flex-shrink-0 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="読み込み完了チェック"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="hidden sm:inline">読み込み完了</span>
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded">
                    {verifiedRecords.length}/{csvData.rows.length}
                  </span>
                </button>
              )}
              
              {/* カメラボタン */}
              <button
                type="button"
                onClick={startCamera}
                disabled={loading || cameraActive}
                className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="カメラで撮影"
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
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              
              {/* ファイル添付ボタン */}
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
                  placeholder="質問を入力 | 📎CSVアップロード | 📷書類撮影"
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
