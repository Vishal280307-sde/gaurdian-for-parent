import React, { useState } from "react";
import { ShieldAlert, QrCode, Upload, MessageSquare, Send, Flag, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../lib/api";
import { sectionReveal } from "../lib/motionSystem";
import { decodeQrFromImageFile, evaluateMessageLocally, type LocalScamAssessment } from "../lib/scamClient";
import { SourceTransparencyPanel } from "./SourceTransparencyPanel";
import { SuspicionScoreCard } from "./SuspicionScoreCard";
import { EmptyStateCard, VisualAsset } from "./VisualAsset";
import type { AppStatePayload, LangCode, SourceCheckEntry, SuspicionAssessment } from "../types/guardian";

interface ScamQrTabProps {
  state: AppStatePayload;
  lang: LangCode;
  onRefresh: () => Promise<void>;
}

interface QrReport {
  id: string;
  qrFormat: string;
  qrClassification: string;
  upiId: string | null;
  payeeName: string | null;
  amount: number | null;
  amountState: string;
  securityRiskScore: number;
  securityRiskLevel: string;
  paymentLoadCategory: string;
  signals: string[];
  guidance: string;
  sourceChecks?: SourceCheckEntry[];
  suspicionAssessment?: SuspicionAssessment;
}

const SAMPLE_MESSAGES = [
  {
    label: "KYC / AnyDesk Scam",
    labelHi: "KYC / AnyDesk घोटाला",
    text: "Dear customer, your SBI YONO account will be blocked today. Update PAN KYC immediately via http://sbi-kyc-help.xyz or call and install AnyDesk QuickSupport.",
  },
  {
    label: "Electricity Disconnection",
    labelHi: "बिजली कटौती धमकी",
    text: "URGENT: Your electricity meter will be disconnected tonight at 9:30 PM because last month bill was not updated. Call 9876543210 immediately and pay ₹12.",
  },
  {
    label: "UPI Receive-Money Trap",
    labelHi: "UPI रिफंड जाल",
    text: "Congratulations! You won ₹15,000 cashback. Scan the QR code and enter your UPI PIN to receive money into your bank account.",
  },
];

const SAMPLE_QRS = [
  {
    label: "Safe Local Grocer UPI",
    labelHi: "सुरक्षित स्थानीय किराना UPI",
    payload: "upi://pay?pa=sharmagrocers@okicici&pn=Sharma%20Provision%20Store&am=450&cu=INR&tn=Groceries",
  },
  {
    label: "High-Risk Refund Trap QR",
    labelHi: "उच्च जोखिम रिफंड QR",
    payload: "upi://pay?pa=cashbackclaim88@ybl&pn=Official%20Bank%20Refund&am=28500&cu=INR&tn=Claim%20Cashback%20Refund%20Now",
  },
  {
    label: "Suspicious Web Link QR",
    labelHi: "संदिग्ध वेब लिंक QR",
    payload: "http://hdfc-pan-verify.xyz/login?ref=urgent",
  },
];

export const ScamQrTab: React.FC<ScamQrTabProps> = ({ state, lang, onRefresh }) => {
  const isParent = state.user.role === "parent";

  const [msgText, setMsgText] = useState(SAMPLE_MESSAGES[0].text);
  const [assessment, setAssessment] = useState<LocalScamAssessment | null>(() =>
    evaluateMessageLocally(SAMPLE_MESSAGES[0].text)
  );
  const [aiExplain, setAiExplain] = useState<{ explanation: string; nextSteps: string[] } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [busyMsg, setBusyMsg] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  const [chatBusy, setChatBusy] = useState(false);

  const [qrPayload, setQrPayload] = useState(SAMPLE_QRS[1].payload);
  const [qrReport, setQrReport] = useState<QrReport | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrAiExplain, setQrAiExplain] = useState<{ explanation: string; nextSteps: string[] } | null>(null);
  const [qrAiError, setQrAiError] = useState<string | null>(null);
  const [qrAiBusy, setQrAiBusy] = useState(false);

  async function runMessageCheck() {
    const local = evaluateMessageLocally(msgText);
    setAssessment(local);
    setAiExplain(null);
    setAiError(null);
    setReportNotice(null);
    if (!msgText.trim()) return;

    setBusyMsg(true);
    try {
      if (isParent) {
        await apiFetch("/api/scam/record", {
          method: "POST",
          body: JSON.stringify({
            score: local.score,
            level: local.level,
            cat: local.category,
            sig: local.signals,
            text: msgText,
            lang,
          }),
        });
      }
      const exp = await apiFetch<{ explanation: string; nextSteps: string[] }>("/api/ai/explain", {
        method: "POST",
        body: JSON.stringify({
          text: msgText,
          signals: local.signals,
          level: local.level,
          lang,
          contextType: "message",
        }),
      });
      setAiExplain(exp);
      await onRefresh();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI explanation unavailable.");
      await onRefresh();
    } finally {
      setBusyMsg(false);
    }
  }

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiError(null);
    setBusyMsg(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = String(reader.result || "");
          resolve(res.split(",")[1] || "");
        };
        reader.onerror = () => reject(new Error("Could not read screenshot file."));
        reader.readAsDataURL(file);
      });
      const ocr = await apiFetch<{ extractedText: string }>("/api/ai/ocr", {
        method: "POST",
        body: JSON.stringify({ base64Data: base64, mimeType: file.type || "image/png" }),
      });
      if (ocr.extractedText) {
        setMsgText(ocr.extractedText);
        setAssessment(evaluateMessageLocally(ocr.extractedText));
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Screenshot OCR failed.");
    } finally {
      setBusyMsg(false);
    }
  }

  async function handleReportMessage() {
    if (!isParent || msgText.trim().length < 8) return;
    try {
      await apiFetch("/api/scam/report", {
        method: "POST",
        body: JSON.stringify({ text: msgText, cat: assessment?.category || "other" }),
      });
      setReportNotice(
        lang === "hi"
          ? "फोन नंबर और UPI ID छिपाकर रिपोर्ट दर्ज की गई।"
          : "Reported with phone numbers & UPI IDs masked."
      );
      await onRefresh();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Report failed.");
    }
  }

  async function handleChatSend(e: React.FormEvent) {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q) return;
    const nextHist = [...chatHistory, { role: "user", text: q }];
    setChatHistory(nextHist);
    setChatInput("");
    setChatBusy(true);
    try {
      const res = await apiFetch<{ text: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          history: chatHistory,
          message: q,
          signals: assessment?.signals || [],
          lang,
        }),
      });
      setChatHistory([...nextHist, { role: "assistant", text: res.text }]);
    } catch (err) {
      setChatHistory([
        ...nextHist,
        { role: "assistant", text: err instanceof Error ? err.message : "Unable to reach AI advisor right now." },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  async function analyzeQr(payloadOverride?: string) {
    const raw = (payloadOverride ?? qrPayload).trim();
    if (!raw) return;
    setQrError(null);
    setQrAiExplain(null);
    setQrAiError(null);
    setQrBusy(true);
    try {
      if (isParent) {
        const res = await apiFetch<{ report: QrReport }>("/api/qr/analyze", {
          method: "POST",
          body: JSON.stringify({ payload: raw, lang }),
        });
        setQrReport(res.report);
        await onRefresh();
      } else {
        setQrError(
          lang === "hi"
            ? "QR स्कैनिंग केवल माता-पिता खाते से चलती है; अभिभावक नीचे लॉग देख सकते हैं।"
            : "QR scanning & recording runs from the Parent account; linked guardian scan logs appear below."
        );
      }
    } catch (err) {
      setQrError(err instanceof Error ? err.message : "QR inspection failed.");
    } finally {
      setQrBusy(false);
    }
  }

  async function explainQrWithAi() {
    if (!qrReport) return;
    setQrAiError(null);
    setQrAiBusy(true);
    try {
      const res = await apiFetch<{ explanation: string; nextSteps: string[] }>("/api/ai/explain", {
        method: "POST",
        body: JSON.stringify({
          text: `QR format: ${qrReport.qrFormat}, Payee: ${qrReport.payeeName || "Unknown"}, UPI: ${qrReport.upiId || "N/A"}, Amount: ${qrReport.amount ?? "Open"}`,
          signals: qrReport.signals,
          findings: qrReport.signals,
          score: qrReport.suspicionAssessment?.score ?? qrReport.securityRiskScore,
          riskLevel: qrReport.suspicionAssessment?.riskLevel ?? qrReport.securityRiskLevel,
          verificationStatus: qrReport.suspicionAssessment?.verificationStatus,
          indicators: qrReport.suspicionAssessment?.indicators.map((i) => ({
            label: i.label,
            points: i.points,
            evidence: i.evidence,
            sourceName: i.sourceName,
            verified: i.verified,
          })),
          sourcesUnavailable: qrReport.suspicionAssessment?.sourcesUnavailable,
          sourceChecks: (qrReport.sourceChecks || []).map((s) => ({
            sourceName: s.sourceName,
            verificationStatus: s.verificationStatus,
            result: s.result,
            limitations: s.limitations,
          })),
          level: qrReport.securityRiskLevel,
          lang,
          contextType: "qr_code",
        }),
      });
      setQrAiExplain(res);
    } catch (err) {
      setQrAiError(err instanceof Error ? err.message : "AI explanation unavailable.");
    } finally {
      setQrAiBusy(false);
    }
  }

  async function handleQrImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrError(null);
    try {
      const decoded = await decodeQrFromImageFile(file);
      setQrPayload(decoded);
      await analyzeQr(decoded);
    } catch (err) {
      setQrError(err instanceof Error ? err.message : "Could not decode QR image.");
    }
  }

  const qrHistory = isParent ? state.qrScans || [] : state.linkedQrScans || [];

  const chipBtn =
    "px-2.5 py-1.5 rounded-md border border-[#D8CEBA] dark:border-[#243B64] bg-[#F3EDE0] dark:bg-[#132342] text-xs font-medium text-[#0B162C] dark:text-[#F5F0E4] hover:border-[#C8A45D] transition-colors cursor-pointer whitespace-nowrap shrink-0";
  const primaryBtn =
    "px-4 py-2 rounded-lg bg-[#0B162C] hover:bg-[#16325B] dark:bg-[#C8A45D] dark:hover:bg-[#D6B46E] text-[#FAF7F0] dark:text-[#070E1C] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0";
  const secondaryBtn =
    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#C8A45D]/70 dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#132342] text-xs font-semibold text-[#0B162C] dark:text-[#F5F0E4] hover:bg-[#F3EDE0] dark:hover:bg-[#1A2F56] transition-colors cursor-pointer whitespace-nowrap shrink-0";

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sectionReveal}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Left Column: Personal Cyber Safety Check + Screenshot OCR + AI Advisor */}
      <div className="lg:col-span-6 space-y-6">
        <div className="gp-card rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#16325B] dark:text-[#E0C27E]" />
              <h2 className="text-base font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                {lang === "hi"
                  ? "व्यक्तिगत साइबर सुरक्षा व संदेश जांच"
                  : "Personal Cyber Safety & Screenshot Check"}
              </h2>
            </div>
            {isParent && (
              <label className={secondaryBtn}>
                <Upload className="w-3.5 h-3.5 text-[#8A6021] dark:text-[#E0C27E]" />
                {lang === "hi" ? "स्क्रीनशॉट OCR" : "OCR Screenshot"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleScreenshotUpload} />
              </label>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLE_MESSAGES.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setMsgText(s.text);
                  setAssessment(evaluateMessageLocally(s.text));
                  setAiExplain(null);
                }}
                className={chipBtn}
              >
                {lang === "hi" ? s.labelHi : s.label}
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder={
              lang === "hi"
                ? "SMS, WhatsApp संदेश या कॉल विवरण यहां पेस्ट करें..."
                : "Paste SMS, WhatsApp text, or call transcript here..."
            }
            className="mt-3 w-full rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] p-3.5 text-sm text-[#0B162C] dark:text-[#F5F0E4] focus:outline-none focus:border-[#C8A45D]"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled={busyMsg} onClick={runMessageCheck} className={primaryBtn}>
              {busyMsg
                ? lang === "hi"
                  ? "जांच जारी है..."
                  : "Analyzing..."
                : lang === "hi"
                  ? "सुरक्षा जांचें"
                  : "Analyze Safety"}
            </button>
            {isParent && (
              <button type="button" onClick={handleReportMessage} className={secondaryBtn}>
                <Flag className="w-3.5 h-3.5 text-[#8A6021] dark:text-[#E0C27E]" />
                {lang === "hi" ? "मास्क्ड रिपोर्ट भेजें" : "Report Masked Excerpt"}
              </button>
            )}
          </div>

          {reportNotice && (
            <p className="mt-3 text-xs font-medium text-[#1B6B44] dark:text-[#4ADE80]">{reportNotice}</p>
          )}

          {assessment && (
            <div className="mt-5 pt-5 border-t border-[#E4DCCB] dark:border-[#1E3256] space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span
                  className={`font-semibold ${
                    assessment.level === "CRITICAL" || assessment.level === "HIGH"
                      ? "text-[#B42318] dark:text-[#F87171]"
                      : assessment.level === "MEDIUM"
                        ? "text-[#9A6213] dark:text-[#F0B45B]"
                        : "text-[#1B6B44] dark:text-[#4ADE80]"
                  }`}
                >
                  {assessment.level} {lang === "hi" ? "जोखिम" : "Risk"}
                </span>
                <span className="font-mono tabular-nums text-xs text-[#525E75] dark:text-[#9BAAC4]">
                  Score {assessment.score} / 100 · {assessment.category}
                </span>
              </div>

              <p className="text-sm text-[#435068] dark:text-[#C6D0E1]">
                {assessment.guidance}
              </p>

              {assessment.signals.length > 0 && (
                <ul className="space-y-1 text-xs text-[#525E75] dark:text-[#9BAAC4] list-disc pl-4">
                  {assessment.signals.map((sig) => (
                    <li key={sig}>{sig}</li>
                  ))}
                </ul>
              )}

              {aiExplain && (
                <div className="mt-3 p-4 rounded-lg bg-[#F3EDE0]/70 dark:bg-[#132342] border border-[#E4DCCB] dark:border-[#1E3256]">
                  <p className="text-xs font-semibold text-[#8A6021] dark:text-[#E0C27E]">
                    {lang === "hi" ? "AI सरल व्याख्या" : "AI Plain-Language Summary"}
                  </p>
                  <p className="mt-1 text-sm text-[#0B162C] dark:text-[#F5F0E4]">{aiExplain.explanation}</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#435068] dark:text-[#C6D0E1] list-disc pl-4">
                    {aiExplain.nextSteps.map((st, idx) => (
                      <li key={idx}>{st}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiError && (
                <p className="text-xs text-[#9A6213] dark:text-[#F0B45B]">
                  {lang === "hi" ? "AI नोट:" : "Gemini AI note:"} {aiError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Ask Guardian Safety Advisor */}
        <div className="gp-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-[#8A6021] dark:text-[#E0C27E]" />
            <h3 className="text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
              {lang === "hi" ? "सुरक्षा सलाहकार से पूछें" : "Ask Safety Advisor"}
            </h3>
          </div>
          {chatHistory.length > 0 && (
            <div className="mb-3 max-h-56 overflow-y-auto space-y-2.5 pr-1">
              {chatHistory.map((m, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-xs leading-relaxed border ${
                    m.role === "user"
                      ? "bg-[#F3EDE0] dark:bg-[#132342] border-[#E4DCCB] dark:border-[#1E3256] text-[#0B162C] dark:text-[#F5F0E4] ml-8"
                      : "bg-[#FAF7F0] dark:bg-[#091224] border-[#C8A45D]/50 text-[#0B162C] dark:text-[#F5F0E4] mr-8"
                  }`}
                >
                  <span className="font-semibold text-[#8A6021] dark:text-[#E0C27E] block mb-0.5">
                    {m.role === "user" ? (lang === "hi" ? "आप" : "You") : lang === "hi" ? "सुरक्षा सलाहकार" : "Safety Advisor"}
                  </span>
                  {m.text}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleChatSend} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                lang === "hi"
                  ? "पूछें जैसे 'क्या KYC के लिए ₹10 भेजना सुरक्षित है?'"
                  : "Ask e.g. 'Should I pay ₹10 to verify KYC?'"
              }
              className="flex-1 rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] px-3.5 py-2 text-sm text-[#0B162C] dark:text-[#F5F0E4] focus:outline-none focus:border-[#C8A45D]"
            />
            <button
              type="submit"
              disabled={chatBusy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B162C] hover:bg-[#16325B] dark:bg-[#C8A45D] dark:hover:bg-[#D6B46E] text-[#FAF7F0] dark:text-[#070E1C] text-sm font-semibold cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              {lang === "hi" ? "पूछें" : "Ask"}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: QR Intelligence Inspector */}
      <div className="lg:col-span-6 space-y-6">
        <div className="gp-card rounded-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <VisualAsset
                src="/src/assets/images/qr_protection_visual_1795331542062.jpg"
                alt={
                  lang === "hi"
                    ? "सुरक्षित QR कोड स्कैनिंग और UPI भुगतान सत्यापन दृश्य"
                    : "Secure UPI QR code inspection and payment verification visual"
                }
                lazy={false}
                className="hidden sm:block w-24 aspect-[4/3] shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#16325B] dark:text-[#E0C27E] shrink-0" />
                  <h2 className="text-base font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                    {lang === "hi" ? "QR इंटेलिजेंस इंस्पेक्टर" : "QR Intelligence Inspector"}
                  </h2>
                </div>
                <p className="mt-1.5 text-xs text-[#525E75] dark:text-[#9BAAC4] leading-relaxed">
                  {lang === "hi"
                    ? "लिंक खोले बिना या भुगतान शुरू किए बिना UPI, BharatQR और वेब QR डिकोड करता है।"
                    : "Decodes UPI, BharatQR, and web QR payloads without ever auto-opening links or triggering payments."}
                </p>
              </div>
            </div>
            {isParent && (
              <label className={secondaryBtn}>
                <Upload className="w-3.5 h-3.5 text-[#8A6021] dark:text-[#E0C27E]" />
                {lang === "hi" ? "QR छवि अपलोड करें" : "Upload QR Image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleQrImageUpload} />
              </label>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLE_QRS.map((q) => (
              <button key={q.label} type="button" onClick={() => setQrPayload(q.payload)} className={chipBtn}>
                {lang === "hi" ? q.labelHi : q.label}
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={qrPayload}
            onChange={(e) => setQrPayload(e.target.value)}
            placeholder="Paste decoded QR string (e.g. upi://pay?pa=...)"
            className="mt-3 w-full rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] p-3.5 text-xs font-mono text-[#0B162C] dark:text-[#F5F0E4] focus:outline-none focus:border-[#C8A45D]"
          />

          <div className="mt-3">
            <button type="button" disabled={qrBusy} onClick={() => analyzeQr()} className={primaryBtn}>
              {qrBusy
                ? lang === "hi"
                  ? "QR जांच जारी है..."
                  : "Inspecting QR..."
                : lang === "hi"
                  ? "QR पेलोड जांचें"
                  : "Inspect QR Payload"}
            </button>
          </div>

          {qrError && <p className="mt-3 text-xs text-[#B42318] dark:text-[#F87171]">{qrError}</p>}

          {qrReport && (
            <div className="mt-5 pt-5 border-t border-[#E4DCCB] dark:border-[#1E3256] space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#F3EDE0]/70 dark:bg-[#132342] p-3.5 rounded-lg border border-[#E4DCCB] dark:border-[#1E3256]">
                <div>
                  <span className="text-[#525E75] dark:text-[#9BAAC4] block">
                    {lang === "hi" ? "प्राप्तकर्ता" : "Payee"}
                  </span>
                  <span className="font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                    {qrReport.payeeName || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-[#525E75] dark:text-[#9BAAC4] block">
                    {lang === "hi" ? "राशि · लोड" : "Amount · Load"}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-[#0B162C] dark:text-[#E5CA8B]">
                    {qrReport.amount ? `₹${qrReport.amount.toLocaleString("en-IN")}` : "Open"} · {qrReport.paymentLoadCategory}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#525E75] dark:text-[#9BAAC4] block">
                    {lang === "hi" ? "UPI / गंतव्य" : "UPI / Destination"}
                  </span>
                  <span className="font-mono text-[#0B162C] dark:text-[#F5F0E4] break-all">
                    {qrReport.upiId || "N/A"}
                  </span>
                </div>
              </div>

              {qrReport.suspicionAssessment ? (
                <SuspicionScoreCard
                  assessment={qrReport.suspicionAssessment}
                  lang={lang}
                  onExplainAi={explainQrWithAi}
                  aiBusy={qrAiBusy}
                  aiExplain={qrAiExplain}
                  aiError={qrAiError}
                />
              ) : (
                <p className="text-sm text-[#435068] dark:text-[#C6D0E1]">{qrReport.guidance}</p>
              )}

              {qrReport.sourceChecks && <SourceTransparencyPanel sources={qrReport.sourceChecks} lang={lang} />}
            </div>
          )}
        </div>

        {/* Recent QR History */}
        <div className="gp-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4] mb-3">
            {lang === "hi" ? "हालिया QR जांच" : "Recent QR Inspections"}
          </h3>
          {qrHistory.length === 0 ? (
            <EmptyStateCard
              compact
              title={lang === "hi" ? "कोई QR जांच लॉग नहीं" : "No QR Scans Logged Yet"}
              description={
                lang === "hi"
                  ? "UPI या वेब QR पेलोड जांचने के बाद आपका सत्यापन इतिहास यहां सुरक्षित दिखेगा।"
                  : "Inspect a UPI or web QR image above to log verified payee and risk details here."
              }
            />
          ) : (
            <div className="divide-y divide-[#E4DCCB] dark:divide-[#1E3256]">
              {qrHistory.slice(0, 6).map((q) => (
                <div key={q.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-[#0B162C] dark:text-[#F5F0E4] truncate">
                      {q.payee_name || q.upi_id || q.qr_format}
                    </p>
                    <p className="text-[#525E75] dark:text-[#9BAAC4]">
                      {q.security_risk_level} · {q.qr_format} · Load {q.payment_load_category}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums font-medium text-[#8A6021] dark:text-[#E0C27E] shrink-0">
                    {q.amount ? `₹${Number(q.amount).toLocaleString("en-IN")}` : "Open"}
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
