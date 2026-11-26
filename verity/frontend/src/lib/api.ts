// Typed API client for the Verity backend
import type {
  AnalysisResult,
  JobStatusResponse,
  UploadResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      errorMsg = body.message ?? errorMsg;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  // Bypass Next.js rewrite proxy for large video uploads (>10MB proxy limit)
  const uploadBase =
    API_BASE ||
    (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8000` : "");
  const res = await fetch(`${uploadBase}/api/v1/upload`, {
    method: "POST",
    body: form,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let errorMsg = `Upload failed: ${res.status}`;
    try {
      const body = await res.json();
      errorMsg = body.message ?? errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<UploadResponse>;
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/api/v1/jobs/${jobId}/status`);
}

export async function getJobResult(jobId: string): Promise<AnalysisResult> {
  return request<AnalysisResult>(`/api/v1/jobs/${jobId}/result`);
}

export async function deleteJob(jobId: string): Promise<void> {
  await request<void>(`/api/v1/jobs/${jobId}`, { method: "DELETE" });
}
