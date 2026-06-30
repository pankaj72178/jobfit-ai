// Shape of a single resume↔JD analysis (mirrors the API's JSON schema).
export type Analysis = {
  matchScore: number; // 0–100
  verdict: string; // one-line judgement
  summary: string; // 2–3 sentence fit summary
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  gaps: string[];
  improvements: string[]; // actionable ways to improve the résumé
  recommendedRoles: { title: string; reason: string }[]; // roles that fit the candidate
  companies: { name: string; why: string }[]; // employers that could hire this candidate
  payEstimate: {
    internship: string; // estimated stipend range
    fullTime: string; // estimated entry-level salary range
    note: string; // caveat: varies by location, company tier, skills
  };
  rewrittenBullets: { original: string; improved: string }[];
};

// A tracked job application (persisted in localStorage for the MVP).
export type ApplicationStatus =
  | "Saved"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected";

export type Application = {
  id: string;
  company: string;
  role: string;
  score: number | null;
  status: ApplicationStatus;
  createdAt: number;
};

export const STATUSES: ApplicationStatus[] = [
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
];
