"use client";
import { useState, useCallback, useRef } from "react";
import { uploadFile } from "@/lib/api";

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/heic": [".heic"],
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/webm": [".webm"],
};

const IMAGE_EXTS = ".jpg, .jpeg, .png, .webp, .gif, .heic";
const VIDEO_EXTS = ".mp4, .mov, .webm";

type Mode = "image" | "video";

interface Props {
  onUpload: (jobId: string) => void;
  onError: (message: string) => void;
}

export function UploadZone({ onUpload, onError }: Props) {
  const [mode, setMode] = useState<Mode>("image");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const acceptedMimes = Object.keys(ACCEPTED_TYPES).filter((m) =>
    mode === "image" ? m.startsWith("image/") : m.startsWith("video/")
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (uploading) return;
      if (!acceptedMimes.includes(file.type)) {
        onError(`File type "${file.type}" is not supported. Use ${mode === "image" ? IMAGE_EXTS : VIDEO_EXTS}.`);
        return;
      }
      const maxMB = mode === "image" ? 20 : 500;
      if (file.size > maxMB * 1024 * 1024) {
        onError(`File is too large. Maximum size is ${maxMB} MB.`);
        return;
      }
      setUploading(true);
      try {
        const { job_id } = await uploadFile(file);
        onUpload(job_id);
      } catch (e: unknown) {
        onError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [mode, uploading, onUpload, onError, acceptedMimes]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Segmented control */}
      <div
        role="tablist"
        aria-label="Media type"
        className="inline-flex bg-surface rounded-pill p-1 gap-1"
      >
        {(["image", "video"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`px-5 py-2 rounded-pill text-[14px] font-medium transition-all duration-200 capitalize
              ${mode === m ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${mode}. Drag and drop or click to browse.`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        className={`w-full max-w-xl min-h-[220px] border-2 border-dashed rounded-card-lg flex flex-col items-center justify-center gap-4 cursor-pointer
          transition-all duration-200
          ${dragOver ? "border-accent bg-accent/5 scale-[1.01]" : "border-black/15 bg-surface hover:border-accent/50 hover:bg-accent/3"}
          ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {uploading ? (
          <>
            <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" aria-hidden="true" />
            <p className="text-text-secondary text-[15px]">Uploading…</p>
          </>
        ) : (
          <>
            <svg className="text-text-secondary" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path d="M20 8v16M13 15l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="6" y="28" width="28" height="6" rx="3" fill="currentColor" opacity="0.12"/>
            </svg>
            <div className="text-center">
              <p className="text-[16px] font-medium text-text-primary">
                {dragOver ? "Drop to analyze" : "Drag & drop or click to browse"}
              </p>
              <p className="text-[13px] text-text-secondary mt-1">
                {mode === "image" ? `${IMAGE_EXTS} · Max 20 MB` : `${VIDEO_EXTS} · Max 500 MB · Max 10 min`}
              </p>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={acceptedMimes.join(",")}
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
