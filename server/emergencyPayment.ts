import crypto from "node:crypto";
import { db } from "./db.ts";
import { generateId, getActiveLinkedParentIds, type AuthUser } from "./security.ts";

const DEFAULT_BANKS = [
  {
    bankName: "State Bank of India (SBI)",
    shortCode: "SBI",
    supportPhone: "1800-1234",
    upiBlockUrl: "https://www.onlinesbi.sbi/",
    debitBlockUrl: "https://www.onlinesbi.sbi/",
    creditBlockUrl: "https://www.sbicard.com/",
    netbankingUrl: "https://retail.onlinesbi.sbi/",
    fraudReportUrl: "https://cybercrime.gov.in/",
    notes: "Official SBI helpline 1800-1234 / 1800-2100. Block cards or UPI immediately via YONO/OnlineSBI.",
  },
  {
    bankName: "HDFC Bank",
    shortCode: "HDFC",
    supportPhone: "1800-1600",
    upiBlockUrl: "https://www.hdfcbank.com/",
    debitBlockUrl: "https://netbanking.hdfcbank.com/",
    creditBlockUrl: "https://netbanking.hdfcbank.com/",
    netbankingUrl: "https://netbanking.hdfcbank.com/",
    fraudReportUrl: "https://cybercrime.gov.in/",
    notes: "Official HDFC toll-free 1800-1600 / 1800-2600. Use NetBanking Card Hotlisting.",
  },
  {
    bankName: "ICICI Bank",
    shortCode: "ICICI",
    supportPhone: "1800-1080",
    upiBlockUrl: "https://www.icicibank.com/",
    debitBlockUrl: "https://www.icicibank.com/",
    creditBlockUrl: "https://www.icicibank.com/",
    netbankingUrl: "https://infinity.icicibank.com/",
    fraudReportUrl: "https://cybercrime.gov.in/",
    notes: "Official ICICI customer care 1800-1080. Report unauthorized UPI/card activity immediately.",
  },
  {
    bankName: "Axis Bank",
    shortCode: "AXIS",
    supportPhone: "1800-419-5959",
    upiBlockUrl: "https://www.axisbank.com/",
    debitBlockUrl: "https://www.axisbank.com/",
    creditBlockUrl: "https://www.axisbank.com/",
    netbankingUrl: "https://omni.axisbank.co.in/",
    fraudReportUrl: "https://cybercrime.gov.in/",
    notes: "Official Axis Bank card blocking helpline 1800-419-5959.",
  },
];

async function resolveOwnerId(actor: AuthUser, requestedOwnerId?: string): Promise<string> {
  if (actor.role === "parent") return actor.id;
  const linked = await getActiveLinkedParentIds(actor.id);
  if (requestedOwnerId) {
    if (!linked.includes(requestedOwnerId)) throw new Error("Unauthorized: not linked to this family member.");
    return requestedOwnerId;
  }
  if (!linked.length) throw new Error("No linked parent account found.");
  return linked[0];
}

