"use client";
import { useState, useCallback, useEffect } from "react";
import { UploadZone } from "@/components/upload/UploadZone";
import { AnalyzingState } from "@/components/results/AnalyzingState";
import { ResultView } from "@/components/results/ResultView";
import type { AnalysisResult } from "@/lib/types";

type AppState = "idle" | "analyzing" | "result" | "error";

interface Props {
  initialMode?: "image" | "video";
}

export default function HomePage({ initialMode = "image" }: Props) {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleUpload = useCallback((id: string, localPreviewUrl?: string) => {
    setJobId(id);
    setPreviewUrl(localPreviewUrl ?? null);
    setState("analyzing");
  }, []);

  const handleResult = useCallback((r: AnalysisResult) => {
    setResult(r);
    setState("result");
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setState("error");
  }, []);

  const handleReset = useCallback(() => {
    setState("idle");
    setResult(null);
    setError(null);
    setJobId(null);
    setPreviewUrl(null);
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      {state === "idle" && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 text-center">
          <div className="animate-fade-up">
            <h1 className="text-[34px] sm:text-[52px] font-semibold tracking-[-0.03em] text-text-primary leading-[1.08] mb-4 sm:mb-5">
              Is this AI-generated?
            </h1>
            <p className="text-[16px] sm:text-[20px] text-text-primary/70 font-normal leading-relaxed mb-10 sm:mb-12 max-w-xl mx-auto">
              Upload an image or video for a transparent, multi-signal authenticity assessment.
            </p>
          </div>

          <UploadZone initialMode={initialMode} onUpload={handleUpload} onError={handleError} />

          <p className="mt-8 text-[13px] text-text-primary/60 max-w-md mx-auto leading-relaxed">
            Informational only. &ldquo;Not detected&rdquo; never means &ldquo;authentic.&rdquo;{" "}
            <a href="/how-it-works" className="text-accent hover:underline font-medium">
              How it works
            </a>
          </p>

          <div className="mt-16 pt-10 border-t border-[#1D1D1F]/10 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="card p-5">
              <h2 className="text-[15px] font-semibold text-text-primary mb-1.5">Provenance &amp; Device</h2>
              <p className="text-[13px] text-text-primary/70 leading-relaxed">
                Extracts camera make/model, capture time, settings, and open C2PA Content Credentials.
              </p>
            </div>
            <div className="card p-5">
              <h2 className="text-[15px] font-semibold text-text-primary mb-1.5">Pixel Forensics</h2>
              <p className="text-[13px] text-text-primary/70 leading-relaxed">
                Inspects error levels, spectral frequency artifacts, and sensor noise residuals.
              </p>
            </div>
            <div className="card p-5">
              <h2 className="text-[15px] font-semibold text-text-primary mb-1.5">Private by Design</h2>
              <p className="text-[13px] text-text-primary/70 leading-relaxed">
                No account required. Uploads are never used for training and auto-delete in 60 minutes.
              </p>
            </div>
          </div>
        </section>
      )}

      {state === "analyzing" && jobId && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16">
          <AnalyzingState
            jobId={jobId}
            onResult={handleResult}
            onError={handleError}
          />
        </section>
      )}

      {state === "result" && result && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-20">
          <ResultView result={result} previewUrl={previewUrl} onReset={handleReset} />
        </section>
      )}

      {state === "error" && (
        <section className="max-w-lg mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
          <div className="card p-8 sm:p-10">
            <div className="w-11 h-11 rounded-full bg-white border border-accent/30 text-accent flex items-center justify-center mx-auto mb-5">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 6v4.5M10 13.5h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-text-primary mb-2">
              Unable to analyze file
            </h2>
            <p className="text-[15px] text-text-primary/70 mb-7 leading-relaxed">{error}</p>
            <button onClick={handleReset} className="btn-primary">
              Try again
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
