import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Info,
  ServerOff,
} from "lucide-react";
import type { LangCode, SuspicionAssessment } from "../types/guardian";

interface SuspicionScoreCardProps {
  assessment: SuspicionAssessment;
  lang: LangCode;
  onExplainAi?: () => void;
  aiBusy?: boolean;
  aiExplain?: { explanation: string; nextSteps: string[] } | null;
  aiError?: string | null;
}

function getRiskPalette(level: SuspicionAssessment["riskLevel"]) {
  if (level === "HIGH") {
    return {
      stroke: "#B42318",
      darkStroke: "#F87171",
      barBg: "bg-[#B42318] dark:bg-[#F87171]",
      textColor: "text-[#B42318] dark:text-[#F87171]",
      borderColor: "border-[#B42318]/40 dark:border-[#F87171]/35",
      Icon: ShieldAlert,
    };
  }
  if (level === "MODERATE") {
    return {
      stroke: "#B45309",
      darkStroke: "#F0B45B",
      barBg: "bg-[#C26A1B] dark:bg-[#F0B45B]",
      textColor: "text-[#9A6213] dark:text-[#F0B45B]",
      borderColor: "border-[#C26A1B]/45 dark:border-[#F0B45B]/35",
      Icon: AlertTriangle,
    };
  }
  return {
    stroke: "#1B6B44",
    darkStroke: "#4ADE80",
    barBg: "bg-[#1B6B44] dark:bg-[#4ADE80]",
    textColor: "text-[#1B6B44] dark:text-[#4ADE80]",
    borderColor: "border-[#1B6B44]/35 dark:border-[#4ADE80]/30",
    Icon: ShieldCheck,
  };
}

