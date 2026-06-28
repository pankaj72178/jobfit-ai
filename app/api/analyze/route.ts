import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

// JSON schema that constrains Claude's output to a valid Analysis object.
const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    matchScore: {
      type: "integer",
      description: "Overall fit from 0 to 100 (higher = stronger match).",
    },
    verdict: {
      type: "string",
      description: "A punchy one-line judgement, e.g. 'Strong match — apply.'",
    },
    summary: {
      type: "string",
      description: "2–3 sentence summary of how well the resume fits the role.",
    },
    matchedKeywords: {
      type: "array",
      items: { type: "string" },
      description: "Important JD skills/keywords present in the resume.",
    },
    missingKeywords: {
      type: "array",
      items: { type: "string" },
      description: "Important JD skills/keywords missing from the resume.",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "Where the candidate is a strong fit.",
    },
    gaps: {
      type: "array",
      items: { type: "string" },
      description: "Concrete gaps or risks for THIS role.",
    },
    improvements: {
      type: "array",
      items: { type: "string" },
      description:
        "Actionable suggestions to improve the résumé itself — phrasing, metrics, structure, skills to add. Prioritized, specific.",
    },
    recommendedRoles: {
      type: "array",
      description:
        "3–5 job titles that genuinely fit this candidate's profile (based on the résumé, not just this JD), each with a short reason.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
        },
        required: ["title", "reason"],
      },
    },
    rewrittenBullets: {
      type: "array",
      description:
        "Up to 4 resume bullets rewritten to better match the JD (quantified, action-led).",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          original: { type: "string" },
          improved: { type: "string" },
        },
        required: ["original", "improved"],
      },
    },
  },
  required: [
    "matchScore",
    "verdict",
    "summary",
    "matchedKeywords",
    "missingKeywords",
    "strengths",
    "gaps",
    "improvements",
    "recommendedRoles",
    "rewrittenBullets",
  ],
} as const;

const SYSTEM = `You are an expert technical recruiter and résumé coach. You compare a candidate's résumé against a specific job description and produce an honest, actionable fit analysis. Be specific and concrete — reference real skills and phrasing from both texts. Score strictly: 85+ only for a genuinely strong match, 50–70 for partial, below 40 for a weak fit. For "improvements", give concrete résumé edits (add metrics, stronger verbs, a missing section, a skill to learn) ordered by impact. For "recommendedRoles", suggest roles the candidate is genuinely well-suited for based on their overall profile — not only the role they pasted. When rewriting bullets, keep them truthful to the original experience but make them action-led, quantified where possible, and aligned to the job's keywords.`;

type DocBlock = {
  type: "document";
  source: { type: "base64"; media_type: "application/pdf"; data: string };
};
type TextBlock = { type: "text"; text: string };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart.",
      },
      { status: 500 }
    );
  }

  let resumeText = "";
  let resumePdf: string | null = null;
  let jobDescription = "";
  try {
    const body = await req.json();
    resumeText = (body.resumeText || "").toString().trim();
    resumePdf = body.resumePdf ? body.resumePdf.toString() : null; // base64, no data: prefix
    jobDescription = (body.jobDescription || "").toString().trim();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const hasResume = resumePdf ? true : resumeText.length >= 30;
  if (!hasResume || jobDescription.length < 30) {
    return Response.json(
      {
        error:
          "Please provide both a résumé (paste text or upload a PDF) and a job description.",
      },
      { status: 400 }
    );
  }

  // Build the user message: PDF résumé as a document block, or text.
  const content: (DocBlock | TextBlock)[] = [];
  if (resumePdf) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: resumePdf },
    });
    content.push({
      type: "text",
      text: `The attached PDF is the candidate's résumé. Analyze it against the job description below.\n\n=== JOB DESCRIPTION ===\n${jobDescription}`,
    });
  } else {
    content.push({
      type: "text",
      text: `Analyze this candidate against the job description.\n\n=== RÉSUMÉ ===\n${resumeText}\n\n=== JOB DESCRIPTION ===\n${jobDescription}`,
    });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{ role: "user", content: content as any }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json(
        { error: "The request was declined. Try different text." },
        { status: 422 }
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "Empty analysis." }, { status: 502 });
    }

    const analysis = JSON.parse(textBlock.text);
    return Response.json({ analysis });
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API error (${err.status}): ${err.message}`
        : err instanceof Error
          ? err.message
          : "Analysis failed.";
    console.error("Analyze error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
