"use client";
import { useState, useCallback, useRef } from "react";
import { uploadFile } from "@/lib/api";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/heic": [".heic"],
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/webm": [".webm"],
};

const IMAGE_EXTS = "JPG, PNG, WEBP, GIF, HEIC";
const VIDEO_EXTS = "MP4, MOV, WEBM";

type Mode = "image" | "video";

interface Props {
  initialMode?: Mode;
  onUpload: (jobId: string, previewUrl?: string) => void;
  onError: (message: string) => void;
}

export function UploadZone({ initialMode = "image", onUpload, onError }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const acceptedMimes = Object.keys(ACCEPTED_TYPES).filter((m) =>
    mode === "image" ? m.startsWith("image/") : m.startsWith("video/")
  );

  const acceptedExts = Object.entries(ACCEPTED_TYPES)
    .filter(([m]) => (mode === "image" ? m.startsWith("image/") : m.startsWith("video/")))
    .flatMap(([, exts]) => exts);

  const handleFile = useCallback(
    async (file: File) => {
      if (uploading) return;
      const ext = file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "";
      const typeValid = file.type ? acceptedMimes.includes(file.type) : acceptedExts.includes(ext);
      if (!typeValid && !acceptedExts.includes(ext)) {
        onError(`Unsupported file type (${file.type || ext || "unknown"}). Supported: ${mode === "image" ? IMAGE_EXTS : VIDEO_EXTS}.`);
        return;
      }
      const maxMB = mode === "image" ? 20 : 500;
      if (file.size > maxMB * 1024 * 1024) {
        onError(`File exceeds the ${maxMB} MB limit.`);
        return;
      }
      setUploading(true);
      try {
        const preview = mode === "image" ? URL.createObjectURL(file) : undefined;
        const { job_id } = await uploadFile(file);
        onUpload(job_id, preview);
      } catch (e: unknown) {
        onError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [mode, uploading, onUpload, onError, acceptedMimes, acceptedExts]
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
    <div className="flex flex-col items-center gap-6 w-full">
      <div
        role="tablist"
        aria-label="Media type"
        className="inline-flex bg-surface rounded-pill p-1 border border-black/[0.04]"
      >
        {(["image", "video"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`px-6 py-1.5 rounded-pill text-[14px] font-medium transition-all duration-200 capitalize
              ${mode === m ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${mode}. Drag and drop or click to choose a file.`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        className={`w-full max-w-xl min-h-[220px] sm:min-h-[240px] rounded-card-lg border flex flex-col items-center justify-center gap-4 px-6 sm:px-8 py-10 sm:py-12 cursor-pointer
          transition-all duration-200 ease-out
          ${dragOver
            ? "border-accent bg-accent/[0.04] scale-[1.01] shadow-card-hover"
            : "border-black/[0.1] bg-white hover:border-accent/50 hover:shadow-card"}
          ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {uploading ? (
          <>
            <div className="w-8 h-8 border-2 border-black/10 border-t-accent rounded-full animate-spin" aria-hidden="true" />
            <p className="text-text-secondary text-[15px]">Uploading…</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-accent">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[16px] sm:text-[17px] font-medium text-text-primary tracking-tight">
                {dragOver ? "Release to analyze" : `Drop your ${mode} here`}
              </p>
              <p className="text-[14px] text-text-secondary mt-1">
                or <span className="text-accent font-medium">choose a file</span> from your device
              </p>
            </div>
            <p className="text-[12px] text-text-secondary/80 mt-2">
              {mode === "image" ? `${IMAGE_EXTS} · Up to 20 MB` : `${VIDEO_EXTS} · Up to 500 MB · 10 min max`}
            </p>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={acceptedMimes.join(",")}
        className="hidden"
        aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
