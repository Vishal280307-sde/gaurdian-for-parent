import React, { useState } from "react";
import { ShieldCheck, Search } from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../lib/api";
import { sectionReveal } from "../lib/motionSystem";
import { SourceTransparencyPanel } from "./SourceTransparencyPanel";
import { SuspicionScoreCard } from "./SuspicionScoreCard";
import { EmptyStateCard, VisualAsset } from "./VisualAsset";
import type {
  CyberIdentifierType,
  CyberSafetyCheckResult,
  LangCode,
} from "../types/guardian";

interface CyberCheckTabProps {
  lang: LangCode;
  isAuthenticated: boolean;
  onRefresh?: () => Promise<void>;
}

const PRESETS: { type: CyberIdentifierType; label: string; labelHi: string; sample: string }[] = [
  { type: "mobile", label: "Mobile Number", labelHi: "मोबाइल नंबर", sample: "+919820011223" },
  { type: "email", label: "Email Address", labelHi: "ईमेल पता", sample: "kyc-verify@sbi-alerts-help.xyz" },
  { type: "upi", label: "UPI ID", labelHi: "UPI ID", sample: "cashback-refund@okaxis" },
  { type: "bank_account", label: "Bank Account / IFSC", labelHi: "बैंक खाता / IFSC", sample: "SBIN0001234 / 301122334455" },
  { type: "url", label: "Website URL", labelHi: "वेबसाइट URL", sample: "http://hdfc-pan-verify.xyz/login" },
];

