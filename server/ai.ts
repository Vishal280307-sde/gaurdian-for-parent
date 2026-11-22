import { GoogleGenAI, Type } from "@google/genai";

function getAiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("Gemini API key is not configured in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export function redactSensitive(text: string): string {
  return String(text || "")
    .replace(/\b\d{4,16}\b/g, "[NUMBER]")
    .replace(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+/g, "[UPI_OR_EMAIL]")
    .trim();
}

export interface GroundedSourceSummary {
  sourceName: string;
  verificationStatus: string;
  result: string;
  limitations?: string;
}

export interface GroundedIndicatorSummary {
  label: string;
  points: number;
  evidence: string[];
  sourceName: string;
  verified: boolean;
}

export async function explainRiskWithGemini(params: {
  text: string;
  signals: string[];
  level: string;
  lang: string;
  contextType: string;
  score?: number;
  riskLevel?: string;
  verificationStatus?: string;
  indicators?: GroundedIndicatorSummary[];
  sourcesUnavailable?: string[];
  findings?: string[];
  sourceChecks?: GroundedSourceSummary[];
}): Promise<{ explanation: string; nextSteps: string[] }> {
  const ai = getAiClient();
  const safeText = redactSensitive(params.text).slice(0, 1200);
  const langLabel = params.lang === "hi" ? "Hindi (natural Devanagari)" : "simple, clear English";

  const findingsBlock = (params.findings && params.findings.length ? params.findings : params.signals).join("; ") || "None";
  const indicatorsBlock =
    params.indicators && params.indicators.length
      ? params.indicators
          .map(
            (ind) =>
              `- ${ind.label} (+${ind.points} pts, ${ind.verified ? "verified" : "unverified"}, source=${ind.sourceName}): ${ind.evidence.join("; ")}`
          )
          .join("\n")
      : "No scored suspicion indicators triggered.";
  const sourcesBlock =
    params.sourceChecks && params.sourceChecks.length
      ? params.sourceChecks
          .map(
            (s) =>
              `- ${s.sourceName}: status=${s.verificationStatus}, result=${s.result}${s.limitations ? `, limitation=${s.limitations}` : ""}`
          )
          .join("\n")
      : "No external source lookup summary attached.";
  const unavailableBlock =
    params.sourcesUnavailable && params.sourcesUnavailable.length > 0
      ? params.sourcesUnavailable.join(", ")
      : "None";

  const scoreLine =
    typeof params.score === "number"
      ? `${params.score}/100 (${params.riskLevel || params.level})`
      : `${params.level}`;

  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: [
      `Context type: ${params.contextType}`,
      `Final deterministic suspicion score: ${scoreLine}`,
      `Verification status: ${params.verificationStatus || params.level}`,
      `Scored indicators:\n${indicatorsBlock}`,
      `Actual detected findings: ${findingsBlock}`,
      `Sources checked:\n${sourcesBlock}`,
      `Unavailable sources (added 0 points): ${unavailableBlock}`,
      `Redacted input snippet: ${safeText}`,
    ].join("\n\n"),
    config: {
      systemInstruction: `You are a calm, trustworthy family digital-safety advisor helping parents understand scan results. Write in ${langLabel}.
CRITICAL RULES:
1. Refer ONLY to the actual deterministic score, scored indicators, findings, and source verification statuses provided above.
2. NEVER change, override, or invent numeric suspicion scores, fraud reports, external blacklists, police cases, or call audio transcripts.
3. Explicitly distinguish verified intelligence matches from heuristic/unverified indicators and unavailable sources.
4. Clearly note that a score of 0 does NOT guarantee safety, and a high score indicates risk rather than proof of criminal activity.
5. For phone-call screening, clarify that no call audio was listened to or recorded.
6. Explain why the result received its exact score/risk level and give 2-4 practical safety steps. Never ask for OTPs, PINs, or passwords.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING },
          nextSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["explanation", "nextSteps"],
      },
    },
  });

  const parsed = JSON.parse((response.text || "{}").trim()) as {
    explanation?: string;
    nextSteps?: string[];
  };

  return {
    explanation:
      parsed.explanation ||
      (params.lang === "hi"
        ? "कृपया किसी भी कार्रवाई से पहले अपने परिवार के अभिभावक से सीधे पुष्टि करें।"
        : "Please verify this request directly with your family guardian before acting."),
    nextSteps:
      Array.isArray(parsed.nextSteps) && parsed.nextSteps.length
        ? parsed.nextSteps.slice(0, 4)
        : params.lang === "hi"
          ? ["OTP या UPI PIN साझा न करें", "परिवार के अभिभावक से सहेजे गए नंबर पर पुष्टि करें"]
          : ["Do not share OTP or PIN", "Verify with your family guardian on a saved number"],
  };
}

export async function chatWithGemini(params: {
  history: { role: string; text: string }[];
  message: string;
  signals: string[];
  lang: string;
}): Promise<string> {
  const ai = getAiClient();
  const langLabel = params.lang === "hi" ? "Hindi (Devanagari)" : "English";
  const recentHistory = params.history
    .slice(-6)
    .map((h) => `${h.role === "user" ? "User" : "Advisor"}: ${redactSensitive(h.text)}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: `${recentHistory ? recentHistory + "\n" : ""}Context signals: ${params.signals.join(", ") || "None"}\nUser question: ${redactSensitive(params.message)}`,
    config: {
      systemInstruction: `You are a reassuring family safety assistant for elderly parents and their guardians. Reply in ${langLabel} in 3-5 short, practical sentences. Never invent fraud reports or claim unverified recipients are verified, and never ask for financial credentials.`,
    },
  });

  return (
    (response.text || "").trim() ||
    (params.lang === "hi"
      ? "कृपया रुकें और कोई भी कदम उठाने से पहले अपने परिवार के अभिभावक से पुष्टि करें।"
      : "Pause and verify with your family guardian before taking action.")
  );
}

export async function extractScreenshotTextWithGemini(params: {
  base64Data: string;
  mimeType: string;
}): Promise<{ extractedText: string }> {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.base64Data,
          },
        },
        {
          text: "Transcribe all visible SMS, WhatsApp, or payment alert text from this screenshot accurately. Return only the extracted message text without extra commentary.",
        },
      ],
    },
  });
  return {
    extractedText: (response.text || "").trim(),
  };
}

export async function generateParentsAiGuidance(params: {
  toolKey: string;
  prompt: string;
  contextSummary: string;
  lang: string;
}): Promise<string> {
  const ai = getAiClient();
  const langLabel = params.lang === "hi" ? "Hindi (Devanagari)" : "English";
  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: `Tool: ${params.toolKey}\nFamily context: ${params.contextSummary}\nRequest: ${redactSensitive(params.prompt)}`,
    config: {
      systemInstruction: `You are Parents AI, a calm family organization, caregiving, and household budgeting assistant. Reply in ${langLabel}. Be structured, warm, and concise. Never ask for bank passwords, PINs, OTPs, or card numbers.`,
    },
  });
  return (response.text || "").trim() || "Here is a structured plan you can review with your family.";
}
