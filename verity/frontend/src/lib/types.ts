// TypeScript types matching backend Pydantic schemas

export type Verdict = "likely_authentic" | "inconclusive" | "likely_ai_generated";
export type ReliabilityLevel = "high" | "medium" | "low";
export type JobStatus = "pending" | "running" | "complete" | "failed";

export interface SignalResult {
  signal: string;
  score: number;           // 0-1
  confidence: number;      // 0-1
  weight: number;          // 0-1
  summary: string;
  details: Record<string, unknown>;
  heatmap_url?: string | null;
}

export interface VideoSegment {
  start_s: number;
  end_s: number;
  score: number;
  verdict: Verdict;
  dominant_signal: string;
}

export interface AnalysisResult {
  job_id: string;
  media_type: "image" | "video";
  filename: string;
  file_size_bytes: number;
  analyzed_at: string;
  score: number;           // 0-100
  verdict: Verdict;
  reliability: ReliabilityLevel;
  reliability_note?: string | null;
  plain_english_summary: string;
  limitation_notice: string;
  signals: SignalResult[];
  video_timeline?: VideoSegment[] | null;
  video_duration_s?: number | null;
  frames_analyzed?: number | null;
}

export interface UploadResponse {
  job_id: string;
  status_url: string;
  result_url: string;
  estimated_seconds: number;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress?: number | null;
  step?: string | null;
  error?: string | null;
  result_url?: string | null;
}
