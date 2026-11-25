"use client";
import { useState } from "react";
import type { AnalysisResult, SignalResult, Verdict } from "@/lib/types";

interface Props {
  result: AnalysisResult;
  onReset: () => void;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  likely_authentic: "Likely Authentic",
  inconclusive: "Inconclusive",
  likely_ai_generated: "Likely AI-Generated or Manipulated",
};

const SIGNAL_LABELS: Record<string, string> = {
  provenance: "Provenance (C2PA)",
  metadata: "Metadata Forensics",
  ela: "Error Level Analysis",
  spectral: "Spectral & Frequency",
  noise_residual: "Noise Residual",
  ml_classifier: "ML Classifier",
  temporal_consistency: "Temporal Consistency",
};

export function ResultView({ result, onReset }: Props) {
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - result.score / 100);

  return (
    <div className="animate-fade-up space-y-6">
      {/* Verdict Summary Card */}
      <div className="card p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8">
        <div className="relative flex-shrink-0 w-32 h-32" aria-label={`Score: ${result.score} out of 100`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" stroke="#F5F5F7" strokeWidth="6" fill="none" />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="#0071E3"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-spring"
            />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-semibold tracking-tight text-text-primary">
              {result.score.toFixed(0)}
            </span>
            <span className="text-[11px] text-text-secondary">/ 100</span>
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <span className="inline-block text-[12px] font-semibold uppercase tracking-[0.06em] text-accent bg-surface px-3 py-1 rounded-pill mb-3">
            {VERDICT_LABEL[result.verdict]}
          </span>
          <p className="text-[16px] text-text-primary leading-relaxed">
            {result.plain_english_summary}
          </p>
          <p className="text-[13px] text-text-secondary mt-3">
            Reliability: <span className="font-medium text-text-primary capitalize">{result.reliability}</span>
            {result.reliability_note && ` · ${result.reliability_note}`}
          </p>
        </div>
      </div>

      {/* Limitations Note */}
      <div className="card-surface px-6 py-4 text-[13px] text-text-secondary leading-relaxed" role="note">
        <span className="font-semibold text-text-primary">Limitations: </span>
        {result.limitation_notice}
      </div>

      {/* Evidence Signals */}
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight text-text-primary mb-3">
          Evidence Signals
        </h2>
        <div className="space-y-3">
          {result.signals.map((sig) => (
            <SignalCard
              key={sig.signal}
              sig={sig}
              expanded={expandedSignal === sig.signal}
              onToggle={() => setExpandedSignal(expandedSignal === sig.signal ? null : sig.signal)}
            />
          ))}
        </div>
      </div>

      {/* Heatmap */}
      {result.signals.find((s) => s.heatmap_url) && (
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight text-text-primary mb-3">
            Pixel Analysis Heatmap
          </h2>
          <div className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.signals.find((s) => s.heatmap_url)!.heatmap_url!}
              alt="ELA heatmap showing pixel-level anomaly map"
              className="w-full object-contain max-h-80 bg-surface"
            />
            <p className="p-4 text-[13px] text-text-secondary">
              Error Level Analysis heatmap: brighter areas indicate higher compression variance.
            </p>
          </div>
        </div>
      )}

      {/* Video Timeline */}
      {result.video_timeline && result.video_timeline.length > 0 && (
        <VideoTimeline timeline={result.video_timeline} duration={result.video_duration_s ?? 0} />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <a href={`/api/v1/jobs/${result.job_id}/report/pdf`} download className="btn-secondary">
          Download PDF Report
        </a>
        <a href={`/api/v1/jobs/${result.job_id}/report/json`} download className="btn-secondary">
          Download JSON
        </a>
        <button onClick={onReset} className="btn-primary">
          Analyze Another File
        </button>
      </div>
    </div>
  );
}

function SignalCard({ sig, expanded, onToggle }: { sig: SignalResult; expanded: boolean; onToggle: () => void }) {
  const scorePercent = Math.round(sig.score * 100);
  const confPercent = Math.round(sig.confidence * 100);

  return (
    <div className="card">
      <button
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-surface/60 transition-colors rounded-card"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex-shrink-0 w-12 text-center">
          <span className="text-[16px] font-semibold text-text-primary">{scorePercent}</span>
          <span className="text-[11px] text-text-secondary block">/100</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[15px] font-medium text-text-primary">
              {SIGNAL_LABELS[sig.signal] ?? sig.signal}
            </span>
            <span className="text-[12px] text-text-secondary ml-2 flex-shrink-0">
              Confidence {confPercent}%
            </span>
          </div>
          <div className="confidence-bar">
            <div
              className="confidence-bar-fill bg-accent"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <p className="text-[13px] text-text-secondary mt-2 truncate">{sig.summary}</p>
        </div>

        <svg
          className={`flex-shrink-0 w-5 h-5 text-text-secondary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-black/[0.06] pt-4">
          <p className="text-[14px] text-text-primary mb-3">{sig.summary}</p>
          {Object.keys(sig.details).length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
              {Object.entries(sig.details).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-text-secondary capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-mono text-text-primary">{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}

function VideoTimeline({ timeline, duration }: { timeline: NonNullable<AnalysisResult["video_timeline"]>; duration: number }) {
  return (
    <div>
      <h2 className="text-[18px] font-semibold tracking-tight text-text-primary mb-3">
        Video Segment Timeline
      </h2>
      <div className="card p-5">
        <div className="relative h-7 rounded-full overflow-hidden bg-surface">
          {timeline.map((seg, i) => {
            const left = duration > 0 ? (seg.start_s / duration) * 100 : 0;
            const width = duration > 0 ? ((seg.end_s - seg.start_s) / duration) * 100 : 0;
            const opacity = seg.verdict === "likely_ai_generated" ? 0.95 : seg.verdict === "inconclusive" ? 0.5 : 0.2;
            return (
              <div
                key={i}
                className="absolute top-0 h-full bg-accent transition-all duration-300"
                style={{ left: `${left}%`, width: `${width}%`, opacity }}
                title={`${seg.start_s.toFixed(1)}s–${seg.end_s.toFixed(1)}s: ${seg.verdict.replace(/_/g, " ")}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[12px] text-text-secondary mt-2">
          <span>0:00</span>
          <span>{Math.floor(duration / 60)}:{String(Math.round(duration % 60)).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  );
}
