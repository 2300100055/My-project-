"use client";
import { useState, useCallback } from "react";
import { UploadZone } from "@/components/upload/UploadZone";
import { AnalyzingState } from "@/components/results/AnalyzingState";
import { ResultView } from "@/components/results/ResultView";
import type { AnalysisResult } from "@/lib/types";

type AppState = "idle" | "analyzing" | "result" | "error";

export default function HomePage() {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleUpload = useCallback((id: string) => {
    setJobId(id);
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
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-white">
      {state === "idle" && (
        <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="animate-fade-up">
            <h1 className="text-[40px] sm:text-[52px] font-semibold tracking-[-0.03em] text-text-primary leading-[1.08] mb-5">
              Is this AI-generated?
            </h1>
            <p className="text-[18px] sm:text-[20px] text-text-secondary font-normal leading-relaxed mb-12 max-w-xl mx-auto">
              Upload an image or video for a transparent, multi-signal authenticity assessment.
            </p>
          </div>

          <UploadZone onUpload={handleUpload} onError={handleError} />

          <p className="mt-8 text-[13px] text-text-secondary max-w-md mx-auto leading-relaxed">
            Informational only. &ldquo;Not detected&rdquo; never means &ldquo;authentic.&rdquo;{" "}
            <a href="/how-it-works" className="text-accent hover:underline font-medium">
              How it works
            </a>
          </p>

          {/* Minimal 3-pillar summary */}
          <div className="mt-20 pt-12 border-t border-black/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            <div>
              <h2 className="text-[14px] font-semibold text-text-primary mb-1">Provenance</h2>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                Verifies open C2PA Content Credentials and camera metadata when present.
              </p>
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-text-primary mb-1">Pixel Forensics</h2>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                Inspects error levels, spectral frequency artifacts, and sensor noise residuals.
              </p>
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-text-primary mb-1">Private by Design</h2>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                No account required. Uploads are never used for training and auto-delete in 60 minutes.
              </p>
            </div>
          </div>
        </section>
      )}

      {state === "analyzing" && jobId && (
        <section className="max-w-2xl mx-auto px-6 pt-24 pb-16">
          <AnalyzingState
            jobId={jobId}
            onResult={handleResult}
            onError={handleError}
          />
        </section>
      )}

      {state === "result" && result && (
        <section className="max-w-4xl mx-auto px-6 pt-12 pb-20">
          <ResultView result={result} onReset={handleReset} />
        </section>
      )}

      {state === "error" && (
        <section className="max-w-lg mx-auto px-6 pt-24 pb-16 text-center">
          <div className="card p-10">
            <div className="w-11 h-11 rounded-full bg-surface text-text-primary flex items-center justify-center mx-auto mb-5">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 6v4.5M10 13.5h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-text-primary mb-2">
              Unable to analyze file
            </h2>
            <p className="text-[15px] text-text-secondary mb-7 leading-relaxed">{error}</p>
            <button onClick={handleReset} className="btn-primary">
              Try again
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
