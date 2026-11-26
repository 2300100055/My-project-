"use client";
import { useState } from "react";
import { deleteJob } from "@/lib/api";
import type { AnalysisResult, SignalResult, Verdict } from "@/lib/types";

interface Props {
  result: AnalysisResult;
  previewUrl?: string | null;
  onReset: () => void;
}

const VERDICT_CONFIG: Record<Verdict, { oneWord: string; subtitle: string; badgeClass: string }> = {
  likely_authentic: {
    oneWord: "Human",
    subtitle: "Human-Generated / Natural Capture",
    badgeClass: "bg-[#0F172A] text-white",
  },
  inconclusive: {
    oneWord: "Inconclusive",
    subtitle: "Mixed Signals — Review Evidence Below",
    badgeClass: "bg-white text-[#0F172A] border border-[#0F172A]/25",
  },
  likely_ai_generated: {
    oneWord: "AI",
    subtitle: "AI-Generated or Manipulated",
    badgeClass: "bg-accent text-white",
  },
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

export function ResultView({ result, previewUrl, onReset }: Props) {
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [deleting, setDeleting] = useState(false);

  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - result.score / 100);
  const heatmapUrl = result.signals.find((s) => s.heatmap_url)?.heatmap_url;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteJob(result.job_id);
    } catch {
      // Ignore if already expired
    } finally {
      setDeleting(false);
      onReset();
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      {/* Verdict Summary Card */}
      <div className="card p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
        <div className="relative flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32" aria-label={`Score: ${result.score} out of 100`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" stroke="#1D1D1F" strokeOpacity="0.1" strokeWidth="6" fill="none" />
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
            <span className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-text-primary">
              {result.score.toFixed(0)}
            </span>
            <span className="text-[11px] text-text-primary/60">/ 100</span>
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-3">
            <span className={`inline-block text-[20px] sm:text-[22px] font-bold tracking-tight px-5 py-1.5 rounded-pill ${VERDICT_CONFIG[result.verdict].badgeClass}`}>
              {VERDICT_CONFIG[result.verdict].oneWord}
            </span>
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-accent">
              {VERDICT_CONFIG[result.verdict].subtitle}
            </span>
          </div>
          <p className="text-[15px] sm:text-[16px] text-text-primary leading-relaxed">
            {result.plain_english_summary}
          </p>
          <p className="text-[13px] text-text-primary/65 mt-3">
            Signal Reliability: <span className="font-medium text-text-primary capitalize">{result.reliability}</span>
            {result.reliability_note && ` · ${result.reliability_note}`}
          </p>
        </div>
      </div>

      {/* Limitations Note */}
      <div className="card-surface px-5 sm:px-6 py-4 text-[13px] text-text-primary/70 leading-relaxed" role="note">
        <span className="font-semibold text-text-primary">Limitations: </span>
        {result.limitation_notice}
      </div>

      {/* Capture & Origin Artifacts (How, When & Which Device) */}
      <CaptureArtifactsCard signals={result.signals} />

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

      {/* Heatmap with Before / After Slider */}
      {heatmapUrl && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-semibold tracking-tight text-text-primary">
              Pixel Analysis Heatmap
            </h2>
            {previewUrl && (
              <span className="text-[12px] text-text-primary/65">
                Original · ELA ({sliderPos}%)
              </span>
            )}
          </div>
          <div className="card overflow-hidden">
            {previewUrl ? (
              <div className="relative w-full h-64 sm:h-80 bg-white select-none overflow-hidden border-b border-[#1D1D1F]/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heatmapUrl}
                  alt="ELA heatmap showing pixel-level compression variance"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <div
                  className="absolute inset-0 overflow-hidden bg-white"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Original uploaded image"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-accent pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  aria-label="Compare original image and ELA heatmap"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                />
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={heatmapUrl}
                alt="ELA heatmap showing pixel-level anomaly map"
                className="w-full object-contain max-h-80 bg-white border-b border-[#1D1D1F]/10"
              />
            )}
            <p className="p-4 text-[13px] text-text-primary/70">
              {previewUrl
                ? "Drag horizontally to compare the original image with the Error Level Analysis map."
                : "Error Level Analysis heatmap: brighter areas indicate higher compression variance."}
            </p>
          </div>
        </div>
      )}

      {/* Video Timeline */}
      {result.video_timeline && result.video_timeline.length > 0 && (
        <VideoTimeline timeline={result.video_timeline} duration={result.video_duration_s ?? 0} />
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <a href={`/api/v1/jobs/${result.job_id}/report/pdf`} download className="btn-secondary">
          Download PDF Report
        </a>
        <a href={`/api/v1/jobs/${result.job_id}/report/json`} download className="btn-secondary">
          Download JSON
        </a>
        <button onClick={handleDelete} disabled={deleting} className="btn-secondary">
          {deleting ? "Deleting…" : "Delete My Results"}
        </button>
        <button onClick={onReset} className="btn-primary sm:ml-auto">
          Analyze Another File
        </button>
      </div>
    </div>
  );
}

function CaptureArtifactsCard({ signals }: { signals: SignalResult[] }) {
  const meta = signals.find((s) => s.signal === "metadata")?.details ?? {};
  const prov = signals.find((s) => s.signal === "provenance")?.details ?? {};
  const c2paStatus =
    prov.c2pa_present === true
      ? prov.valid
        ? `Verified (${String(prov.claim_generator ?? "C2PA")})`
        : "Present (validation failed)"
      : "None found";

  const rows = [
    { label: "Device / Camera", value: String(meta.device ?? "Not recorded") },
    { label: "When Taken", value: String(meta.taken_at ?? "Not recorded") },
    { label: "How Captured", value: String(meta.capture_settings ?? "Not recorded") },
    { label: "Software / Tool", value: String(meta.software ?? "Not recorded") },
    { label: "Content Credentials", value: c2paStatus },
    { label: "GPS Tag", value: meta.has_gps ? "Embedded in file" : "Not present" },
  ];

  return (
    <div>
      <h2 className="text-[18px] font-semibold tracking-tight text-text-primary mb-3">
        Capture &amp; Origin Artifacts
      </h2>
      <div className="card p-5 sm:p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#1D1D1F]/10 rounded-input p-3.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-1">
                {label}
              </dt>
              <dd className="text-[14px] font-medium text-text-primary break-words">
                {value}
              </dd>
            </div>
          ))}
        </dl>
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
        className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:border-accent/40 transition-colors rounded-card"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex-shrink-0 w-11 text-center">
          <span className="text-[15px] sm:text-[16px] font-semibold text-text-primary">{scorePercent}</span>
          <span className="text-[11px] text-text-primary/60 block">/100</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[14px] sm:text-[15px] font-medium text-text-primary">
              {SIGNAL_LABELS[sig.signal] ?? sig.signal}
            </span>
            <span className="text-[12px] text-text-primary/65 flex-shrink-0">
              Confidence {confPercent}%
            </span>
          </div>
          <div className="confidence-bar">
            <div
              className="confidence-bar-fill bg-accent"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <p className="text-[13px] text-text-primary/70 mt-2 line-clamp-2 sm:truncate">{sig.summary}</p>
        </div>

        <svg
          className={`flex-shrink-0 w-5 h-5 text-text-primary/60 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-[#1D1D1F]/10 pt-4">
          <p className="text-[14px] text-text-primary mb-3">{sig.summary}</p>
          {Object.keys(sig.details).length > 0 && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
              {Object.entries(sig.details).map(([k, v]) => (
                <div key={k} className="flex justify-between sm:block gap-2">
                  <dt className="text-text-primary/60 capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-mono text-text-primary break-all">{String(v)}</dd>
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
        <div className="relative h-7 rounded-full overflow-hidden bg-white border border-[#1D1D1F]/15">
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
        <div className="flex justify-between text-[12px] text-text-primary/65 mt-2">
          <span>0:00</span>
          <span>{Math.floor(duration / 60)}:{String(Math.round(duration % 60)).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  );
}
