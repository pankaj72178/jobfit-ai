# JobFit AI

Paste **or upload (PDF)** your résumé and a job description → get an instant **AI match score**, the **keywords you're missing**, **how to improve your résumé**, the **roles that fit you**, **rewritten bullets**, and a built-in **application tracker**.

Built with **Next.js 16 · React 19 · TypeScript · Tailwind CSS v4** and the **Anthropic Claude API** (`claude-opus-4-8`, structured outputs).

## Run it

```bash
npm install
cp .env.local.example .env.local   # then paste your Anthropic API key
npm run dev                        # http://localhost:3000
```

Get an API key at <https://console.anthropic.com/settings/keys> and put it in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key the UI still loads and the tracker works — the analyze button just returns a friendly "missing key" message.

## How it works

- **`app/api/analyze/route.ts`** — server route that sends the résumé + JD to Claude with a strict JSON schema (`output_config.format`), so the response is always valid structured data (score, matched/missing keywords, strengths, gaps, improvement tips, recommended roles, rewritten bullets). A **PDF résumé is sent natively** to Claude as a `document` block — no PDF-parsing library needed.
- **`app/page.tsx`** — the UI: two inputs, an animated score ring, keyword chips, and the application tracker.
- **Tracker** — saved in your browser's `localStorage` (no account needed). Each entry keeps its match score and a status: Saved → Applied → Interview → Offer / Rejected.

## Roadmap (phase 2)

- Accounts + database persistence (so the tracker syncs across devices)
- One-click cover-letter draft from the analysis
- Auto-fill the tracker's company/role from the job description

---

Built by Pankaj Kumar.
