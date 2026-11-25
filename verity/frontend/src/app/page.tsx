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
    <div className="min-h-[calc(100vh-56px)]">
      {state === "idle" && (
        <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
          {/* Hero */}
          <div className="animate-fade-up">
            <h1 className="text-[44px] font-bold tracking-tight text-text-primary leading-tight mb-4">
              Is this AI-generated?
            </h1>
            <p className="text-[18px] text-text-secondary leading-relaxed mb-12 max-w-xl mx-auto">
              Upload an image or video. Verity runs a multi-signal forensic analysis and gives you an honest, explainable answer.
            </p>
          </div>

          <UploadZone onUpload={handleUpload} onError={handleError} />

          {/* Limitation notice — always visible */}
          <p className="mt-8 text-[13px] text-text-secondary max-w-md mx-auto leading-relaxed">
            Results are informational only. &ldquo;Not detected&rdquo; never means &ldquo;authentic.&rdquo; No result claims certainty.{" "}
            <a href="/how-it-works" className="text-accent hover:underline">Learn how it works →</a>
          </p>
        </section>
      )}

      {state === "analyzing" && jobId && (
        <section className="max-w-2xl mx-auto px-6 pt-20 pb-12">
          <AnalyzingState
            jobId={jobId}
            onResult={handleResult}
            onError={handleError}
          />
        </section>
      )}

      {state === "result" && result && (
        <section className="max-w-4xl mx-auto px-6 pt-10 pb-16">
          <ResultView result={result} onReset={handleReset} />
        </section>
      )}

      {state === "error" && (
        <section className="max-w-xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="card p-10">
            <div className="text-[40px] mb-4" role="img" aria-label="Error">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-text-secondary mb-6">{error}</p>
            <button onClick={handleReset} className="btn-primary">Try again</button>
          </div>
        </section>
      )}
    </div>
  );
}
