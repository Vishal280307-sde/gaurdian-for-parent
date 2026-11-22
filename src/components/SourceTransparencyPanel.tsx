import React from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle, ServerOff } from "lucide-react";
import type { LangCode, SourceCheckEntry, TransparencyStatus } from "../types/guardian";

interface SourceTransparencyPanelProps {
  sources: SourceCheckEntry[];
  lang: LangCode;
  title?: string;
}

function getStatusMeta(status: TransparencyStatus, lang: LangCode) {
  switch (status) {
    case "HIGH RISK":
      return {
        label: lang === "hi" ? "उच्च जोखिम (HIGH RISK)" : "HIGH RISK",
        color: "text-[#B42318] dark:text-[#F87171]",
        Icon: ShieldAlert,
      };
    case "CAUTION":
      return {
        label: lang === "hi" ? "सावधानी (CAUTION)" : "CAUTION",
        color: "text-[#9A6213] dark:text-[#F0B45B]",
        Icon: AlertTriangle,
      };
    case "NO KNOWN THREAT DETECTED":
      return {
        label: lang === "hi" ? "कोई ज्ञात खतरा नहीं (NO KNOWN THREAT DETECTED)" : "NO KNOWN THREAT DETECTED",
        color: "text-[#1B6B44] dark:text-[#4ADE80]",
        Icon: CheckCircle2,
      };
    case "SOURCE UNAVAILABLE":
      return {
        label: lang === "hi" ? "स्रोत अनुपलब्ध (SOURCE UNAVAILABLE)" : "SOURCE UNAVAILABLE",
        color: "text-[#525E75] dark:text-[#9BAAC4]",
        Icon: ServerOff,
      };
    case "MANUAL VERIFICATION REQUIRED":
    default:
      return {
        label:
          lang === "hi"
            ? "स्वयं पुष्टि आवश्यक (MANUAL VERIFICATION REQUIRED)"
            : "MANUAL VERIFICATION REQUIRED",
        color: "text-[#8A6021] dark:text-[#E0C27E]",
        Icon: HelpCircle,
      };
  }
}

export const SourceTransparencyPanel: React.FC<SourceTransparencyPanelProps> = ({ sources, lang, title }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-[#E4DCCB] dark:border-[#1E3256] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#0B162C] dark:text-[#E5CA8B]">
          {title ||
            (lang === "hi"
              ? "स्रोत पारदर्शिता व सत्यापन विवरण"
              : "Source Transparency & Verification Ledger")}
        </h3>
        <span className="text-[11px] text-[#525E75] dark:text-[#9BAAC4]">
          {lang === "hi"
            ? "खतरा न दिखने का अर्थ सुरक्षा की गारंटी नहीं है"
            : "No known matches is never a guarantee of safety"}
        </span>
      </div>

      <div className="divide-y divide-[#E4DCCB] dark:divide-[#1E3256] rounded-lg border border-[#E4DCCB] dark:border-[#1E3256] bg-[#FAF7F0] dark:bg-[#091224]">
        {sources.map((src, idx) => {
          const meta = getStatusMeta(src.verificationStatus, lang);
          const StatusIcon = meta.Icon;
          return (
            <div key={`${src.sourceName}-${idx}`} className="p-3.5 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                  {lang === "hi" ? src.sourceNameHi : src.sourceName}
                </span>
                <span className={`inline-flex items-center gap-1.5 font-semibold ${meta.color}`}>
                  <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{meta.label}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#525E75] dark:text-[#9BAAC4]">
                <span>
                  {lang === "hi" ? "जांचा गया:" : "Checked:"}{" "}
                  <strong className="font-mono text-[#0B162C] dark:text-[#C6D0E1]">{src.informationChecked}</strong>
                </span>
                <span className="font-mono tabular-nums">
                  {lang === "hi" ? "समय:" : "Last checked:"}{" "}
                  {new Date(src.lastCheckedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>

              <p className="text-[#435068] dark:text-[#C6D0E1]">
                {lang === "hi" ? src.resultHi : src.result}
              </p>

              <p className="text-[11px] text-[#8A6021] dark:text-[#E0C27E]">
                {lang === "hi" ? "सीमाएं:" : "Source limitations:"}{" "}
                {lang === "hi" ? src.limitationsHi : src.limitations}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
