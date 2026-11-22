import { useCallback, useEffect, useState } from "react";
import {
  Sun,
  Moon,
  LogOut,
  AlertOctagon,
  X,
  ExternalLink,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  PhoneCall,
  CheckSquare,
  Sparkles,
  Menu,
} from "lucide-react";
import { MotionConfig } from "motion/react";
import { apiFetch, setMemoryAuthToken } from "./lib/api";
import { AuthGate } from "./components/AuthGate";
import { OverviewTab } from "./components/OverviewTab";
import { ScamQrTab } from "./components/ScamQrTab";
import { CyberCheckTab } from "./components/CyberCheckTab";
import { CallLinkTab } from "./components/CallLinkTab";
import { ApprovalsPrivacyTab } from "./components/ApprovalsPrivacyTab";
import { ParentsAiTab } from "./components/ParentsAiTab";
import type { AppStatePayload, AuthUser, LangCode, TabKey, ThemeMode } from "./types/guardian";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [state, setState] = useState<AppStatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [lang, setLang] = useState<LangCode>("en");
  const [theme, setTheme] = useState<ThemeMode>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarLogoutConfirm, setSidebarLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const data = await apiFetch<AppStatePayload>("/api/state");
      setUser(data.user);
      setState(data);
    } catch {
      setUser(null);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    const handlePopState = () => {
      if (!user) {
        setState(null);
        setTab("overview");
        setEmergencyOpen(false);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [user]);

  function applyTheme(next: ThemeMode) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("guardian_theme", next);
    } catch {
      // ignore storage failure
    }
  }

  async function handleLogout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network failures and still clear client session
    }
    setMemoryAuthToken(null);
    setUser(null);
    setState(null);
    setTab("overview");
    setEmergencyOpen(false);
    setMobileNavOpen(false);
    setSidebarLogoutConfirm(false);
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      // ignore history errors
    }
  }

  async function revokeAllGuardiansEmergency() {
    await apiFetch("/api/links/revoke-all", { method: "POST" });
    await refreshState();
  }

  const navItems: { key: TabKey; label: string; Icon: typeof LayoutDashboard }[] = [
    { key: "overview", label: lang === "hi" ? "डैशबोर्ड अवलोकन" : "Overview", Icon: LayoutDashboard },
    { key: "scam_qr", label: lang === "hi" ? "QR व संदेश जांच" : "QR & Scam Check", Icon: QrCode },
    { key: "cyber_check", label: lang === "hi" ? "साइबर सुरक्षा जांच" : "Cyber Safety Check", Icon: ShieldCheck },
    { key: "calls_links", label: lang === "hi" ? "फोन धोखाधड़ी व लिंक" : "Phone Fraud & Links", Icon: PhoneCall },
    { key: "approvals", label: lang === "hi" ? "अनुमोदन व सेटिंग्स" : "Approvals & Settings", Icon: CheckSquare },
    { key: "parents_ai", label: lang === "hi" ? "पेरेंट्स AI" : "Parents AI", Icon: Sparkles },
  ];

  const activeNav = navItems.find((n) => n.key === tab) || navItems[0];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-[#0B162C] dark:bg-[#091224] text-[#FAF7F0] border-r border-[#1E3256]">
      <div>
        <div className="px-6 h-16 flex items-center justify-between border-b border-[#1E3256]">
          <button
            type="button"
            onClick={() => {
              setTab("overview");
              setMobileNavOpen(false);
            }}
            className="font-display text-base font-bold tracking-tight text-[#FAF7F0] hover:text-[#E5CA8B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Guardian for Parents
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
            className="lg:hidden text-[#A9B7CE] hover:text-[#FAF7F0] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-5 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.Icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#16325B] text-[#E5CA8B] border border-[#C8A45D]/50"
                    : "text-[#CBD5E7] hover:bg-[#132342] hover:text-[#FAF7F0] border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#C8A45D]" : "text-[#9BAAC4]"}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {user && (
        <div className="p-4 border-t border-[#1E3256] space-y-3">
          <div className="px-2">
            <p className="text-sm font-semibold text-[#FAF7F0] truncate">{user.name}</p>
            <p className="text-xs text-[#C8A45D]">
              @{user.username} ·{" "}
              {user.role === "parent"
                ? lang === "hi"
                  ? "माता-पिता"
                  : "Parent"
                : lang === "hi"
                  ? "अभिभावक"
                  : "Guardian"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarLogoutConfirm(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#243B64] bg-[#132342] hover:border-[#C8A45D] text-xs font-medium text-[#FAF7F0] transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 text-[#E5CA8B]" />
            {lang === "hi" ? "लॉग आउट" : "Log Out"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex bg-[#FAF7F0] dark:bg-[#070E1C] text-[#0B162C] dark:text-[#F5F0E4] transition-colors duration-200 overflow-x-hidden">
        {/* Desktop Midnight Navy Sidebar */}
        {user && state && (
          <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
            {sidebarContent}
          </aside>
        )}

        {/* Mobile Drawer Sidebar */}
        {user && state && mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="w-72 max-w-[85vw] h-full">{sidebarContent}</div>
            <div
              className="flex-1 bg-[#070E1C]/60"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* 3-Zone Top Bar Contract */}
          <header className="border-b border-[#16325B]/20 dark:border-[#1E3256] bg-[#0B162C] dark:bg-[#091224] text-[#FAF7F0]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
              <div className="flex items-center gap-3 min-w-0">
                {user && (
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="Open navigation menu"
                    className="lg:hidden p-1.5 rounded-md border border-[#243B64] text-[#E5CA8B] cursor-pointer"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTab("overview")}
                  className={`font-display text-base sm:text-lg font-bold tracking-tight text-[#FAF7F0] hover:text-[#E5CA8B] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    user ? "lg:hidden" : ""
                  }`}
                >
                  Guardian for Parents
                </button>
                {user && (
                  <span className="hidden lg:inline-block text-sm font-semibold text-[#E5CA8B] whitespace-nowrap shrink-0">
                    {activeNav.label}
                  </span>
                )}
              </div>

              {!user ? (
                <span className="hidden md:inline-block text-xs text-[#CBD5E7] whitespace-nowrap shrink-0">
                  {lang === "hi"
                    ? "परिवार डिजिटल सुरक्षा व पेरेंट्स AI मंच"
                    : "Family Digital Safety & Parents AI Platform"}
                </span>
              ) : (
                <div className="hidden md:flex items-center gap-6 text-xs text-[#CBD5E7]">
                  <button
                    type="button"
                    onClick={() => setTab("scam_qr")}
                    className="hover:text-[#E5CA8B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lang === "hi" ? "QR जांच" : "QR Check"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("cyber_check")}
                    className="hover:text-[#E5CA8B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lang === "hi" ? "साइबर जांच" : "Cyber Check"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("calls_links")}
                    className="hover:text-[#E5CA8B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lang === "hi" ? "कॉल जांच" : "Call Watch"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("parents_ai")}
                    className="hover:text-[#E5CA8B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lang === "hi" ? "पेरेंट्स AI" : "Parents AI"}
                  </button>
                </div>
              )}

              <div className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setEmergencyOpen(true)}
                  className="px-3.5 sm:px-4 py-2 rounded-lg bg-[#B42318] hover:bg-[#911B12] border border-[#F0B45B]/30 text-[#FAF7F0] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {lang === "hi" ? "आपातकालीन मदद" : "Emergency Help"}
                </button>
              </div>
            </div>
          </header>

          {/* Workspace Toolbar (Language, Theme, Quick Account Status) */}
          <div className="border-b border-[#E4DCCB] dark:border-[#1E3256] bg-[#F3EDE0]/80 dark:bg-[#0D1930]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-[#525E75] dark:text-[#9BAAC4]">
                {user ? (
                  <span>
                    {lang === "hi" ? "सक्रिय खाता:" : "Signed in as"}{" "}
                    <strong className="text-[#0B162C] dark:text-[#F5F0E4] font-semibold">{user.name}</strong> ·{" "}
                    <span className="text-[#8A6021] dark:text-[#E0C27E] font-medium">
                      {user.role === "parent"
                        ? lang === "hi"
                          ? "माता-पिता"
                          : "Parent"
                        : lang === "hi"
                          ? "अभिभावक"
                          : "Guardian"}
                    </span>
                  </span>
                ) : (
                  <span>
                    {lang === "hi"
                      ? "विश्वास और सुरक्षा · परिवार साइबर सुरक्षा मंच"
                      : "Trust & Protection · Family Cybersecurity Platform"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLang(lang === "en" ? "hi" : "en")}
                  className="px-3 py-1.5 rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FFFDF9] dark:bg-[#0B162C] hover:border-[#C8A45D] text-[#0B162C] dark:text-[#F5F0E4] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {lang === "en" ? "English / हिंदी" : "हिंदी / English"}
                </button>

                <button
                  type="button"
                  onClick={() => applyTheme(theme === "light" ? "dark" : "light")}
                  aria-label="Toggle color theme"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FFFDF9] dark:bg-[#0B162C] hover:border-[#C8A45D] text-[#0B162C] dark:text-[#F5F0E4] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {theme === "light" ? (
                    <Moon className="w-3.5 h-3.5 text-[#8A6021]" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-[#E0C27E]" />
                  )}
                  {theme === "light" ? (lang === "hi" ? "डार्क" : "Dark") : lang === "hi" ? "लाइट" : "Light"}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {loading ? (
              <div className="py-16 text-center text-sm text-[#525E75] dark:text-[#9BAAC4]">
                {lang === "hi" ? "गार्जियन कार्यक्षेत्र लोड हो रहा है..." : "Loading Guardian workspace..."}
              </div>
            ) : !user || !state ? (
              <AuthGate
                lang={lang}
                onAuthenticated={async (u) => {
                  setUser(u);
                  await refreshState();
                }}
              />
            ) : tab === "overview" ? (
              <OverviewTab state={state} lang={lang} onNavigate={setTab} onRefresh={refreshState} />
            ) : tab === "scam_qr" ? (
              <ScamQrTab state={state} lang={lang} onRefresh={refreshState} />
            ) : tab === "cyber_check" ? (
              <CyberCheckTab lang={lang} isAuthenticated={true} onRefresh={refreshState} />
            ) : tab === "calls_links" ? (
              <CallLinkTab state={state} lang={lang} onRefresh={refreshState} />
            ) : tab === "approvals" ? (
              <ApprovalsPrivacyTab
                state={state}
                lang={lang}
                onRefresh={refreshState}
                onLogout={handleLogout}
                onSignedOut={() => {
                  setMemoryAuthToken(null);
                  setUser(null);
                  setState(null);
                  setTab("overview");
                  try {
                    window.history.replaceState(null, "", window.location.pathname);
                  } catch {
                    // ignore
                  }
                }}
              />
            ) : (
              <ParentsAiTab state={state} lang={lang} />
            )}
          </main>

          {/* Quiet Footer */}
          <footer className="border-t border-[#E4DCCB] dark:border-[#1E3256] bg-[#FFFDF9] dark:bg-[#091224] py-5 px-6 text-xs text-[#525E75] dark:text-[#9BAAC4]">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
              <span>
                {lang === "hi"
                  ? "Guardian for Parents · पारदर्शी सुरक्षा नियम, शून्य कॉल-ऑडियो रिकॉर्डिंग, सहमति-प्रथम देखरेख।"
                  : "Guardian for Parents · Transparent verification status, zero call-audio recording, consent-first oversight."}
              </span>
              <span className="font-mono tabular-nums text-[#8A6021] dark:text-[#E0C27E] font-medium">
                {lang === "hi" ? "राष्ट्रीय साइबर अपराध हेल्पलाइन (भारत): 1930" : "National Cyber Crime Helpline (India): 1930"}
              </span>
            </div>
          </footer>
        </div>

        {/* Emergency Help Modal */}
        {emergencyOpen && (
          <div className="fixed inset-0 z-50 bg-[#070E1C]/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="gp-card rounded-xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-[#B42318] dark:text-[#F87171]">
                  <AlertOctagon className="w-5 h-5" />
                  <h2 className="text-base font-bold">
                    {lang === "hi" ? "आपातकालीन स्कैम व धोखाधड़ी सहायता" : "Emergency Scam & Fraud Help"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEmergencyOpen(false)}
                  aria-label="Close emergency dialog"
                  className="text-[#525E75] hover:text-[#0B162C] dark:text-[#9BAAC4] dark:hover:text-[#F5F0E4] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ol className="space-y-2 text-sm text-[#435068] dark:text-[#C6D0E1] list-decimal pl-5 leading-relaxed">
                <li>
                  {lang === "hi"
                    ? "यदि कोई OTP, UPI PIN, स्क्रीन शेयरिंग मांगे या डिजिटल अरेस्ट की धमकी दे, तो तुरंत कॉल काट दें।"
                    : "Hang up immediately if anyone asks for OTP, UPI PIN, screen sharing, or threatens digital arrest."}
                </li>
                <li>
                  {lang === "hi" ? (
                    <>
                      संदिग्ध लेनदेन रोकने के लिए तुरंत भारत की राष्ट्रीय साइबर अपराध हेल्पलाइन{" "}
                      <strong className="font-mono tabular-nums text-[#0B162C] dark:text-[#E5CA8B]">1930</strong> पर कॉल करें।
                    </>
                  ) : (
                    <>
                      Call India&apos;s National Cyber Crime Helpline on{" "}
                      <strong className="font-mono tabular-nums text-[#0B162C] dark:text-[#E5CA8B]">1930</strong> immediately to freeze fraudulent transfers.
                    </>
                  )}
                </li>
                <li>
                  {lang === "hi"
                    ? "अपने बैंक कार्ड के पीछे छपे आधिकारिक टोल-फ्री नंबर पर सीधे संपर्क करें।"
                    : "Contact your bank directly using the official toll-free number printed on your bank card."}
                </li>
              </ol>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="https://cybercrime.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#B42318] hover:bg-[#911B12] text-[#FAF7F0] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  {lang === "hi" ? "आधिकारिक साइबरक्राइम पोर्टल खोलें" : "Open Official Cybercrime Portal"}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {user?.role === "parent" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await revokeAllGuardiansEmergency();
                      setEmergencyOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-[#D8CEBA] dark:border-[#243B64] hover:border-[#C8A45D] text-xs font-medium text-[#0B162C] dark:text-[#F5F0E4] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {lang === "hi" ? "सभी लिंक अभिभावक हटाएं" : "Revoke All Linked Guardians"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Logout Confirmation Dialog */}
        {sidebarLogoutConfirm && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sidebar-logout-title"
            className="fixed inset-0 z-50 bg-[#070E1C]/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="gp-card rounded-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5 text-[#0B162C] dark:text-[#F5F0E4]">
                  <div className="w-9 h-9 rounded-lg bg-[#0B162C] dark:bg-[#16325B] border border-[#C8A45D]/50 flex items-center justify-center shrink-0">
                    <LogOut className="w-4 h-4 text-[#E5CA8B]" />
                  </div>
                  <h2 id="sidebar-logout-title" className="text-base font-bold">
                    {lang === "hi" ? "क्या आप वाकई लॉग आउट करना चाहते हैं?" : "Are you sure you want to log out?"}
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() => setSidebarLogoutConfirm(false)}
                  aria-label="Close logout dialog"
                  className="text-[#525E75] hover:text-[#0B162C] dark:text-[#9BAAC4] dark:hover:text-[#F5F0E4] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[#435068] dark:text-[#C6D0E1] leading-relaxed">
                {lang === "hi"
                  ? "यह केवल आपका सक्रिय सत्र समाप्त करेगा। आपका खाता और सहेजे गए सुरक्षा लॉग सुरक्षित रहेंगे।"
                  : "This will terminate your active session and return you to the sign-in screen. Your account and saved safety reports remain preserved."}
              </p>
              <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() => setSidebarLogoutConfirm(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#C8A45D]/70 dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#132342] text-xs font-medium text-[#0B162C] dark:text-[#F5F0E4] hover:bg-[#F3EDE0] dark:hover:bg-[#1A2F56] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {lang === "hi" ? "रद्द करें" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true);
                    try {
                      await handleLogout();
                    } finally {
                      setLoggingOut(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B162C] hover:bg-[#16325B] dark:bg-[#C8A45D] dark:hover:bg-[#D6B46E] text-[#FAF7F0] dark:text-[#070E1C] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {loggingOut
                    ? lang === "hi"
                      ? "लॉग आउट हो रहा है..."
                      : "Logging out..."
                    : lang === "hi"
                      ? "लॉग आउट"
                      : "Log Out"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
