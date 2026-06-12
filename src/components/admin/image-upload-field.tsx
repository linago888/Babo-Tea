"use client";

import { useRef, useState } from "react";

type Props = {
  /** 當前 URL（受控） */
  value: string;
  /** URL 變更時呼叫 */
  onChange: (url: string) => void;
  /** Blob 路徑前綴（例如 "brands/logos" / "news/hero"） */
  prefix?: string;
  placeholder?: string;
};

/**
 * 圖片欄位：拖檔上傳 + URL 手填 + 預覽。
 * 圖檔丟進 Vercel Blob 後拿 URL 回填輸入框；也可直接貼外部 URL。
 */
export default function ImageUploadField({
  value,
  onChange,
  prefix = "uploads",
  placeholder = "https://…/image.png",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("prefix", prefix);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = (await res.json()) as
        | { ok: true; url: string }
        | { ok: false; error?: string };
      if (!data.ok) {
        setError("error" in data && data.error ? data.error : "Upload failed");
        setUploading(false);
        return;
      }
      onChange(data.url);
      setUploading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    void upload(files[0]);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {uploading ? "上傳中…" : "📁 選檔"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            清除
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p>
      ) : null}

      {/* Drag-and-drop 區 + 預覽 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex min-h-[120px] items-center justify-center rounded-md border-2 border-dashed p-3 text-center text-xs transition ${
          dragOver
            ? "border-rose-500 bg-rose-50 dark:border-rose-700 dark:bg-rose-950"
            : "border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="preview"
            referrerPolicy="no-referrer"
            className="max-h-[200px] max-w-full rounded object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-neutral-500 dark:text-neutral-400">
            拖檔到此 / 點 📁 選檔 / 直接貼 URL
          </span>
        )}
      </div>
    </div>
  );
}
