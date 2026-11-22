import React, { useEffect, useState } from "react";
import { Sparkles, Landmark, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../lib/api";
import { sectionReveal } from "../lib/motionSystem";
import type { AppStatePayload, LangCode } from "../types/guardian";

interface ParentsAiTabProps {
  state: AppStatePayload;
  lang: LangCode;
}

interface ParentsAiState {
  ownerId: string;
  items: { id: string; tool_key: string; title: string; category: string; status: string }[];
  aaConnections: { id: string; institution_name: string; aa_handle: string; status: string; scopes: string[] }[];
  budgets: {
    id: string;
    category: string;
    monthly_limit: number;
    savings_goal_name: string | null;
    savings_target: number;
    savings_current: number;
  }[];
  accessControl: { childFinancialAccess: boolean; guardianFinancialAccess: boolean; requireGuardianAuth: boolean };
  sampleSpendSummary: { category: string; spent: number; trend: string }[];
}

export const ParentsAiTab: React.FC<ParentsAiTabProps> = ({ state, lang }) => {
  const isParent = state.user.role === "parent";
  const [pai, setPai] = useState<ParentsAiState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [toolKey, setToolKey] = useState("budgeting");
  const [prompt, setPrompt] = useState("Help us organize monthly medicine and grocery bills simply.");
  const [answer, setAnswer] = useState<string | null>(null);
  const [askBusy, setAskBusy] = useState(false);

  const [budCategory, setBudCategory] = useState("Healthcare & Medicines");
  const [budLimit, setBudLimit] = useState("8000");

  const [itemTitle, setItemTitle] = useState("");

  async function loadState() {
    try {
      const data = await apiFetch<ParentsAiState>("/api/parents-ai/state");
      setPai(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Parents AI state.");
    }
  }

  useEffect(() => {
    loadState();
  }, [state.user.id]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAskBusy(true);
    try {
      const res = await apiFetch<{ answer: string }>("/api/parents-ai/tools/ask", {
        method: "POST",
        body: JSON.stringify({ toolKey, prompt, lang }),
      });
      setAnswer(res.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parents AI assistant failed.");
    } finally {
      setAskBusy(false);
    }
  }

  async function connectDemoAa() {
    setError(null);
    try {
      await apiFetch("/api/parents-ai/bank/connect-demo", {
        method: "POST",
        body: JSON.stringify({
          institutionName: "Demo RBI Account Aggregator (Read-Only)",
          aaHandle: "kulkarni.family@anumati.demo",
        }),
      });
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    }
  }

  async function revokeAa(id: string) {
    await apiFetch(`/api/parents-ai/bank/revoke/${id}`, { method: "POST" });
    await loadState();
  }

  async function addBudget(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/parents-ai/budgets", {
        method: "POST",
        body: JSON.stringify({ category: budCategory, monthlyLimit: Number(budLimit) }),
      });
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save budget.");
    }
  }

  async function removeBudget(id: string) {
    await apiFetch(`/api/parents-ai/budgets/${id}`, { method: "DELETE" });
    await loadState();
  }

  async function addRoutineItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemTitle.trim()) return;
    await apiFetch("/api/parents-ai/tools/items", {
      method: "POST",
      body: JSON.stringify({ toolKey: "routine", title: itemTitle.trim(), category: "family" }),
    });
    setItemTitle("");
    await loadState();
  }

  async function toggleItemDone(id: string, currentStatus: string) {
    await apiFetch(`/api/parents-ai/tools/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: currentStatus === "completed" ? "active" : "completed" }),
    });
    await loadState();
  }

  async function toggleFinancialAccess(key: "guardianFinancialAccess" | "childFinancialAccess", val: boolean) {
    await apiFetch("/api/parents-ai/bank/access-control", {
      method: "PUT",
      body: JSON.stringify({ [key]: val }),
    });
    await loadState();
  }

  const maxSpend = Math.max(1, ...(pai?.sampleSpendSummary || []).map((r) => r.spent));
  const barColors = [
    "bg-[#0B162C] dark:bg-[#C8A45D]",
    "bg-[#16325B] dark:bg-[#3B62A8]",
    "bg-[#C8A45D] dark:bg-[#E0C27E]",
    "bg-[#946B2D] dark:bg-[#B48441]",
  ];

  const primaryBtn =
    "px-4 py-2 rounded-lg bg-[#0B162C] hover:bg-[#16325B] dark:bg-[#C8A45D] dark:hover:bg-[#D6B46E] text-[#FAF7F0] dark:text-[#070E1C] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0";

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sectionReveal}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Left: Parents AI Advisor & Family Routine Items */}
      <div className="lg:col-span-6 space-y-6">
        <div className="gp-card rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8A6021] dark:text-[#E0C27E]" />
            <h2 className="text-base font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
              {lang === "hi" ? "पेरेंट्स AI परिवार सहायक" : "Parents AI Family Assistant"}
            </h2>
          </div>
          <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
            {lang === "hi"
              ? "घरेलू बजट, दवा/दैनिक सूची या स्कैम-सुरक्षित परिवार मार्गदर्शन पूछें। कभी बैंक पासवर्ड, PIN या OTP न लिखें।"
              : "Ask for household budgeting tips, medication/routine checklists, or scam-aware family guidance. Never enter bank passwords, PINs, or OTPs."}
          </p>

          <form onSubmit={handleAsk} className="space-y-3">
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <select
                value={toolKey}
                onChange={(e) => setToolKey(e.target.value)}
                className="rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] px-3 py-2 text-xs text-[#0B162C] dark:text-[#F5F0E4]"
              >
                <option value="budgeting">{lang === "hi" ? "घरेलू बजट" : "Household Budgeting"}</option>
                <option value="caregiving">{lang === "hi" ? "वरिष्ठ देखभाल" : "Senior Care & Routines"}</option>
                <option value="parenting">{lang === "hi" ? "परिवार समन्वय" : "Family Coordination"}</option>
              </select>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] px-3.5 py-2 text-sm text-[#0B162C] dark:text-[#F5F0E4] focus:outline-none focus:border-[#C8A45D]"
              />
            </div>
            <button type="submit" disabled={askBusy} className={`${primaryBtn} text-sm`}>
              {askBusy
                ? lang === "hi"
                  ? "विचार जारी है..."
                  : "Thinking..."
                : lang === "hi"
                  ? "पेरेंट्स AI से पूछें"
                  : "Ask Parents AI"}
            </button>
          </form>

          {error && <p className="text-xs text-[#9A6213] dark:text-[#F0B45B]">{error}</p>}

          {answer && (
            <div className="p-4 rounded-lg bg-[#F3EDE0]/70 dark:bg-[#132342] border border-[#C8A45D]/50 text-sm text-[#0B162C] dark:text-[#F5F0E4] whitespace-pre-line">
              {answer}
            </div>
          )}
        </div>

        {/* Family Checklist */}
        <div className="gp-card rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
            {lang === "hi" ? "साझा परिवार देखभाल व बिल सूची" : "Shared Family Care & Bills Checklist"}
          </h3>
          <form onSubmit={addRoutineItem} className="flex gap-2">
            <input
              type="text"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder={
                lang === "hi"
                  ? "जैसे: मासिक दवाइयां या पेंशन जांच"
                  : "e.g. Monthly pharmacy refill or pension check"
              }
              className="flex-1 rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] px-3 py-2 text-sm text-[#0B162C] dark:text-[#F5F0E4] focus:outline-none focus:border-[#C8A45D]"
            />
            <button type="submit" className={primaryBtn}>
              <span className="inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                {lang === "hi" ? "जोड़ें" : "Add"}
              </span>
            </button>
          </form>

          {!pai || pai.items.length === 0 ? (
            <p className="text-xs text-[#525E75] dark:text-[#9BAAC4] py-2">
              {lang === "hi" ? "अभी कोई साझा कार्य नहीं जोड़ा गया है।" : "No shared items added yet."}
            </p>
          ) : (
            <div className="divide-y divide-[#E4DCCB] dark:divide-[#1E3256]">
              {pai.items.map((it) => (
                <div key={it.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => toggleItemDone(it.id, it.status)}
                    className="inline-flex items-center gap-2 text-left cursor-pointer"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        it.status === "completed"
                          ? "text-[#8A6021] dark:text-[#E0C27E]"
                          : "text-[#C8BCA5] dark:text-[#334B78]"
                      }`}
                    />
                    <span
                      className={
                        it.status === "completed"
                          ? "line-through text-[#7A869B]"
                          : "text-[#0B162C] dark:text-[#F5F0E4]"
                      }
                    >
                      {it.title}
                    </span>
                  </button>
                  <span className="text-xs text-[#8A6021] dark:text-[#E0C27E]">{it.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Consent-First RBI Account Aggregator Insights & Budgets */}
      <div className="lg:col-span-6 space-y-6">
        <div className="gp-card rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#16325B] dark:text-[#E0C27E]" />
                <h2 className="text-base font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
                  {lang === "hi"
                    ? "सहमति-प्रथम RBI AA वित्तीय अंतर्दृष्टि"
                    : "Consent-First RBI AA Financial Insights"}
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4]">
                {lang === "hi"
                  ? "केवल-पढ़ने योग्य नमूना Account Aggregator प्रोफ़ाइल। बैंकिंग पासवर्ड या OTP कभी नहीं मांगे जाते।"
                  : "Read-only sample Account Aggregator profile. Zero banking credentials or OTPs are ever requested or stored."}
              </p>
            </div>
            <button type="button" onClick={connectDemoAa} className={primaryBtn}>
              {lang === "hi" ? "डेमो AA जोड़ें" : "Connect Demo AA"}
            </button>
          </div>

          {pai && pai.aaConnections.filter((c) => c.status === "active").length > 0 && (
            <div className="space-y-4 pt-2 border-t border-[#E4DCCB] dark:border-[#1E3256]">
              {pai.aaConnections
                .filter((c) => c.status === "active")
                .map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between text-xs bg-[#F3EDE0]/70 dark:bg-[#132342] p-3 rounded-lg border border-[#E4DCCB] dark:border-[#1E3256]"
                  >
                    <div>
                      <p className="font-semibold text-[#0B162C] dark:text-[#F5F0E4]">{c.institution_name}</p>
                      <p className="text-[#525E75] dark:text-[#9BAAC4] font-mono">{c.aa_handle} · Read-only</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => revokeAa(c.id)}
                      className="text-[#B42318] dark:text-[#F87171] hover:underline font-medium cursor-pointer"
                    >
                      {lang === "hi" ? "हटाएं" : "Revoke"}
                    </button>
                  </div>
                ))}

              {pai.sampleSpendSummary.length > 0 && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-[#435068] dark:text-[#C6D0E1]">
                    {lang === "hi" ? "मासिक व्यय सारांश" : "Monthly Spend Breakdown"}
                  </p>
                  {pai.sampleSpendSummary.map((row, idx) => (
                    <div key={row.category} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#0B162C] dark:text-[#F5F0E4] font-medium">{row.category}</span>
                        <span className="font-mono tabular-nums font-semibold text-[#8A6021] dark:text-[#E0C27E]">
                          ₹{row.spent.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F3EDE0] dark:bg-[#132342] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColors[idx % barColors.length]} transition-all duration-200`}
                          style={{ width: `${Math.max(8, Math.round((row.spent / maxSpend) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isParent && pai && (
            <div className="pt-3 border-t border-[#E4DCCB] dark:border-[#1E3256] space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[#435068] dark:text-[#C6D0E1]">
                  {lang === "hi"
                    ? "जुड़े अभिभावक को बजट सारांश देखने की अनुमति दें"
                    : "Allow linked guardian to view budget summaries"}
                </span>
                <input
                  type="checkbox"
                  checked={pai.accessControl.guardianFinancialAccess}
                  onChange={(e) => toggleFinancialAccess("guardianFinancialAccess", e.target.checked)}
                  className="accent-[#0B162C] dark:accent-[#C8A45D]"
                />
              </label>
            </div>
          )}
        </div>

        {/* Household Budgets */}
        <div className="gp-card rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">
            {lang === "hi" ? "मासिक घरेलू बजट" : "Monthly Household Budgets"}
          </h3>
          <form onSubmit={addBudget} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={budCategory}
              onChange={(e) => setBudCategory(e.target.value)}
              placeholder={lang === "hi" ? "श्रेणी" : "Category"}
              className="flex-1 min-w-[140px] rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] px-3 py-2 text-xs text-[#0B162C] dark:text-[#F5F0E4]"
            />
            <input
              type="number"
              min={100}
              value={budLimit}
              onChange={(e) => setBudLimit(e.target.value)}
              placeholder="Limit ₹"
              className="w-28 rounded-lg border border-[#D8CEBA] dark:border-[#243B64] bg-[#FAF7F0] dark:bg-[#070E1C] px-3 py-2 text-xs font-mono tabular-nums text-[#0B162C] dark:text-[#F5F0E4]"
            />
            <button type="submit" className={primaryBtn}>
              {lang === "hi" ? "सहेजें" : "Save"}
            </button>
          </form>

          {!pai || pai.budgets.length === 0 ? (
            <p className="text-xs text-[#525E75] dark:text-[#9BAAC4]">
              {lang === "hi" ? "अभी कोई मासिक बजट सेट नहीं किया गया है।" : "No monthly budgets configured yet."}
            </p>
          ) : (
            <div className="divide-y divide-[#E4DCCB] dark:divide-[#1E3256]">
              {pai.budgets.map((b) => (
                <div key={b.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-[#0B162C] dark:text-[#F5F0E4]">{b.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums font-semibold text-[#8A6021] dark:text-[#E0C27E]">
                      ₹{b.monthly_limit.toLocaleString("en-IN")} / mo
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBudget(b.id)}
                      aria-label={`Remove ${b.category}`}
                      className="text-[#7A869B] hover:text-[#B42318] dark:hover:text-[#F87171] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
