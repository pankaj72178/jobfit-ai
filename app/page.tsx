"use client";

import { useEffect, useState } from "react";
import type {
  Analysis,
  Application,
  ApplicationStatus,
} from "@/lib/types";
import { STATUSES } from "@/lib/types";

const STORAGE_KEY = "jobfit:apps";

const statusColor: Record<ApplicationStatus, string> = {
  Saved: "text-slate-300 bg-slate-500/15 border-slate-400/30",
  Applied: "text-blue-300 bg-blue-500/15 border-blue-400/30",
  Interview: "text-amber-300 bg-amber-500/15 border-amber-400/30",
  Offer: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
  Rejected: "text-rose-300 bg-rose-500/15 border-rose-400/30",
};

function scoreColor(n: number) {
  if (n >= 80) return "#34d399";
  if (n >= 55) return "#fbbf24";
  return "#fb7185";
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  const col = scoreColor(score);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
        <circle
          cx="60" cy="60" r={r} stroke={col} strokeWidth="10" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: col }}>{score}</span>
        <span className="text-[10px] uppercase tracking-widest text-white/40">match</span>
      </div>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: "good" | "bad" }) {
  const cls =
    tone === "good"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : "border-rose-400/30 bg-rose-500/10 text-rose-200";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>;
}

export default function Home() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [pdfName, setPdfName] = useState("");
  const [pdfData, setPdfData] = useState<string | null>(null); // base64, no data: prefix

  function onPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("PDF is too large (max 6 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result);
      setPdfData(res.split(",")[1] || "");
      setPdfName(file.name);
      setError("");
    };
    reader.readAsDataURL(file);
  }
  function clearPdf() {
    setPdfData(null);
    setPdfName("");
  }

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState<ApplicationStatus | "All">("All");

  // Load + persist tracker
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setApps(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  }, [apps]);

  async function analyze() {
    setError("");
    setAnalysis(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: pdfData ? "" : resume,
          resumePdf: pdfData,
          jobDescription: jd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setAnalysis(data.analysis as Analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze.");
    } finally {
      setLoading(false);
    }
  }

  function saveApp() {
    const app: Application = {
      id: `${Date.now()}-${Math.round(performance.now())}`,
      company: company.trim() || "Untitled company",
      role: role.trim() || "Role",
      score: analysis?.matchScore ?? null,
      status: "Saved",
      createdAt: Date.now(),
    };
    setApps((a) => [app, ...a]);
    setCompany("");
    setRole("");
  }

  function setStatus(id: string, status: ApplicationStatus) {
    setApps((a) => a.map((x) => (x.id === id ? { ...x, status } : x)));
  }
  function removeApp(id: string) {
    setApps((a) => a.filter((x) => x.id !== id));
  }

  const shown = filter === "All" ? apps : apps.filter((a) => a.status === filter);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      {/* Header */}
      <header className="mb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="JobFit AI logo"
            width={52}
            height={52}
            className="rounded-2xl shadow-lg shadow-indigo-500/30"
          />
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="gradient-text">JobFit</span>
            <span className="text-white/90"> AI</span>
          </h1>
        </div>
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Powered by Claude
        </div>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-white/55">
          Paste or upload your résumé (PDF) and a job description. Get an instant match
          score, missing keywords, how to improve, the roles that fit you, and rewritten
          bullets — then track every application.
        </p>
      </header>

      {/* Inputs */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-white/80">Your résumé</label>
            <label className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10">
              📄 Upload PDF
              <input type="file" accept="application/pdf" onChange={onPdf} className="hidden" />
            </label>
          </div>

          {pdfData ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl bg-black/30 ring-1 ring-indigo-400/30">
              <span className="text-3xl">📄</span>
              <p className="mt-2 max-w-[80%] truncate text-sm font-medium text-white/85">{pdfName}</p>
              <p className="mt-1 text-xs text-white/40">PDF will be read directly by the AI.</p>
              <button onClick={clearPdf} className="mt-3 rounded-lg border border-white/15 px-3 py-1 text-xs text-white/60 hover:bg-white/10">
                Remove
              </button>
            </div>
          ) : (
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your résumé text — or upload a PDF above…"
              className="h-56 w-full resize-none rounded-xl bg-black/30 p-3 text-sm text-white/90 outline-none ring-1 ring-white/10 focus:ring-indigo-400/50"
            />
          )}
        </div>
        <div className="glass rounded-2xl p-4">
          <label className="mb-2 block text-sm font-semibold text-white/80">Job description</label>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description…"
            className="h-56 w-full resize-none rounded-xl bg-black/30 p-3 text-sm text-white/90 outline-none ring-1 ring-white/10 focus:ring-indigo-400/50"
          />
        </div>
      </section>

      <div className="mt-5 flex flex-col items-center gap-3">
        <button
          onClick={analyze}
          disabled={loading}
          className="btn-primary rounded-full px-8 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Analyzing…" : "Analyze fit"}
        </button>
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>

      {/* Results */}
      {analysis && (
        <section className="glass mt-8 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <ScoreRing score={analysis.matchScore} />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold">{analysis.verdict}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{analysis.summary}</p>
            </div>
          </div>

          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-emerald-300">✓ Matched keywords</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.matchedKeywords.length
                  ? analysis.matchedKeywords.map((k) => <Chip key={k} label={k} tone="good" />)
                  : <span className="text-sm text-white/40">None found.</span>}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-rose-300">✗ Missing keywords</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.missingKeywords.length
                  ? analysis.missingKeywords.map((k) => <Chip key={k} label={k} tone="bad" />)
                  : <span className="text-sm text-white/40">Nothing major missing.</span>}
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white/80">Strengths</h3>
              <ul className="space-y-1.5 text-sm text-white/60">
                {analysis.strengths.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white/80">Gaps to address</h3>
              <ul className="space-y-1.5 text-sm text-white/60">
                {analysis.gaps.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          </div>

          {analysis.improvements.length > 0 && (
            <div className="mt-7">
              <h3 className="mb-3 text-sm font-semibold text-indigo-300">💡 How to improve your résumé</h3>
              <ol className="space-y-2">
                {analysis.improvements.map((s, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-black/20 p-3 text-sm text-white/75 ring-1 ring-white/10">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {analysis.recommendedRoles.length > 0 && (
            <div className="mt-7">
              <h3 className="mb-3 text-sm font-semibold text-cyan-300">🎯 Roles that fit you</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {analysis.recommendedRoles.map((r, i) => (
                  <div key={i} className="rounded-xl bg-black/20 p-4 ring-1 ring-white/10">
                    <p className="font-semibold text-white/90">{r.title}</p>
                    <p className="mt-1 text-sm text-white/55">{r.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.rewrittenBullets.length > 0 && (
            <div className="mt-7">
              <h3 className="mb-3 text-sm font-semibold text-white/80">✨ Rewritten bullets</h3>
              <div className="space-y-3">
                {analysis.rewrittenBullets.map((b, i) => (
                  <div key={i} className="rounded-xl bg-black/20 p-4 ring-1 ring-white/10">
                    <p className="text-xs text-white/40 line-through">{b.original}</p>
                    <p className="mt-1.5 text-sm text-white/90">{b.improved}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save to tracker */}
          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-white/50">Company</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Vercel"
                className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-400/50" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-white/50">Role</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Intern"
                className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-400/50" />
            </div>
            <button onClick={saveApp} className="btn-ghost rounded-lg px-5 py-2 text-sm font-semibold text-white">
              + Save to tracker
            </button>
          </div>
        </section>
      )}

      {/* Tracker */}
      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Application tracker <span className="text-white/40">({apps.length})</span></h2>
          <div className="flex flex-wrap gap-1.5">
            {(["All", ...STATUSES] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filter === s ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/5"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-white/40">
            No applications yet. Analyze a job above and hit “Save to tracker”.
          </div>
        ) : (
          <div className="space-y-2.5">
            {shown.map((a) => (
              <div key={a.id} className="glass flex items-center gap-4 rounded-xl px-4 py-3">
                {a.score != null && (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                    style={{ color: scoreColor(a.score), background: `${scoreColor(a.score)}1a` }}>
                    {a.score}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.role}</p>
                  <p className="truncate text-sm text-white/50">{a.company}</p>
                </div>
                <select
                  value={a.status}
                  onChange={(e) => setStatus(a.id, e.target.value as ApplicationStatus)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold outline-none ${statusColor[a.status]}`}
                >
                  {STATUSES.map((s) => <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>)}
                </select>
                <button onClick={() => removeApp(a.id)} aria-label="Delete"
                  className="text-white/30 transition hover:text-rose-300">✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-16 text-center text-xs text-white/30">
        Built by Pankaj Kumar · Résumé data stays in your browser.
      </footer>
    </main>
  );
}
