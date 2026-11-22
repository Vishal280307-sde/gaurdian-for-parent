import React, { useState } from "react";
import {
  ShieldCheck,
  Bell,
  QrCode,
  PhoneCall,
  CheckSquare,
  Sparkles,
  PhoneIncoming,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { motion } from "motion/react";
import { sectionReveal } from "../lib/motionSystem";
import { EmptyStateCard, VisualAsset } from "./VisualAsset";
import { RiskHistoryPanel } from "./RiskHistoryPanel";
import type { AppStatePayload, LangCode, TabKey } from "../types/guardian";
import { apiFetch } from "../lib/api";

interface OverviewTabProps {
  state: AppStatePayload;
  lang: LangCode;
  onNavigate: (tab: TabKey) => void;
  onRefresh: () => Promise<void>;
}

const PARENT_AVATAR = "/src/assets/images/avatar_parent_user_1795328196848.jpg";
const GUARDIAN_AVATAR = "/src/assets/images/avatar_guardian_user_1795328197006.jpg";

export const OverviewTab: React.FC<OverviewTabProps> = ({ state, lang, onNavigate, onRefresh }) => {
  const isParent = state.user.role === "parent";
  const pendingApprovals = state.reqs.filter((r) => r.st === "pending" || r.st === "verification_requested").length;
  const unreadCount = state.notifications.filter((n) => !n.read_at).length;
  const activeRedAlerts = isParent
    ? state.gsi?.activeRedAlerts || []
    : state.linkedGsiOverview?.activeRedAlerts || [];
  const qrList = isParent ? state.qrScans || [] : state.linkedQrScans || [];
  const callCount = isParent
    ? state.callWatcher?.calls?.length || 0
    : state.linkedCallWatcherEvents?.length || 0;
  const protectionStatus = isParent
    ? state.callWatcher?.settings?.protectionStatus || "Protection partially active"
    : lang === "hi"
      ? "परिवार देखरेख सक्रिय"
      : "Family oversight active";

  const chartSegments = [
    {
      label: lang === "hi" ? "QR जांच" : "QR Checks",
      count: qrList.length,
      barClass: "bg-[#0B162C] dark:bg-[#1E3E75]",
    },
    {
      label: lang === "hi" ? "कॉल लॉग" : "Call Timing",
      count: callCount,
      barClass: "bg-[#16325B] dark:bg-[#3B62A8]",
    },
    {
      label: lang === "hi" ? "लंबित अनुमोदन" : "Pending Approvals",
      count: pendingApprovals,
      barClass: "bg-[#C8A45D]",
    },
    {
      label: lang === "hi" ? "रेड अलर्ट" : "Red Alerts",
      count: activeRedAlerts.length,
      barClass: "bg-[#946B2D] dark:bg-[#B48441]",
    },
  ];
  const totalActivity = Math.max(1, chartSegments.reduce((sum, s) => sum + s.count, 0));

  const [togglingCallProtect, setTogglingCallProtect] = useState(false);

  const callSummary = state.callWatcher?.summary;
  const guardianCallSummaries = state.linkedCallProtectionSummary || [];
  const primaryGuardianCall = guardianCallSummaries[0];

  const autoEnabled = isParent
    ? Boolean(callSummary?.autoDetectionEnabled ?? state.callWatcher?.settings?.consent_status === "active")
    : Boolean(primaryGuardianCall?.autoDetectionEnabled);
  const callsScreenedCount = isParent
    ? callSummary?.callsScreened ?? (state.callWatcher?.calls?.length || 0)
    : guardianCallSummaries.reduce((sum, s) => sum + s.callsScreened, 0);
  const suspiciousCallCount = isParent
    ? callSummary?.suspiciousIdentified ?? 0
    : guardianCallSummaries.reduce((sum, s) => sum + s.suspiciousIdentified, 0);
  const lastScreeningAt = isParent
    ? callSummary?.lastScreeningAt ?? null
    : primaryGuardianCall?.lastScreeningAt ?? null;
  const recentlyFlaggedCalls = isParent
    ? callSummary?.recentlyFlagged || []
    : guardianCallSummaries.flatMap((g) => g.recentlyFlagged || []).slice(0, 5);

  async function toggleAutomaticCallProtection() {
    if (!isParent) return;
    setTogglingCallProtect(true);
    try {
      await apiFetch("/api/call-watcher/consent", {
        method: "POST",
        body: JSON.stringify({ action: autoEnabled ? "pause" : "activate" }),
      });
      await onRefresh();
    } finally {
      setTogglingCallProtect(false);
    }
  }

  async function markAllRead() {
    await apiFetch("/api/notifications/read", { method: "POST" });
    await onRefresh();
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sectionReveal}
      className="space-y-8"
    >
      {/* Top 2-column Family Profile & Protection Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 gp-card rounded-xl p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={isParent ? PARENT_AVATAR : GUARDIAN_AVATAR}
                alt={state.user.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border border-[#C8A45D]/60 shrink-0"
              />
              <div>
                <p className="text-xs font-semibold text-[#8A6021] dark:text-[#E0C27E]">
                  {isParent
                    ? lang === "hi"
                      ? "माता-पिता खाता · सहमति-प्रथम सुरक्षा"
                      : "Parent Account · Consent-First Protection"
                    : lang === "hi"
                      ? "अभिभावक कंसोल · परिवार समीक्षा"
                      : "Guardian Console · Family Review"}
                </p>
                <h1 className="mt-0.5 text-2xl font-bold text-[#0B162C] dark:text-[#F5F0E4]">
                  {state.user.name}
                </h1>
                <p className="mt-0.5 text-xs text-[#525E75] dark:text-[#9BAAC4] font-mono">
                  @{state.user.username} · {protectionStatus}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("scam_qr")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B162C] hover:bg-[#16325B] dark:bg-[#C8A45D] dark:hover:bg-[#D6B46E] text-[#FAF7F0] dark:text-[#070E1C] border border-[#C8A45D]/40 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#E5CA8B] dark:text-[#070E1C]" />
              {lang === "hi" ? "संदेश या QR जांचें" : "Check Message or QR"}
            </button>
          </div>

          {/* 4-column metric strip */}
          <div className="mt-6 pt-6 border-t border-[#E4DCCB] dark:border-[#1E3256] grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
                {lang === "hi" ? "लंबित अनुमोदन" : "Pending Approvals"}
              </p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0B162C] dark:text-[#F5F0E4]">
                {pendingApprovals}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
                {lang === "hi" ? "सक्रिय रेड अलर्ट" : "Active Red Alerts"}
              </p>
              <p
                className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                  activeRedAlerts.length > 0
                    ? "text-[#B42318] dark:text-[#F87171]"
                    : "text-[#0B162C] dark:text-[#F5F0E4]"
                }`}
              >
                {activeRedAlerts.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
                {lang === "hi" ? "QR स्कैन लॉग" : "QR Scans Logged"}
              </p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0B162C] dark:text-[#F5F0E4]">
                {qrList.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
                {lang === "hi" ? "अपठित सूचनाएं" : "Unread Alerts"}
              </p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#8A6021] dark:text-[#E0C27E]">
                {unreadCount}
              </p>
            </div>
          </div>

          {/* Safety Activity Distribution Bar & Analytics Visual */}
          <div className="mt-6 pt-5 border-t border-[#E4DCCB] dark:border-[#1E3256] flex items-center gap-4">
            <VisualAsset
              src="/src/assets/images/cyber_identity_shield_1795331541096.jpg"
              alt={
                lang === "hi"
                  ? "सुरक्षा गतिविधि रिपोर्ट और विश्लेषण दृश्य"
                  : "Protection activity analytics and family security posture"
              }
              lazy={true}
              className="hidden sm:block w-24 aspect-[4/3] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                  {lang === "hi" ? "सुरक्षा गतिविधि सारांश" : "Protection Activity Breakdown"}
                </span>
                <span className="font-mono tabular-nums text-[#525E75] dark:text-[#9BAAC4]">
                  {qrList.length + callCount + pendingApprovals + activeRedAlerts.length}{" "}
                  {lang === "hi" ? "रिकॉर्ड" : "events"}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden bg-[#F3EDE0] dark:bg-[#132342] flex">
                {chartSegments.map((seg) => (
                  <div
                    key={seg.label}
                    style={{ width: `${Math.max(seg.count > 0 ? 8 : 0, (seg.count / totalActivity) * 100)}%` }}
                    className={`${seg.barClass} transition-all duration-200`}
                    title={`${seg.label}: ${seg.count}`}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#525E75] dark:text-[#9BAAC4]">
                {chartSegments.map((seg) => (
                  <span key={seg.label} className="inline-flex items-center gap-1.5">
                    <span className={`inline-block w-2.5 h-2.5 rounded-xs ${seg.barClass}`} />
                    <span>{seg.label}</span>
                    <span className="font-mono tabular-nums font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                      {seg.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Linked Family Card */}
        <div className="lg:col-span-4 gp-card rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
              {isParent
                ? lang === "hi"
                  ? "जुड़े अभिभावक"
                  : "Linked Guardians"
                : lang === "hi"
                  ? "जुड़े माता-पिता"
                  : "Linked Parents"}
            </h2>
            <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4]">
              {isParent
                ? lang === "hi"
                  ? "केवल आपके द्वारा आमंत्रित सत्यापित परिजन ही अनुरोध देख सकते हैं।"
                  : "Only verified family members you invite can review flagged requests."
                : lang === "hi"
                  ? "वे खाते जिन्होंने आपको समीक्षा/अनुमोदन अनुमति दी है।"
                  : "Accounts that granted you read and approval permissions."}
            </p>
            <div className="mt-4 space-y-3">
              {isParent ? (
                (state.links || []).filter((l) => l.status === "active").length > 0 ? (
                  (state.links || [])
                    .filter((l) => l.status === "active")
                    .map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-3 py-2 border-b border-[#E4DCCB] dark:border-[#1E3256] last:border-0"
                      >
                        <img
                          src={GUARDIAN_AVATAR}
                          alt={l.guardian_name || "Guardian"}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-lg object-cover border border-[#C8A45D]/50"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0B162C] dark:text-[#F5F0E4] truncate">
                            {l.guardian_name || "Family Guardian"}
                          </p>
                          <p className="text-xs text-[#8A6021] dark:text-[#E0C27E]">
                            {l.is_secondary
                              ? lang === "hi"
                                ? "द्वितीयक · सक्रिय"
                                : "Secondary · Active"
                              : lang === "hi"
                                ? "प्राथमिक · सक्रिय"
                                : "Primary · Active"}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-[#525E75] dark:text-[#9BAAC4] py-3">
                    {lang === "hi"
                      ? "अभी कोई अभिभावक जुड़ा नहीं है। अनुमोदन टैब में आमंत्रण कोड बनाएं।"
                      : "No active guardian linked yet. Create an invite code in Approvals."}
                  </p>
                )
              ) : (state.linkedParents || []).length > 0 ? (
                (state.linkedParents || []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-2 border-b border-[#E4DCCB] dark:border-[#1E3256] last:border-0"
                  >
                    <img
                      src={PARENT_AVATAR}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-lg object-cover border border-[#C8A45D]/50"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0B162C] dark:text-[#F5F0E4] truncate">{p.name}</p>
                      <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
                        Alerts {p.guardian_alerts ? "On" : "Off"} · Approvals {p.guardian_approve ? "On" : "Off"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#525E75] dark:text-[#9BAAC4] py-3">
                  {lang === "hi"
                    ? "अभी कोई माता-पिता खाता जुड़ा नहीं है। अनुमोदन टैब में आमंत्रण कोड दर्ज करें।"
                    : "No parent linked yet. Accept an invite code in Approvals."}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("approvals")}
            className="mt-4 w-full py-2.5 px-4 rounded-lg border border-[#C8A45D]/70 dark:border-[#C8A45D]/50 bg-[#FAF7F0] dark:bg-[#132342] hover:bg-[#F3EDE0] dark:hover:bg-[#1A2F56] text-xs font-semibold text-[#0B162C] dark:text-[#F5F0E4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {lang === "hi" ? "परिवार लिंक व सहमति प्रबंधित करें" : "Manage Family Links & Consents"}
          </button>
        </div>
      </div>

      {/* Section G: Automatic Call Protection Dashboard Card */}
      <div className="gp-card rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <VisualAsset
              src="/src/assets/images/phone_call_guard_1795331541177.jpg"
              alt={
                lang === "hi"
                  ? "स्वचालित फ़ोन कॉल सुरक्षा कवच"
                  : "Automatic background incoming call protection illustration"
              }
              lazy={true}
              className="hidden sm:block w-20 aspect-[4/3] shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0B162C] dark:bg-[#16325B] border border-[#C8A45D]/50 flex items-center justify-center shrink-0">
                  <PhoneIncoming className="w-4 h-4 text-[#E5CA8B]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                    {lang === "hi" ? "स्वचालित कॉल सुरक्षा" : "Automatic Call Protection"}
                  </h2>
                  <p className="text-xs text-[#525E75] dark:text-[#9BAAC4] flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-[#8A6021] dark:text-[#E0C27E] shrink-0" />
                    <span>
                      {lang === "hi"
                        ? "केवल नंबर मेटाडेटा और प्रतिष्ठा जांच — माइक्रोफ़ोन या कॉल ऑडियो कभी रिकॉर्ड नहीं होता।"
                        : "Metadata & reputation checks only — zero microphone access, zero call recording, zero audio transcription."}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isParent ? (
              <button
                type="button"
                disabled={togglingCallProtect}
                onClick={toggleAutomaticCallProtection}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
                  autoEnabled
                    ? "bg-[#0B162C] dark:bg-[#C8A45D] text-[#E5CA8B] dark:text-[#070E1C] border-[#C8A45D]/60"
                    : "bg-[#F3EDE0] dark:bg-[#132342] text-[#435068] dark:text-[#C6D0E1] border-[#D8CEBA] dark:border-[#243B64]"
                }`}
              >
                {lang === "hi"
                  ? `स्वचालित पहचान: ${autoEnabled ? "चालू (ON)" : "बंद (OFF)"}`
                  : `Automatic Detection: ${autoEnabled ? "ON" : "OFF"}`}
              </button>
            ) : (
              <span className="text-xs font-semibold text-[#8A6021] dark:text-[#E0C27E]">
                {lang === "hi"
                  ? `स्वचालित पहचान: ${autoEnabled ? "चालू (ON)" : "बंद (OFF)"}`
                  : `Automatic Detection: ${autoEnabled ? "ON" : "OFF"}`}
              </span>
            )}

            <button
              type="button"
              onClick={() => onNavigate("calls_links")}
              className="px-3.5 py-2 rounded-lg border border-[#C8A45D]/70 dark:border-[#C8A45D]/50 bg-[#FAF7F0] dark:bg-[#132342] hover:bg-[#F3EDE0] dark:hover:bg-[#1A2F56] text-xs font-semibold text-[#0B162C] dark:text-[#F5F0E4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === "hi" ? "कॉल स्क्रीनिंग खोलें" : "Open Call Screening"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 pt-4 border-t border-[#E4DCCB] dark:border-[#1E3256]">
          <div>
            <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
              {lang === "hi" ? "स्वचालित स्थिति" : "Detection Status"}
            </p>
            <p
              className={`mt-1 text-base font-bold ${
                autoEnabled ? "text-[#1B6B44] dark:text-[#4ADE80]" : "text-[#9A6213] dark:text-[#F0B45B]"
              }`}
            >
              {autoEnabled ? (lang === "hi" ? "ON (सक्रिय)" : "ON") : lang === "hi" ? "OFF (रोका गया)" : "OFF"}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
              {lang === "hi" ? "जांची गई कॉल" : "Calls Screened"}
            </p>
            <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#0B162C] dark:text-[#F5F0E4]">
              {callsScreenedCount}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
              {lang === "hi" ? "संदिग्ध नंबर मिले" : "Suspicious Identified"}
            </p>
            <p
              className={`mt-1 text-xl font-bold font-mono tabular-nums ${
                suspiciousCallCount > 0 ? "text-[#B42318] dark:text-[#F87171]" : "text-[#0B162C] dark:text-[#F5F0E4]"
              }`}
            >
              {suspiciousCallCount}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
              {lang === "hi" ? "अंतिम स्क्रीनिंग गतिविधि" : "Last Screening Activity"}
            </p>
            <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-[#8A6021] dark:text-[#E0C27E]">
              {lastScreeningAt
                ? new Date(lastScreeningAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : lang === "hi"
                  ? "अभी कोई नहीं"
                  : "No calls yet"}
            </p>
          </div>
        </div>

        {/* Recently Flagged Numbers */}
        <div className="pt-4 border-t border-[#E4DCCB] dark:border-[#1E3256]">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h3 className="text-xs font-semibold text-[#0B162C] dark:text-[#F5F0E4] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#8A6021] dark:text-[#E0C27E]" />
              {lang === "hi" ? "हाल ही में चिह्नित नंबर (मास्क्ड)" : "Recently Flagged Numbers (Masked)"}
            </h3>
            <span className="text-[11px] text-[#525E75] dark:text-[#9BAAC4]">
              {lang === "hi" ? "एंड्रॉइड CallScreeningService मेटाडेटा" : "Metadata & reputation intelligence"}
            </span>
          </div>

          {recentlyFlaggedCalls.length === 0 ? (
            <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
              {lang === "hi"
                ? "अभी कोई संदिग्ध या चिह्नित इनकमिंग कॉल दर्ज नहीं हुई है।"
                : "No suspicious or flagged incoming numbers recorded yet."}
            </p>
          ) : (
            <div className="divide-y divide-[#E4DCCB] dark:divide-[#1E3256]">
              {recentlyFlaggedCalls.map((fc) => (
                <div key={fc.id} className="py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                      {fc.caller_masked}
                    </span>
                    <span
                      className={`font-semibold ${
                        fc.risk_classification === "HIGH RISK"
                          ? "text-[#B42318] dark:text-[#F87171]"
                          : "text-[#9A6213] dark:text-[#F0B45B]"
                      }`}
                    >
                      {fc.risk_classification}
                    </span>
                    <span className="text-[#525E75] dark:text-[#9BAAC4] truncate">{fc.call_status}</span>
                  </div>
                  <span className="font-mono tabular-nums text-[#8A6021] dark:text-[#E0C27E] shrink-0">
                    {new Date(fc.incoming_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Module Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => onNavigate("scam_qr")}
          className="text-left p-5 gp-card hover:border-[#C8A45D] rounded-xl transition-colors cursor-pointer group"
        >
          <QrCode className="w-5 h-5 text-[#16325B] dark:text-[#E0C27E] group-hover:text-[#8A6021] transition-colors" />
          <h3 className="mt-3 text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
            {lang === "hi" ? "QR व संदेश जांच" : "QR Intelligence"}
          </h3>
          <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4] leading-relaxed">
            {lang === "hi"
              ? "SMS, स्क्रीनशॉट OCR और UPI QR पेलोड सुरक्षित जांचें।"
              : "Analyze SMS text, upload screenshots for OCR, and inspect UPI QR payloads."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("cyber_check")}
          className="text-left p-5 gp-card hover:border-[#C8A45D] rounded-xl transition-colors cursor-pointer group"
        >
          <ShieldCheck className="w-5 h-5 text-[#16325B] dark:text-[#E0C27E] group-hover:text-[#8A6021] transition-colors" />
          <h3 className="mt-3 text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
            {lang === "hi" ? "साइबर सुरक्षा जांच" : "Cyber Safety Check"}
          </h3>
          <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4] leading-relaxed">
            {lang === "hi"
              ? "मोबाइल, ईमेल, UPI ID, बैंक IFSC और URL सत्यापित करें।"
              : "Check mobile numbers, emails, UPI IDs, bank accounts, and URLs."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("calls_links")}
          className="text-left p-5 gp-card hover:border-[#C8A45D] rounded-xl transition-colors cursor-pointer group"
        >
          <PhoneCall className="w-5 h-5 text-[#16325B] dark:text-[#E0C27E] group-hover:text-[#8A6021] transition-colors" />
          <h3 className="mt-3 text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
            {lang === "hi" ? "फोन धोखाधड़ी व लिंक" : "Phone Fraud & Links"}
          </h3>
          <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4] leading-relaxed">
            {lang === "hi"
              ? "कॉलर जांच, कॉल-भुगतान समय सुरक्षा और URL फ़िशिंग पहचान।"
              : "Metadata-only call timing watch, caller screening, and URL checks."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("approvals")}
          className="text-left p-5 gp-card hover:border-[#C8A45D] rounded-xl transition-colors cursor-pointer group"
        >
          <CheckSquare className="w-5 h-5 text-[#16325B] dark:text-[#E0C27E] group-hover:text-[#8A6021] transition-colors" />
          <h3 className="mt-3 text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
            {lang === "hi" ? "अनुमोदन व सेफ़ वर्ड" : "Approvals & Safe Word"}
          </h3>
          <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4] leading-relaxed">
            {lang === "hi"
              ? "एकल-उपयोग भुगतान अनुमोदन, सेफ़ वर्ड और बैंक ब्लॉक हेल्पलाइन।"
              : "Single-use payment approvals, safe word, and bank helplines."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("parents_ai")}
          className="text-left p-5 gp-card hover:border-[#C8A45D] rounded-xl transition-colors cursor-pointer group"
        >
          <Sparkles className="w-5 h-5 text-[#8A6021] dark:text-[#E0C27E]" />
          <h3 className="mt-3 text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
            {lang === "hi" ? "पेरेंट्स AI" : "Parents AI Workspace"}
          </h3>
          <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4] leading-relaxed">
            {lang === "hi"
              ? "सहमति-प्रथम RBI AA अंतर्दृष्टि, घरेलू बजट और AI सलाह।"
              : "Consent-first RBI AA sample insights, budgets, and AI guidance."}
          </p>
        </button>
      </div>

      {/* Unified Suspicion Risk History */}
      <RiskHistoryPanel
        history={isParent ? state.riskHistory || [] : state.linkedRiskHistory || []}
        lang={lang}
        isParent={isParent}
      />

      {/* Notifications & Recent Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 gp-card rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#8A6021] dark:text-[#E0C27E]" />
              <h2 className="text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                {lang === "hi" ? "परिवार सूचनाएं" : "Family Notifications"}
              </h2>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-[#8A6021] dark:text-[#E0C27E] hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                {lang === "hi" ? "सभी पढ़ी हुई मानें" : "Mark all read"}
              </button>
            )}
          </div>

          {state.notifications.length === 0 ? (
            <EmptyStateCard
              compact
              title={lang === "hi" ? "कोई नई सूचना नहीं" : "All Clear — No New Alerts"}
              description={
                lang === "hi"
                  ? "सुरक्षा अलर्ट, अभिभावक आमंत्रण और भुगतान अनुमोदन सूचनाएं यहां दिखेंगी।"
                  : "Safety alerts, guardian invites, and payment verification notices will appear here."
              }
            />
          ) : (
            <div className="divide-y divide-[#E4DCCB] dark:divide-[#1E3256]">
              {state.notifications.slice(0, 6).map((n) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        !n.read_at
                          ? "text-[#0B162C] dark:text-[#F5F0E4]"
                          : "text-[#525E75] dark:text-[#9BAAC4]"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#525E75] dark:text-[#9BAAC4]">{n.body}</p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-[#8A6021] dark:text-[#E0C27E] shrink-0">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 gp-card rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4] mb-4">
            {lang === "hi" ? "सुरक्षित ऑडिट लॉग" : "Tamper-Evident Audit Trail"}
          </h2>
          {state.audit.length === 0 ? (
            <EmptyStateCard
              compact
              title={lang === "hi" ? "ऑडिट लॉग प्रतीक्षा में" : "Audit Trail Ready"}
              description={
                lang === "hi"
                  ? "कार्रवाई होने पर छिपे हुए पहचानकर्ताओं के साथ ऑडिट लॉग बनते हैं।"
                  : "Tamper-evident events with redacted identifiers appear as actions occur."
              }
            />
          ) : (
            <div className="divide-y divide-[#E4DCCB] dark:divide-[#1E3256]">
              {state.audit.slice(0, 7).map((a, idx) => (
                <div key={`${a.h}-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-[#435068] dark:text-[#C6D0E1] truncate">{a.ev}</p>
                  <span className="text-[11px] font-mono tabular-nums text-[#8A6021] dark:text-[#E0C27E] shrink-0">
                    {a.t} · {a.h.slice(0, 6)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
