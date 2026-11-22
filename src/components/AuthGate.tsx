import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  QrCode,
  PhoneCall,
  Lock,
  UserPlus,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch, setMemoryAuthToken } from "../lib/api";
import { sectionReveal } from "../lib/motionSystem";
import { evaluateMessageLocally, type LocalScamAssessment } from "../lib/scamClient";
import { VisualAsset } from "./VisualAsset";
import type { AuthUser, UserRole } from "../types/guardian";

interface AuthGateProps {
  onAuthenticated: (user: AuthUser) => void;
  lang: "en" | "hi";
}

const REMEMBER_STORAGE_KEY = "guardian_remembered_user";

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated, lang }) => {
  const [mode, setMode] = useState<"signin" | "register" | "recover">("signin");
  const [role, setRole] = useState<UserRole>("parent");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [createdRecovery, setCreatedRecovery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState(
    "URGENT: Your bank KYC will be suspended in 30 minutes. Install AnyDesk or click http://sbi-kyc-update.xyz to verify OTP."
  );
  const [quickResult, setQuickResult] = useState<LocalScamAssessment | null>(() =>
    evaluateMessageLocally(
      "URGENT: Your bank KYC will be suspended in 30 minutes. Install AnyDesk or click http://sbi-kyc-update.xyz to verify OTP."
    )
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { username?: string; role?: UserRole };
        if (parsed.username) {
          setUsername(parsed.username);
          setRememberMe(true);
        }
        if (parsed.role === "parent" || parsed.role === "guardian") {
          setRole(parsed.role);
        }
      }
    } catch {
      // ignore storage failure
    }
  }, []);

  async function handlePreviewLaunch(targetRole: UserRole) {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ user: AuthUser; sessionToken: string }>("/api/auth/preview-family", {
        method: "POST",
        body: JSON.stringify({ role: targetRole }),
      });
      setMemoryAuthToken(res.sessionToken);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch preview family.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedRecovery(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const res = await apiFetch<{ user: AuthUser; sessionToken: string }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password, role }),
        });
        try {
          if (rememberMe) {
            localStorage.setItem(
              REMEMBER_STORAGE_KEY,
              JSON.stringify({ username: username.trim().toLowerCase(), role })
            );
          } else {
            localStorage.removeItem(REMEMBER_STORAGE_KEY);
          }
        } catch {
          // ignore storage failure
        }
        setMemoryAuthToken(res.sessionToken);
        onAuthenticated(res.user);
      } else if (mode === "register") {
        const res = await apiFetch<{ ok: boolean; recoveryCode: string; message: string }>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ username, name, password, role }),
        });
        setCreatedRecovery(res.recoveryCode);
        setPassword("");
        setMode("signin");
      } else {
        const res = await apiFetch<{ ok: boolean; recoveryCode: string }>("/api/auth/recover", {
          method: "POST",
          body: JSON.stringify({ username, recoveryCode, newPassword }),
        });
        setCreatedRecovery(res.recoveryCode);
        setRecoveryCode("");
        setNewPassword("");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: "signin" | "register" | "recover") {
    setMode(nextMode);
    setError(null);
    setShowPassword(false);
    setShowNewPassword(false);
  }

  const inputCls =
    "w-full rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] px-3.5 py-2.5 text-sm text-[#0B162C] dark:text-[#F5F0E4] placeholder:text-[#7A869B] focus:outline-none focus:border-[#C8A45D] transition-colors";

  const features = [
    {
      Icon: QrCode,
      title: lang === "hi" ? "QR धोखाधड़ी पहचान" : "QR Fraud Detection",
      desc:
        lang === "hi"
          ? "भुगतान से पहले संदिग्ध UPI हैंडल, पूर्व-भरी राशि और छिपे लिंक की जांच करें।"
          : "Inspect UPI payment QRs for risky handles, preset amounts, and hidden links before paying.",
    },
    {
      Icon: PhoneCall,
      title: lang === "hi" ? "फ़ोन धोखाधड़ी पहचान" : "Phone Fraud Detection",
      desc:
        lang === "hi"
          ? "बिना कॉल ऑडियो रिकॉर्ड किए अज्ञात कॉलर और कॉल-भुगतान समय जोखिम पहचानें।"
          : "Screen unknown callers and call-payment timing overlaps without recording call audio.",
    },
    {
      Icon: ShieldCheck,
      title: lang === "hi" ? "व्यक्तिगत साइबर सुरक्षा जांच" : "Personal Cyber Safety Check",
      desc:
        lang === "hi"
          ? "पारदर्शी स्रोत विवरण के साथ मोबाइल नंबर, ईमेल, UPI ID, बैंक खाते और URL जांचें।"
          : "Verify mobile numbers, emails, UPI IDs, bank accounts, and URLs with transparent sources.",
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sectionReveal}
      className="w-full max-w-6xl mx-auto py-2 sm:py-4"
    >
      <div className="rounded-2xl overflow-hidden border border-[#E4DCCB] dark:border-[#1E3256] bg-[#FFFDF9] dark:bg-[#0D1930] shadow-sm flex flex-col md:flex-row items-stretch">
        {/* Left Branding Panel (~42–44% on desktop, ~39% on tablet, stacked on mobile) */}
        <section
          aria-label={lang === "hi" ? "ब्रांड परिचय और मुख्य सुरक्षा सुविधाएं" : "Guardian for Parents Overview"}
          className="relative md:w-[39%] lg:w-[43%] shrink-0 bg-gradient-to-br from-[#0B162C] via-[#102244] to-[#16325B] text-[#FAF7F0] p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden"
        >
          {/* Subtle decorative security-themed SVG shield rings */}
          <svg
            aria-hidden="true"
            viewBox="0 0 360 360"
            className="pointer-events-none absolute -right-16 -bottom-16 w-72 h-72 text-[#C8A45D] opacity-[0.09]"
            fill="none"
          >
            <circle cx="180" cy="180" r="158" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 6" />
            <circle cx="180" cy="180" r="118" stroke="currentColor" strokeWidth="1" />
            <path
              d="M180 68L254 98V166C254 218 222 262 180 282C138 262 106 218 106 166V98L180 68Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>

          <div className="relative z-10 space-y-7">
            {/* Brand Logo + Application Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#16325B] border border-[#C8A45D]/55 flex items-center justify-center shadow-xs shrink-0">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-[#E5CA8B]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l7 3v5c0 4.8-3 8.9-7 10.5C8 19.9 5 15.8 5 11V6l7-3z" />
                  <path d="M9.5 12.2l1.8 1.8 3.5-3.8" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-display text-base font-bold tracking-tight text-[#FAF7F0] truncate">
                  Guardian for Parents
                </p>
                <p className="text-xs text-[#C8A45D]">
                  {lang === "hi" ? "विश्वास और सुरक्षा मंच" : "Trust & Protection Platform"}
                </p>
              </div>
            </div>

            {/* Welcoming Headline + Short Description */}
            <div className="space-y-3">
              <h1 className="font-display text-2xl sm:text-[28px] lg:text-[32px] font-bold tracking-tight leading-snug text-[#FAF7F0] [text-wrap:balance]">
                {lang === "hi"
                  ? "आपके परिवार की डिजिटल सुरक्षा यहीं से शुरू होती है।"
                  : "Your Family's Digital Safety Starts Here."}
              </h1>
              <p className="text-sm text-[#CBD5E7] leading-relaxed max-w-md">
                {lang === "hi"
                  ? "Guardian for Parents परिवारों को संदिग्ध कॉल, नकली QR कोड, फ़िशिंग लिंक और ऑनलाइन ठगी से शांत व पारदर्शी सुरक्षा देता है।"
                  : "Guardian for Parents helps families identify suspicious callers, fraudulent UPI QR codes, phishing links, and online scams with calm, consent-first protection."}
              </p>
            </div>

            {/* Brand-Matched Cybersecurity Shield Visual */}
            <VisualAsset
              src="/src/assets/images/login_shield_hero_1795331541592.jpg"
              alt={
                lang === "hi"
                  ? "परिवार डिजिटल सुरक्षा कवच और नेटवर्क सुरक्षा दृश्य"
                  : "Guardian for Parents family digital protection shield illustration"
              }
              lazy={false}
              className="aspect-[4/3] max-h-44 sm:max-h-48 w-full border-[#C8A45D]/40"
            />

            {/* Three Feature Highlights */}
            <div className="space-y-4 pt-2 border-t border-[#C8A45D]/20">
              {features.map((feat) => {
                const Icon = feat.Icon;
                return (
                  <div key={feat.title} className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-[#091224]/70 border border-[#C8A45D]/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#E5CA8B]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[#FAF7F0] leading-snug">{feat.title}</h2>
                      <p className="mt-0.5 text-xs text-[#B6C3DA] leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left Panel Quiet Footer */}
          <div className="relative z-10 mt-8 pt-4 border-t border-[#C8A45D]/20 flex flex-wrap items-center justify-between gap-2 text-xs text-[#CBD5E7]">
            <span>
              {lang === "hi"
                ? "सहमति-प्रथम देखरेख · शून्य कॉल-ऑडियो रिकॉर्डिंग"
                : "Consent-first family oversight · Zero call-audio recording"}
            </span>
          </div>
        </section>

        {/* Right Login / Register / Recover Panel */}
        <section
          aria-label={lang === "hi" ? "साइन इन व खाता प्रबंधन" : "Account Sign In"}
          className="flex-1 min-w-0 bg-[#FFFDF9] dark:bg-[#0D1930] p-6 sm:p-8 lg:p-10 flex flex-col justify-between"
        >
          <div>
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-[#F3EDE0] dark:bg-[#132342] border border-[#E4DCCB] dark:border-[#1E3256] rounded-lg mb-6">
              {(["signin", "register", "recover"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === m
                      ? "bg-[#0B162C] dark:bg-[#C8A45D] text-[#FAF7F0] dark:text-[#070E1C] shadow-xs"
                      : "text-[#525E75] dark:text-[#9BAAC4] hover:text-[#0B162C] dark:hover:text-[#F5F0E4]"
                  }`}
                >
                  {m === "signin"
                    ? lang === "hi"
                      ? "साइन इन"
                      : "Sign In"
                    : m === "register"
                      ? lang === "hi"
                        ? "नया खाता"
                        : "Create Account"
                      : lang === "hi"
                        ? "रिकवरी"
                        : "Recover"}
                </button>
              ))}
            </div>

            {/* Form Title */}
            <div className="mb-5">
              <h2 className="font-display text-xl font-bold text-[#0B162C] dark:text-[#F5F0E4]">
                {mode === "signin"
                  ? lang === "hi"
                    ? "अपने परिवार सुरक्षा खाते में साइन इन करें"
                    : "Sign in to your family workspace"
                  : mode === "register"
                    ? lang === "hi"
                      ? "नया माता-पिता या अभिभावक खाता बनाएं"
                      : "Create your family safety account"
                    : lang === "hi"
                      ? "रिकवरी कोड से पासवर्ड रीसेट करें"
                      : "Reset password with recovery code"}
              </h2>
              <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4]">
                {mode === "signin"
                  ? lang === "hi"
                    ? "अपना यूज़रनेम, भूमिका और पासवर्ड दर्ज करें।"
                    : "Enter your username, account role, and password to continue."
                  : mode === "register"
                    ? lang === "hi"
                      ? "खाता बनने पर आपको एक वन-टाइम रिकवरी कोड मिलेगा।"
                      : "You will receive a one-time recovery code after signing up."
                    : lang === "hi"
                      ? "नया पासवर्ड सेट करने के लिए अपना यूज़रनेम और सहेजा गया रिकवरी कोड दर्ज करें।"
                      : "Enter your username and saved one-time recovery code."}
              </p>
            </div>

            {createdRecovery && (
              <div className="mb-4 p-3.5 rounded-lg border border-[#C8A45D]/70 bg-[#FAF7F0] dark:bg-[#132342] text-xs text-[#0B162C] dark:text-[#F5F0E4]">
                <p className="font-semibold text-[#8A6021] dark:text-[#E0C27E]">
                  {lang === "hi" ? "अपना वन-टाइम रिकवरी कोड सुरक्षित रखें:" : "Save your one-time recovery code:"}
                </p>
                <p className="mt-1 font-mono text-sm select-all">{createdRecovery}</p>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg border border-[#B42318]/35 bg-[#FEF3F2] dark:bg-[#3A1416] text-xs text-[#B42318] dark:text-[#FCA5A5] flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode !== "recover" && (
                <div>
                  <label className="block text-xs font-semibold text-[#435068] dark:text-[#C6D0E1] mb-1.5">
                    {lang === "hi" ? "खाता भूमिका" : "Account Role"}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole("parent")}
                      className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        role === "parent"
                          ? "border-[#C8A45D] bg-[#0B162C] dark:bg-[#16325B] text-[#E5CA8B]"
                          : "border-[#D8CEBA] dark:border-[#243B64] text-[#435068] dark:text-[#C6D0E1] hover:border-[#C8A45D]/60"
                      }`}
                    >
                      {lang === "hi" ? "माता-पिता" : "Parent"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("guardian")}
                      className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        role === "guardian"
                          ? "border-[#C8A45D] bg-[#0B162C] dark:bg-[#16325B] text-[#E5CA8B]"
                          : "border-[#D8CEBA] dark:border-[#243B64] text-[#435068] dark:text-[#C6D0E1] hover:border-[#C8A45D]/60"
                      }`}
                    >
                      {lang === "hi" ? "अभिभावक" : "Guardian"}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-username"
                  className="block text-xs font-semibold text-[#435068] dark:text-[#C6D0E1] mb-1.5"
                >
                  {lang === "hi" ? "यूज़रनेम" : "Username"}
                </label>
                <input
                  id="auth-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ramesh_parent"
                  className={inputCls}
                />
              </div>

              {mode === "register" && (
                <div>
                  <label
                    htmlFor="auth-fullname"
                    className="block text-xs font-semibold text-[#435068] dark:text-[#C6D0E1] mb-1.5"
                  >
                    {lang === "hi" ? "पूरा नाम" : "Full Name"}
                  </label>
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kulkarni"
                    className={inputCls}
                  />
                </div>
              )}

              {mode !== "recover" ? (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-semibold text-[#435068] dark:text-[#C6D0E1]"
                    >
                      {lang === "hi" ? "पासवर्ड (8+ अक्षर)" : "Password (8+ characters)"}
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => switchMode("recover")}
                        className="text-xs font-medium text-[#8A6021] dark:text-[#E0C27E] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {lang === "hi" ? "पासवर्ड भूल गए?" : "Forgot password?"}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={lang === "hi" ? "पासवर्ड दर्ज करें" : "Enter password"}
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword
                          ? lang === "hi"
                            ? "पासवर्ड छिपाएं"
                            : "Hide password"
                          : lang === "hi"
                            ? "पासवर्ड दिखाएं"
                            : "Show password"
                      }
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-[#525E75] dark:text-[#9BAAC4] hover:text-[#0B162C] dark:hover:text-[#F5F0E4] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="auth-recovery-code"
                      className="block text-xs font-semibold text-[#435068] dark:text-[#C6D0E1] mb-1.5"
                    >
                      {lang === "hi" ? "रिकवरी कोड" : "Recovery Code"}
                    </label>
                    <input
                      id="auth-recovery-code"
                      type="text"
                      required
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="GRD-XXXXXX-XXXX"
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-new-password"
                      className="block text-xs font-semibold text-[#435068] dark:text-[#C6D0E1] mb-1.5"
                    >
                      {lang === "hi" ? "नया पासवर्ड (8+ अक्षर)" : "New Password (8+ characters)"}
                    </label>
                    <div className="relative">
                      <input
                        id="auth-new-password"
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={lang === "hi" ? "नया पासवर्ड चुनें" : "Choose a new password"}
                        className={`${inputCls} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={
                          showNewPassword
                            ? lang === "hi"
                              ? "नया पासवर्ड छिपाएं"
                              : "Hide new password"
                            : lang === "hi"
                              ? "नया पासवर्ड दिखाएं"
                              : "Show new password"
                        }
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-[#525E75] dark:text-[#9BAAC4] hover:text-[#0B162C] dark:hover:text-[#F5F0E4] cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mode === "signin" && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <label className="inline-flex items-center gap-2 text-xs text-[#435068] dark:text-[#C6D0E1] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#D8CEBA] dark:border-[#243B64] accent-[#0B162C] dark:accent-[#C8A45D] cursor-pointer"
                    />
                    <span>{lang === "hi" ? "इस डिवाइस पर यूज़रनेम याद रखें" : "Remember username on this device"}</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#0B162C] hover:bg-[#16325B] dark:bg-[#C8A45D] dark:hover:bg-[#D6B46E] text-[#FAF7F0] dark:text-[#070E1C] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {mode === "signin" ? (
                  <>
                    <Lock className="w-4 h-4" />
                    {busy
                      ? lang === "hi"
                        ? "साइन इन हो रहा है..."
                        : "Signing In..."
                      : lang === "hi"
                        ? "साइन इन करें"
                        : "Sign In"}
                  </>
                ) : mode === "register" ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {busy
                      ? lang === "hi"
                        ? "खाता बन रहा है..."
                        : "Creating Account..."
                      : lang === "hi"
                        ? "खाता बनाएं"
                        : "Create Account"}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {busy
                      ? lang === "hi"
                        ? "रीसेट हो रहा है..."
                        : "Resetting..."
                      : lang === "hi"
                        ? "पासवर्ड रीसेट करें"
                        : "Reset Password"}
                  </>
                )}
              </button>
            </form>

            {/* Sign Up / Back to Sign In inline prompt */}
            <div className="mt-4 text-center text-xs text-[#525E75] dark:text-[#9BAAC4]">
              {mode === "signin" ? (
                <>
                  {lang === "hi" ? "Guardian for Parents पर नए हैं?" : "New to Guardian for Parents?"}{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="font-semibold text-[#16325B] dark:text-[#E5CA8B] hover:underline cursor-pointer"
                  >
                    {lang === "hi" ? "नया खाता बनाएं" : "Create Account"}
                  </button>
                </>
              ) : (
                <>
                  {lang === "hi" ? "पहले से खाता है?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-semibold text-[#16325B] dark:text-[#E5CA8B] hover:underline cursor-pointer"
                  >
                    {lang === "hi" ? "साइन इन पर लौटें" : "Back to Sign In"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bottom Preserved Sample Family Preview + Optional Quick Local Check */}
          <div className="mt-7 pt-5 border-t border-[#E4DCCB] dark:border-[#1E3256] space-y-4">
            <div>
              <p className="text-xs font-medium text-[#525E75] dark:text-[#9BAAC4] mb-2.5">
                {lang === "hi"
                  ? "तुरंत कार्यक्षेत्र पूर्वावलोकन · जुड़ा हुआ नमूना परिवार"
                  : "Instant Workspace Preview · Linked Sample Family"}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handlePreviewLaunch("parent")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16325B] hover:bg-[#0B162C] dark:bg-[#132342] dark:hover:bg-[#1A2F56] text-[#FAF7F0] border border-[#C8A45D]/40 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E5CA8B]" />
                  {lang === "hi" ? "माता-पिता कार्यक्षेत्र" : "Open Parent Workspace"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handlePreviewLaunch("guardian")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8A45D]/60 dark:border-[#C8A45D]/45 bg-[#FAF7F0] dark:bg-[#091224] hover:bg-[#F3EDE0] dark:hover:bg-[#132342] text-[#0B162C] dark:text-[#F5F0E4] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {lang === "hi" ? "अभिभावक कंसोल" : "Open Guardian Console"}
                </button>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setQuickOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8A6021] dark:text-[#E0C27E] hover:underline cursor-pointer"
              >
                {lang === "hi" ? "लॉगिन के बिना तुरंत संदेश जांचें" : "Quick local message check (no sign-in needed)"}
                {quickOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {quickOpen && (
                <div className="mt-3 p-3.5 rounded-lg border border-[#E4DCCB] dark:border-[#1E3256] bg-[#FAF7F0] dark:bg-[#091224] space-y-2.5">
                  <textarea
                    rows={2}
                    value={quickText}
                    onChange={(e) => {
                      setQuickText(e.target.value);
                      setQuickResult(evaluateMessageLocally(e.target.value));
                    }}
                    placeholder={
                      lang === "hi"
                        ? "संदिग्ध SMS या WhatsApp संदेश यहां पेस्ट करें..."
                        : "Paste a suspicious SMS or WhatsApp message..."
                    }
                    className="w-full rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FFFDF9] dark:bg-[#070E1C] px-3 py-2 text-xs text-[#0B162C] dark:text-[#F5F0E4] focus:outline-none focus:border-[#C8A45D]"
                  />
                  {quickResult && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#435068] dark:text-[#C6D0E1]">
                      <span
                        className={`font-semibold ${
                          quickResult.level === "CRITICAL" || quickResult.level === "HIGH"
                            ? "text-[#B42318] dark:text-[#F87171]"
                            : quickResult.level === "MEDIUM"
                              ? "text-[#9A6213] dark:text-[#F0B45B]"
                              : "text-[#1B6B44] dark:text-[#4ADE80]"
                        }`}
                      >
                        {quickResult.level} {lang === "hi" ? "जोखिम" : "Risk"}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-[#525E75] dark:text-[#9BAAC4]">
                        {quickResult.score} / 100
                      </span>
                      {quickResult.signals.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#525E75] dark:text-[#9BAAC4]">
                            {quickResult.signals.slice(0, 2).join(" / ")}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#525E75] dark:text-[#9BAAC4] leading-relaxed">
              {lang === "hi"
                ? "पासवर्ड और परिवार सेफ़ वर्ड सर्वर पर सुरक्षित हैश के रूप में संग्रहीत होते हैं। सत्र टोकन केवल मेमोरी में रहते हैं।"
                : "Passwords and family safe words are salted and scrypt-hashed on the server. Session tokens stay in memory only."}
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
};