export const SuspicionScoreCard: React.FC<SuspicionScoreCardProps> = ({
  assessment,
  lang,
  onExplainAi,
  aiBusy,
  aiExplain,
  aiError,
}) => {
  const palette = getRiskPalette(assessment.riskLevel);
  const StatusIcon = palette.Icon;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.max(0, Math.min(100, assessment.score)) / 100) * circumference;

  return (
    <div
      className={`rounded-xl border ${palette.borderColor} bg-[#FAF7F0] dark:bg-[#091224] p-4 sm:p-5 space-y-4`}
    >
      {/* Top Gauge + Risk Classification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-22 h-22 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90" aria-hidden="true">
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                strokeWidth="7"
                className="stroke-[#E4DCCB] dark:stroke-[#1E3256]"
              />
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ stroke: palette.stroke }}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-bold font-mono tabular-nums leading-none ${palette.textColor}`}>
                {assessment.score}
              </span>
              <span className="text-[10px] font-mono text-[#525E75] dark:text-[#9BAAC4] mt-0.5">/100</span>
            </div>
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusIcon className={`w-4 h-4 shrink-0 ${palette.textColor}`} />
              <span className={`text-sm font-bold tracking-wide ${palette.textColor}`}>
                {assessment.score}/100 — {assessment.riskLabel}
              </span>
            </div>
            <p className="text-xs font-mono text-[#0B162C] dark:text-[#F5F0E4] break-all">
              {assessment.category} · {assessment.maskedIdentifier}
            </p>
            <p className="text-xs text-[#435068] dark:text-[#C6D0E1]">
              {lang === "hi" ? assessment.mainReasonHi : assessment.mainReason}
            </p>
          </div>
        </div>

        {onExplainAi && (
          <button
            type="button"
            disabled={aiBusy}
            onClick={onExplainAi}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#C8A45D] bg-[#F3EDE0] dark:bg-[#132342] hover:bg-[#EAE1CE] dark:hover:bg-[#1A2F56] text-xs font-semibold text-[#0B162C] dark:text-[#E5CA8B] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8A6021] dark:text-[#E0C27E]" />
            {aiBusy
              ? lang === "hi"
                ? "AI समझा रहा है..."
                : "Explaining..."
              : lang === "hi"
                ? "AI से स्कोर समझें"
                : "Explain Score with AI"}
          </button>
        )}
      </div>

      {/* Horizontal Risk Meter Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-[#525E75] dark:text-[#9BAAC4]">
          <span>
            {lang === "hi" ? "सत्यापन स्थिति:" : "Verification Status:"}{" "}
            <strong className="text-[#0B162C] dark:text-[#F5F0E4]">{assessment.verificationStatus}</strong>
          </span>
          <span className="font-mono tabular-nums">
            0–29 LOW · 30–69 MODERATE · 70–100 HIGH
          </span>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden bg-[#E4DCCB] dark:bg-[#132342]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${palette.barBg}`}
            style={{ width: `${Math.max(assessment.score > 0 ? 4 : 0, assessment.score)}%` }}
          />
        </div>
      </div>

      {/* Conflicting Sources Alert */}
      {assessment.conflictingSources && (
        <div className="p-3 rounded-lg bg-[#F3EDE0] dark:bg-[#132342] border border-[#C8A45D] text-xs text-[#0B162C] dark:text-[#F5F0E4] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#9A6213] dark:text-[#F0B45B] shrink-0 mt-0.5" />
          <span>{lang === "hi" ? assessment.conflictNoteHi : assessment.conflictNote}</span>
        </div>
      )}

      {/* Detected Indicators & Supporting Evidence */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
            {lang === "hi" ? "पाए गए संदेह संकेत और साक्ष्य" : "Suspicious Indicators & Supporting Evidence"}
          </h4>
          {assessment.deduplicatedCount > 0 && (
            <span className="text-[11px] text-[#8A6021] dark:text-[#E0C27E]">
              {lang === "hi"
                ? `${assessment.deduplicatedCount} दोहरी रिपोर्ट हटाई गईं`
                : `${assessment.deduplicatedCount} duplicate indicator(s) collapsed`}
            </span>
          )}
        </div>

        {assessment.indicators.length === 0 ? (
          <div className="p-3 rounded-lg bg-[#F3EDE0]/60 dark:bg-[#132342]/60 border border-[#E4DCCB] dark:border-[#1E3256] text-xs text-[#435068] dark:text-[#C6D0E1] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1B6B44] dark:text-[#4ADE80] shrink-0 mt-0.5" />
            <span>
              {lang === "hi"
                ? "उपलब्ध स्थानीय और संरचनात्मक जांच में कोई संदेह संकेत नहीं मिला (स्कोर 0/100)।"
                : "No weighted suspicion indicators triggered across checked sources (score 0/100)."}
            </span>
          </div>
        ) : (
          <div className="divide-y divide-[#E4DCCB] dark:divide-[#1E3256] rounded-lg border border-[#E4DCCB] dark:border-[#1E3256] bg-[#FFFDF9] dark:bg-[#0D1A33]">
            {assessment.indicators.map((ind) => (
              <div key={ind.code} className="p-3 space-y-1 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                    {lang === "hi" ? ind.labelHi : ind.label}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[#8A6021] dark:text-[#E0C27E]">
                    +{ind.points} pts · {ind.verified ? (lang === "hi" ? "सत्यापित जांच" : "Verified signal") : (lang === "hi" ? "असत्यापित" : "Unverified")}
                  </span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[#435068] dark:text-[#C6D0E1]">
                  {(lang === "hi" ? ind.evidenceHi : ind.evidence).map((ev, idx) => (
                    <li key={idx}>{ev}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-[#525E75] dark:text-[#9BAAC4]">
                  {lang === "hi" ? "स्रोत:" : "Source:"} {ind.sourceName}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unavailable Sources Separated Cleanly */}
      {assessment.sourcesUnavailable.length > 0 && (
        <div className="p-3 rounded-lg bg-[#F3EDE0]/70 dark:bg-[#132342]/70 border border-[#E4DCCB] dark:border-[#1E3256] text-xs flex items-start gap-2">
          <ServerOff className="w-4 h-4 text-[#525E75] dark:text-[#9BAAC4] shrink-0 mt-0.5" />
          <div className="text-[#435068] dark:text-[#C6D0E1]">
            <strong className="text-[#0B162C] dark:text-[#F5F0E4]">
              {lang === "hi" ? "अनुपलब्ध स्रोत (+0 अंक):" : "Unavailable Sources (+0 pts added):"}
            </strong>{" "}
            {assessment.sourcesUnavailable.join(", ")}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
          {lang === "hi" ? "सुझाई गई कार्रवाई:" : "Recommended Action:"}
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-[#435068] dark:text-[#C6D0E1]">
          {(lang === "hi" ? assessment.recommendedActionsHi : assessment.recommendedActions).map((act, idx) => (
            <li key={idx}>{act}</li>
          ))}
        </ul>
      </div>

      {/* Grounded Gemini AI Explanation */}
      {aiExplain && (
        <div className="p-4 rounded-lg bg-[#F3EDE0]/80 dark:bg-[#132342] border border-[#C8A45D]/70 space-y-2">
          <p className="text-xs font-semibold text-[#8A6021] dark:text-[#E0C27E]">
            {lang === "hi"
              ? "Gemini AI व्याख्या (केवल वास्तविक स्कोर व साक्ष्य आधारित)"
              : "Gemini AI Explanation (Grounded in Scored Evidence)"}
          </p>
          <p className="text-sm text-[#0B162C] dark:text-[#F5F0E4] leading-relaxed">{aiExplain.explanation}</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#435068] dark:text-[#C6D0E1]">
            {aiExplain.nextSteps.map((st, idx) => (
              <li key={idx}>{st}</li>
            ))}
          </ul>
        </div>
      )}

      {aiError && <p className="text-xs text-[#9A6213] dark:text-[#F0B45B]">{aiError}</p>}

      {/* Explicit Accuracy Notice */}
      <div className="pt-2 border-t border-[#E4DCCB] dark:border-[#1E3256] flex items-start gap-2 text-[11px] text-[#525E75] dark:text-[#9BAAC4]">
        <Info className="w-3.5 h-3.5 text-[#8A6021] dark:text-[#E0C27E] shrink-0 mt-0.5" />
        <span>{lang === "hi" ? assessment.disclaimerHi : assessment.disclaimer}</span>
      </div>
    </div>
  );
};