async function writeEppAudit(familyOwnerId: string, actorId: string, action: string, details: string) {
  const now = Date.now();
  const hash = crypto
    .createHash("sha256")
    .update(`${familyOwnerId}|${actorId}|${action}|${now}`)
    .digest("hex")
    .slice(0, 16);
  await db
    .prepare(
      "INSERT INTO epp_audit_trail (id, family_owner_id, actor_id, action, details, hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(generateId("eppa"), familyOwnerId, actorId, action, details.slice(0, 200), hash, now);
}

export async function seedDefaultBankDirectoryIfEmpty(): Promise<void> {
  const row = (await db.prepare("SELECT COUNT(*) as cnt FROM epp_bank_directory").get()) as { cnt: number };
  if (Number(row.cnt) > 0) return;
  const now = Date.now();
  for (const b of DEFAULT_BANKS) {
    await db
      .prepare(
        `INSERT INTO epp_bank_directory (id, bank_name, short_code, support_phone, upi_block_url, debit_block_url, credit_block_url, netbanking_url, fraud_report_url, verification_status, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)`
      )
      .run(
        generateId("bnk"),
        b.bankName,
        b.shortCode,
        b.supportPhone,
        b.upiBlockUrl,
        b.debitBlockUrl,
        b.creditBlockUrl,
        b.netbankingUrl,
        b.fraudReportUrl,
        b.notes,
        now
      );
  }
}

export async function listBankDirectory() {
  return db.prepare("SELECT * FROM epp_bank_directory ORDER BY bank_name ASC").all();
}

export async function upsertAndVerifyBankEntry(params: {
  actor: AuthUser;
  id?: string;
  bankName: string;
  shortCode: string;
  supportPhone: string;
  upiBlockUrl?: string | null;
  debitBlockUrl?: string | null;
  creditBlockUrl?: string | null;
  netbankingUrl?: string | null;
  fraudReportUrl?: string | null;
  verificationStatus?: string;
  notes?: string;
}) {
  const bankName = params.bankName.trim();
  const shortCode = params.shortCode.trim().toUpperCase().slice(0, 16);
  const supportPhone = params.supportPhone.trim().slice(0, 32);
  if (!bankName || !shortCode || !supportPhone) {
    throw new Error("Bank name, short code, and official support phone are required.");
  }
  const now = Date.now();
  if (params.id) {
    await db
      .prepare(
        `UPDATE epp_bank_directory SET bank_name = ?, short_code = ?, support_phone = ?, upi_block_url = ?, debit_block_url = ?, credit_block_url = ?, netbanking_url = ?, fraud_report_url = ?, verification_status = ?, notes = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        bankName,
        shortCode,
        supportPhone,
        params.upiBlockUrl || null,
        params.debitBlockUrl || null,
        params.creditBlockUrl || null,
        params.netbankingUrl || null,
        params.fraudReportUrl || null,
        params.verificationStatus || "verified",
        params.notes || null,
        now,
        params.id
      );
    return db.prepare("SELECT * FROM epp_bank_directory WHERE id = ?").get(params.id);
  }

  const id = generateId("bnk");
  await db
    .prepare(
      `INSERT INTO epp_bank_directory (id, bank_name, short_code, support_phone, upi_block_url, debit_block_url, credit_block_url, netbanking_url, fraud_report_url, verification_status, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      bankName,
      shortCode,
      supportPhone,
      params.upiBlockUrl || null,
      params.debitBlockUrl || null,
      params.creditBlockUrl || null,
      params.netbankingUrl || null,
      params.fraudReportUrl || null,
      params.verificationStatus || "verified",
      params.notes || null,
      now
    );
  return db.prepare("SELECT * FROM epp_bank_directory WHERE id = ?").get(id);
}

export async function getEmergencyPaymentDashboard(actor: AuthUser, requestedOwnerId?: string) {
  const ownerId = await resolveOwnerId(actor, requestedOwnerId);
  const now = Date.now();
  await db
    .prepare("UPDATE epp_lock_sessions SET status = 'expired' WHERE family_owner_id = ? AND status = 'active' AND expires_at < ?")
    .run(ownerId, now);

  const [activeLock, sessions, banks, bankActions, auditTrail] = await Promise.all([
    db
      .prepare("SELECT * FROM epp_lock_sessions WHERE family_owner_id = ? AND status = 'active' ORDER BY activated_at DESC LIMIT 1")
      .get(ownerId),
    db
      .prepare("SELECT * FROM epp_lock_sessions WHERE family_owner_id = ? ORDER BY activated_at DESC LIMIT 10")
      .all(ownerId),
    listBankDirectory(),
    db
      .prepare("SELECT * FROM epp_bank_action_logs WHERE family_owner_id = ? ORDER BY created_at DESC LIMIT 15")
      .all(ownerId),
    db
      .prepare("SELECT * FROM epp_audit_trail WHERE family_owner_id = ? ORDER BY created_at DESC LIMIT 20")
      .all(ownerId),
  ]);

  return {
    ownerId,
    activeLock: activeLock || null,
    sessions,
    banks,
    bankActions,
    auditTrail,
  };
}

export async function activateEmergencyPaymentLock(params: {
  actor: AuthUser;
  requestedOwnerId?: string;
  selectedPackages: string[];
  durationOption: string;
  explicitConsent: boolean;
  osEnforcementMode?: string;
  devicePlatform?: string;
  deviceCapabilityNote?: string;
}) {
  if (!params.explicitConsent) {
    throw new Error("Explicit user confirmation is required before activating Emergency Payment Lock.");
  }
  const ownerId = await resolveOwnerId(params.actor, params.requestedOwnerId);
  const now = Date.now();
  const durMsMap: Record<string, number> = {
    "30m": 30 * 60_000,
    "1h": 60 * 60_000,
    "6h": 6 * 60 * 60_000,
    "24h": 24 * 60 * 60_000,
  };
  const durMs = durMsMap[params.durationOption] || 60 * 60_000;
  const id = generateId("epl");

  await db
    .prepare("UPDATE epp_lock_sessions SET status = 'superseded' WHERE family_owner_id = ? AND status = 'active'")
    .run(ownerId);

  await db
    .prepare(
      `INSERT INTO epp_lock_sessions (id, family_owner_id, activated_by, status, duration_option, selected_packages_json, os_enforcement_mode, device_platform, device_capability_note, activated_at, expires_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      ownerId,
      params.actor.id,
      params.durationOption,
      JSON.stringify(params.selectedPackages.slice(0, 12)),
      params.osEnforcementMode || "advisory_web_guard",
      params.devicePlatform || "web",
      params.deviceCapabilityNote || "Browser mode records lock state and displays high-priority stop guidance.",
      now,
      now + durMs
    );

  await writeEppAudit(ownerId, params.actor.id, "Activated Emergency Payment Lock", `Duration: ${params.durationOption}`);
  return { session: await db.prepare("SELECT * FROM epp_lock_sessions WHERE id = ?").get(id) };
}

export async function unlockEmergencyPaymentLock(params: { actor: AuthUser; requestedOwnerId?: string }) {
  const ownerId = await resolveOwnerId(params.actor, params.requestedOwnerId);
  const now = Date.now();
  await db
    .prepare("UPDATE epp_lock_sessions SET status = 'unlocked', unlocked_at = ?, unlocked_by = ? WHERE family_owner_id = ? AND status = 'active'")
    .run(now, params.actor.id, ownerId);
  await writeEppAudit(ownerId, params.actor.id, "Unlocked Emergency Payment Lock", "Manual family unlock");
  return { ok: true };
}

export async function recordBankBlockingAction(params: {
  actor: AuthUser;
  requestedOwnerId?: string;
  bankId: string;
  serviceType: string;
  launchType?: string;
}) {
  const ownerId = await resolveOwnerId(params.actor, params.requestedOwnerId);
  const bank = (await db.prepare("SELECT * FROM epp_bank_directory WHERE id = ?").get(params.bankId)) as
    | { id: string; bank_name: string }
    | undefined;
  if (!bank) throw new Error("Bank directory entry not found.");
  const id = generateId("eba");
  await db
    .prepare(
      `INSERT INTO epp_bank_action_logs (id, family_owner_id, actor_id, bank_id, bank_name, service_type, launch_type, bank_confirmed_by_user, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      id,
      ownerId,
      params.actor.id,
      bank.id,
      bank.bank_name,
      params.serviceType.slice(0, 40),
      (params.launchType || "official_helpline_or_portal").slice(0, 40),
      Date.now()
    );
  await writeEppAudit(ownerId, params.actor.id, "Initiated bank blocking action", `${bank.bank_name} (${params.serviceType})`);
  return { log: await db.prepare("SELECT * FROM epp_bank_action_logs WHERE id = ?").get(id) };
}

export async function markBankServiceUserConfirmed(params: { actor: AuthUser; logId: string; confirmed: boolean }) {
  const row = (await db.prepare("SELECT * FROM epp_bank_action_logs WHERE id = ?").get(params.logId)) as
    | { id: string; family_owner_id: string; bank_name: string }
    | undefined;
  if (!row) throw new Error("Bank action log not found.");
  await db
    .prepare("UPDATE epp_bank_action_logs SET bank_confirmed_by_user = ? WHERE id = ?")
    .run(params.confirmed ? 1 : 0, row.id);
  await writeEppAudit(row.family_owner_id, params.actor.id, "Confirmed bank service contact", row.bank_name);
  return { ok: true };
}

export async function deleteEppDataForOwner(ownerId: string): Promise<void> {
  await db.prepare("DELETE FROM epp_audit_trail WHERE family_owner_id = ?").run(ownerId);
  await db.prepare("DELETE FROM epp_bank_action_logs WHERE family_owner_id = ?").run(ownerId);
  await db.prepare("DELETE FROM epp_lock_sessions WHERE family_owner_id = ?").run(ownerId);
}