export const CyberCheckTab: React.FC<CyberCheckTabProps> = ({ lang, isAuthenticated, onRefresh }) => {
  const [identifierType, setIdentifierType] = useState<CyberIdentifierType>("upi");
  const [value, setValue] = useState("cashback-refund@okaxis");
  const [result, setResult] = useState<CyberSafetyCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [aiExplain, setAiExplain] = useState<{ explanation: string; nextSteps: string[] } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  async function runCheck(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setAiExplain(null);
    setAiError(null);
    if (!value.trim()) {
      setError(
        lang === "hi"
          ? "जांचने के लिए मोबाइल नंबर, ईमेल, UPI ID, बैंक विवरण या URL दर्ज करें।"
          : "Enter a mobile number, email, UPI ID, bank identifier, or URL to check."
      );
      return;
    }

    setBusy(true);
    try {
      const endpoint = isAuthenticated ? "/api/cyber-check" : "/api/public/cyber-check";
      const data = await apiFetch<CyberSafetyCheckResult>(endpoint, {
        method: "POST",
        body: JSON.stringify({ identifierType, value }),
      });
      setResult(data);
      if (isAuthenticated && onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cyber safety check failed.");
    } finally {
      setBusy(false);
    }
  }

  async function requestAiExplanation() {
    if (!result) return;
    setAiError(null);
    setAiBusy(true);
    try {
      const levelMap =
        result.overallStatus === "HIGH RISK"
          ? "HIGH"
          : result.overallStatus === "CAUTION"
            ? "MEDIUM"
            : "LOW";
      const data = await apiFetch<{ explanation: string; nextSteps: string[] }>("/api/ai/explain", {
        method: "POST",
        body: JSON.stringify({
          text: `${result.identifierType}: ${result.maskedValue}`,
          signals: result.findings,
          findings: lang === "hi" ? result.findingsHi : result.findings,
          score: result.suspicionAssessment?.score ?? result.riskScore,
          riskLevel: result.suspicionAssessment?.riskLevel ?? levelMap,
          verificationStatus: result.suspicionAssessment?.verificationStatus ?? result.overallStatus,
          indicators: result.suspicionAssessment?.indicators.map((i) => ({
            label: i.label,
            points: i.points,
            evidence: i.evidence,
            sourceName: i.sourceName,
            verified: i.verified,
          })),
          sourcesUnavailable: result.suspicionAssessment?.sourcesUnavailable,
          sourceChecks: result.sourceChecks.map((s) => ({
            sourceName: s.sourceName,
            verificationStatus: s.verificationStatus,
            result: s.result,
            limitations: s.limitations,
          })),
          level: levelMap,
          lang,
          contextType: `cyber_check_${result.identifierType}`,
        }),
      });
      setAiExplain(data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gemini AI explanation unavailable.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sectionReveal}
      className="space-y-6"
    >
      <div className="gp-card rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <VisualAsset
              src="/src/assets/images/cyber_identity_shield_1795331541096.jpg"
              alt={
                lang === "hi"
                  ? "व्यक्तिगत डिजिटल पहचान, ईमेल, UPI और वेबसाइट सुरक्षा दृश्य"
                  : "Personal digital identity, email, UPI, and website security visual"
              }
              lazy={false}
              className="hidden sm:block w-24 md:w-28 aspect-[4/3] shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#16325B] dark:text-[#E0C27E]" />
                <h2 className="text-lg font-bold text-[#0B162C] dark:text-[#F5F0E4]">
                  {lang === "hi" ? "व्यक्तिगत साइबर सुरक्षा जांच" : "Personal Cyber Safety Check"}
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4] max-w-2xl leading-relaxed">
                {lang === "hi"
                  ? "मोबाइल नंबर, ईमेल पते, UPI ID, बैंक खाता/IFSC या वेबसाइट URL की जांच करें। हर परिणाम सत्यापन स्थिति और स्रोत की सीमाएं स्पष्ट दिखाता है।"
                  : "Verify mobile numbers, email addresses, UPI IDs, bank account identifiers, and website URLs with full source transparency."}
              </p>
            </div>
          </div>
        </div>

        {/* Identifier Type Selector */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active = identifierType === p.type;
            return (
              <button
                key={p.type}
                type="button"
                onClick={() => {
                  setIdentifierType(p.type);
                  setValue(p.sample);
                  setResult(null);
                  setAiExplain(null);
                  setError(null);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                  active
                    ? "bg-[#0B162C] dark:bg-[#C8A45D] text-[#FAF7F0] dark:text-[#070E1C] border-[#C8A45D]"
                    : "bg-[#F3EDE0] dark:bg-[#132342] text-[#0B162C] dark:text-[#F5F0E4] border-[#D8CEBA] dark:border-[#243B64] hover:border-[#C8A45D]"
                }`}
              >
                {lang === "hi" ? p.labelHi : p.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={runCheck} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              lang === "hi"
                ? "मोबाइल नंबर, ईमेल, UPI ID, IFSC या URL लिखें..."
                : "Enter mobile number, email, UPI ID, bank IFSC/account, or URL..."
            }
            className="flex-1 rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] px-4 py-2.5 text-sm font-mono text-[#0B162C] dark:text-[#F5F0E4] focus:outline-none focus:border-[#C8A45D]"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B162C] hover:bg-[#16325B] dark:bg-[#C8A45D] dark:hover:bg-[#D6B46E] text-[#FAF7F0] dark:text-[#070E1C] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Search className="w-4 h-4" />
            {busy
              ? lang === "hi"
                ? "जांच जारी..."
                : "Checking..."
              : lang === "hi"
                ? "सुरक्षा जांचें"
                : "Run Safety Check"}
          </button>
        </form>

        {error && <p className="text-xs font-medium text-[#B42318] dark:text-[#F87171]">{error}</p>}

        {!result && (
          <EmptyStateCard
            title={
              lang === "hi"
                ? "पहचानकर्ता जांचने के लिए तैयार"
                : "Ready to Verify Your Digital Identifier"
            }
            description={
              lang === "hi"
                ? "ऊपर कोई श्रेणी चुनें और 'सुरक्षा जांचें' दबाएं — सत्यापन स्थिति, जोखिम संकेत और पारदर्शी स्रोत विवरण तुरंत दिखेंगे।"
                : "Select a category above and run a safety check to view risk classifications, recommendations, and verified source transparency."
            }
          />
        )}

        {result && (
          <div className="pt-4 border-t border-[#E4DCCB] dark:border-[#1E3256] space-y-4">
            <SuspicionScoreCard
              assessment={result.suspicionAssessment}
              lang={lang}
              onExplainAi={requestAiExplanation}
              aiBusy={aiBusy}
              aiExplain={aiExplain}
              aiError={aiError}
            />
            <SourceTransparencyPanel sources={result.sourceChecks} lang={lang} />
          </div>
        )}
      </div>
    </motion.div>
  );
};
