"use client";

import { useEffect, useRef, useState } from "react";

type ClassPreview = {
  id: string;
  name: string;
  code: string;
  professor_name?: string | null;
  member_count?: number | null;
  join_code_expires_at?: string | null;
  already_member?: boolean;
};

type JoinClassModalProps = {
  open: boolean;
  onClose: () => void;
  onJoined?: () => void | Promise<void>;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export function JoinClassModal({ open, onClose, onJoined }: JoinClassModalProps) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<ClassPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setPreview(null);
    setError(null);
    setLoadingPreview(false);
    setJoinLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (code.trim().length !== 6) {
      setPreview(null);
      setError(null);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingPreview(true);
    setError(null);
    fetch(`/api/classes/join?code=${encodeURIComponent(code.trim())}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Invalid code");
        }
        return res.json();
      })
      .then((data) => {
        setPreview(data.class || null);
      })
      .catch((err: any) => {
        if (controller.signal.aborted) return;
        setPreview(null);
        setError(err.message || "Unable to validate code");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPreview(false);
      });

    return () => controller.abort();
  }, [code, open]);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoinLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to join class");
      }
      setJoinLoading(false);
      setCode("");
      setPreview(null);
      if (onJoined) await onJoined();
      onClose();
    } catch (err: any) {
      setJoinLoading(false);
      setError(err.message || "Failed to join class");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-3">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#e7dada] overflow-hidden">
        <div className="flex flex-col items-center pt-8 pb-4 px-8 border-b border-[#f5f0f0]">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">school</span>
          </div>
          <h2 className="text-[#181010] tracking-tight text-[26px] font-bold leading-tight text-center">Join a New Class</h2>
          <p className="text-[#8d5e5e] text-sm mt-2 text-center">Enter the unique enrollment code from your instructor.</p>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="flex flex-col w-full">
              <p className="text-[#181010] text-base font-semibold leading-normal pb-2">Enrollment Code</p>
              <div className="flex w-full items-stretch rounded-lg shadow-sm">
                <input
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#181010] focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#e7dada] bg-white h-16 placeholder:text-[#c4a1a1] p-4 text-center text-2xl font-bold tracking-[0.25em] uppercase"
                  maxLength={6}
                  placeholder="X7K9P2"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  aria-label="Enrollment code"
                />
                <div className="text-primary flex border border-[#e7dada] bg-[#fdfafa] items-center justify-center px-4 rounded-r-lg border-l-0">
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                </div>
              </div>
            </label>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</div>
            )}
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl min-h-[96px]">
            {loadingPreview ? (
              <div className="flex items-center gap-3 text-[#8d5e5e] text-sm">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                Checking code...
              </div>
            ) : preview ? (
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-green-600 text-sm">verified</span>
                      <p className="text-[#8d5e5e] text-xs font-semibold uppercase tracking-wider">Course Found</p>
                    </div>
                    <p className="text-[#181010] text-lg font-bold leading-tight">{preview.name}</p>
                    <p className="text-[#8d5e5e] text-sm font-medium">Professor {preview.professor_name || ""}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active now
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {preview.member_count || 0} Students
                    </span>
                    {preview.join_code_expires_at && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f5f0f0] text-[#8d5e5e]">
                        Expires {formatDate(preview.join_code_expires_at)}
                      </span>
                    )}
                    {preview.already_member && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        You are already in this class
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-20 h-20 bg-center bg-no-repeat bg-cover rounded-lg shrink-0 border border-[#e7dada]" aria-hidden />
              </div>
            ) : code.trim().length === 6 ? (
              <div className="text-sm text-[#8d5e5e]">No class found for this code.</div>
            ) : (
              <div className="text-sm text-[#8d5e5e]">Enter the 6-character code to preview the class before joining.</div>
            )}
          </div>
        </div>

        <div className="px-8 pb-8 pt-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              className="flex-1 flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-[#f5f0f0] text-[#181010] text-base font-bold leading-normal tracking-[0.015em] hover:bg-[#ece2e2] transition-all"
              onClick={onClose}
              type="button"
            >
              <span className="truncate">Cancel</span>
            </button>
            <button
              className="flex-[2] flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-[#2563eb] text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/20 hover:bg-[#1d4ed8] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleJoin}
              disabled={joinLoading || !code.trim() || code.trim().length !== 6 || !!error || loadingPreview || preview?.already_member}
              type="button"
            >
              <span className="truncate">{joinLoading ? "Joining..." : "Join Course"}</span>
              <span className="material-symbols-outlined ml-2 text-xl">arrow_forward</span>
            </button>
          </div>
          <p className="text-center text-[#8d5e5e] text-xs mt-4">
            By joining, you agree to the course&apos;s peer accountability policies.
          </p>
        </div>
      </div>
    </div>
  );
}
