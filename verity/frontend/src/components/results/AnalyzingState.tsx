"use client";
import { useEffect, useState } from "react";
import { getJobStatus, getJobResult } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";

const STEPS = [
  "Checking provenance",
  "Analyzing metadata",
  "Running pixel forensics",
  "Running spectral analysis",
  "Running ML classifier",
  "Fusing evidence",
];

interface Props {
  jobId: string;
  onResult: (r: AnalysisResult) => void;
  onError: (msg: string) => void;
}

export function AnalyzingState({ jobId, onResult, onError }: Props) {
  const [step, setStep] = useState(STEPS[0]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        try {
          const status = await getJobStatus(jobId);
          if (status.step) setStep(status.step);
          if (status.progress != null) setProgress(status.progress);

          if (status.status === "complete") {
            const result = await getJobResult(jobId);
            if (!cancelled) onResult(result);
            return;
          }
          if (status.status === "failed") {
            if (!cancelled) onError(status.error ?? "Analysis failed.");
            return;
          }
        } catch {
          if (!cancelled) onError("Lost connection. Please try again.");
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [jobId, onResult, onError]);

  const stepIdx = STEPS.findIndex((s) => s.toLowerCase().includes(step.toLowerCase().split(" ")[0].toLowerCase()));
  const displayIdx = stepIdx >= 0 ? stepIdx : Math.floor(progress * STEPS.length);

  return (
    <div className="card p-10 text-center animate-fade-up">
      <div className="relative mx-auto mb-8 w-24 h-24" aria-hidden="true">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" stroke="#0F172A" strokeOpacity="0.1" strokeWidth="6" fill="none" />
          <circle
            cx="48" cy="48" r="40"
            stroke="#2563EB" strokeWidth="6" fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress)}`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[15px] font-semibold text-accent">
          {Math.round(progress * 100)}%
        </span>
      </div>

      <h2 className="text-[20px] font-semibold tracking-tight text-text-primary mb-2">Analyzing…</h2>
      <p className="text-text-secondary text-[15px] mb-8">{step}</p>

      <ol className="text-left max-w-xs mx-auto space-y-3" aria-label="Analysis steps">
        {STEPS.map((s, i) => {
          const done = i < displayIdx;
          const active = i === displayIdx;
          return (
            <li key={s} className={`flex items-center gap-3 text-[14px] transition-all duration-300
              ${done ? "text-text-secondary line-through" : active ? "text-text-primary font-medium" : "text-black/25"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[11px]
                ${done ? "bg-text-primary text-white" : active ? "bg-accent text-white animate-pulse-ring" : "bg-white border border-[#1D1D1F]/20 text-transparent"}`}>
                {done ? "✓" : i + 1}
              </span>
              {s}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
