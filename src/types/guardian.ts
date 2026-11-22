export type UserRole = "parent" | "guardian";
export type TabKey = "overview" | "scam_qr" | "cyber_check" | "calls_links" | "approvals" | "parents_ai";
export type LangCode = "en" | "hi";
export type ThemeMode = "light" | "dark";
export type TransparencyStatus =
  | "HIGH RISK"
  | "CAUTION"
  | "NO KNOWN THREAT DETECTED"
  | "MANUAL VERIFICATION REQUIRED"
  | "SOURCE UNAVAILABLE";

export interface SourceCheckEntry {
  sourceName: string;
  sourceNameHi: string;
  informationChecked: string;
  verificationStatus: TransparencyStatus;
  result: string;
  resultHi: string;
  lastCheckedAt: number;
  limitations: string;
  limitationsHi: string;
}

export type UnifiedRiskLevel = "LOW" | "MODERATE" | "HIGH";
export type UnifiedRiskLabel = "LOW RISK" | "MODERATE RISK" | "HIGH RISK";
export type SuspicionCategory =
  | "QR Intelligence"
  | "Phone Fraud Detection"
  | "Personal Cyber Safety Check"
  | "Website and URL Analysis";

export interface SuspicionIndicatorItem {
  code: string;
  label: string;
  labelHi: string;
  points: number;
  evidence: string[];
  evidenceHi: string[];
  sourceName: string;
  verified: boolean;
}

export interface SuspicionAssessment {
  score: number;
  riskLevel: UnifiedRiskLevel;
  riskLabel: UnifiedRiskLabel;
  formattedScore: string;
  category: SuspicionCategory;
  maskedIdentifier: string;
  verificationStatus: TransparencyStatus;
  indicators: SuspicionIndicatorItem[];
  deduplicatedCount: number;
  sourcesChecked: SourceCheckEntry[];
  sourcesUnavailable: string[];
  conflictingSources: boolean;
  conflictNote?: string;
  conflictNoteHi?: string;
  mainReason: string;
  mainReasonHi: string;
  recommendedActions: string[];
  recommendedActionsHi: string[];
  disclaimer: string;
  disclaimerHi: string;
  evaluatedAt: number;
}

export interface RiskHistoryRecord {
  id: string;
  userId: string;
  parentName?: string;
  category: SuspicionCategory;
  identifierType: string;
  maskedIdentifier: string;
  score: number;
  riskLevel: UnifiedRiskLevel;
  verificationStatus: string;
  mainReason: string;
  createdAt: number;
  assessment?: SuspicionAssessment;
}

export type CyberIdentifierType = "mobile" | "email" | "upi" | "bank_account" | "url";

export interface CyberSafetyCheckResult {
  identifierType: CyberIdentifierType;
  maskedValue: string;
  overallStatus: TransparencyStatus;
  riskScore: number;
  verifiedMatch: boolean;
  findings: string[];
  findingsHi: string[];
  recommendations: string[];
  recommendationsHi: string[];
  disclaimer: string;
  disclaimerHi: string;
  checkedAt: number;
  sourceChecks: SourceCheckEntry[];
  suspicionAssessment: SuspicionAssessment;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface ConsentSettings {
  text: boolean;
  galerts: boolean;
  gapprove: boolean;
  calls: boolean;
  paused: boolean;
  limit: number;
  medThreshold: number;
  highThreshold: number;
  retentionDays: number;
  loadModerateMax: number;
  loadHighMax: number;
  loadVeryHighMin: number;
  redAlertCooldownSec: number;
}

export interface ApprovalRequestItem {
  id: string;
  parentId: string;
  parentName?: string;
  amt: number;
  ben: string;
  level: string;
  sig: string[];
  exp: number;
  st: string;
  used: boolean;
  decidedBy: string | null;
  decidedAt: number | null;
  verifiedCallback: boolean;
  verificationNote: string | null;
  escalatedToSecondary: boolean;
}

export interface GuardianLinkItem {
  id: string;
  invite_code: string;
  status: "pending" | "active" | "revoked";
  is_secondary: number;
  guardian_name?: string | null;
  guardian_username?: string | null;
}

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  delivery_status: string;
  read_at: number | null;
  created_at: number;
}

export interface QrScanRecord {
  id: string;
  parent_id?: string;
  parent_name?: string;
  qr_format: string;
  qr_classification: string;
  upi_id: string | null;
  payee_name: string | null;
  amount: number | null;
  amount_state: string;
  security_risk_level: string;
  payment_load_category: string;
  payment_load_risk_level: string;
  created_at: number;
}

export type CallRiskClassification =
  | "HIGH RISK"
  | "CAUTION"
  | "NO KNOWN THREAT DETECTED"
  | "UNKNOWN NUMBER";

export interface CallPrivacyGuarantees {
  microphoneActivated: boolean;
  audioRecorded: boolean;
  audioTranscribed: boolean;
  metadataOnly: boolean;
}

export interface FlaggedCallSummary {
  id: string;
  caller_masked: string;
  caller_classification: string;
  screening_verdict: string;
  risk_classification: CallRiskClassification;
  call_status: string;
  incoming_at: number;
  source: string;
}

export interface CallProtectionSummary {
  autoDetectionEnabled: boolean;
  callsScreened: number;
  suspiciousIdentified: number;
  highRiskCount: number;
  recentlyFlagged: FlaggedCallSummary[];
  lastScreeningAt: number | null;
  privacyGuarantees: CallPrivacyGuarantees;
  androidArchitecture: {
    runtimeMode: string;
    requiredRole: string;
    minimumAndroidApi: string;
    microphonePermissionRequested: boolean;
    supportsCallAudioCapture: boolean;
    limitationNotice: string;
    limitationNoticeHi: string;
  };
}

export interface GuardianCallProtectionSummary {
  parentId: string;
  parentName: string;
  autoDetectionEnabled: boolean;
  callsScreened: number;
  suspiciousIdentified: number;
  lastScreeningAt: number | null;
  recentlyFlagged: FlaggedCallSummary[];
}

export interface CallWatcherDashboard {
  settings: {
    consent_status: string;
    notify_unknown_calls: number;
    permission_call_state: string;
    battery_restricted: number;
    autoDetectionEnabled?: boolean;
    protectionStatus: string;
  };
  summary?: CallProtectionSummary;
  calls: {
    id: string;
    caller_masked: string;
    caller_classification: string;
    call_status: string;
    call_lifecycle_phase: string;
    incoming_at: number;
    ended_at: number | null;
    duration_ms: number | null;
    screening_verdict: string;
    screening_latency_ms?: number | null;
    source?: string;
  }[];
  paymentMessages: {
    id: string;
    sender_label: string;
    amount: number | null;
    redacted_summary: string;
    risk_level: string;
    message_ts: number;
  }[];
  correlations: {
    id: string;
    time_diff_ms: number;
    during_call: number;
    combined_risk_score: number;
    status: string;
    summary: string;
    guidance: string;
    created_at: number;
  }[];
}

export interface GsiIncident {
  incident_id: string;
  parent_name?: string;
  incident_category: string;
  risk_score: number;
  severity: string;
  alert_level: string;
  reasoning_summary: string;
  recommended_action: string;
  acknowledgement_status: string;
  resolution_status: string;
  workflow_status: string;
  created_at: number;
}

export interface AppStatePayload {
  user: AuthUser;
  consent?: ConsentSettings;
  hasSafeWord?: boolean;
  reqs: ApprovalRequestItem[];
  audit: { t: string; ev: string; h: string }[];
  links?: GuardianLinkItem[];
  linkedParents?: {
    id: string;
    name: string;
    username: string;
    guardian_approve: number;
    guardian_alerts: number;
    is_secondary: number;
  }[];
  notifications: NotificationItem[];
  qrScans?: QrScanRecord[];
  linkedQrScans?: QrScanRecord[];
  callWatcher?: CallWatcherDashboard;
  linkedCallWatcherEvents?: {
    id: string;
    parentName: string;
    summary: string;
    combined_risk_score: number;
    status: string;
    created_at: number;
  }[];
  linkedCallProtectionSummary?: GuardianCallProtectionSummary[];
  gsi?: {
    incidents: GsiIncident[];
    activeRedAlerts: GsiIncident[];
  };
  linkedGsiOverview?: {
    incidents: GsiIncident[];
    activeRedAlerts: GsiIncident[];
  };
  riskHistory?: RiskHistoryRecord[];
  linkedRiskHistory?: RiskHistoryRecord[];
  reports?: { id: string; masked_excerpt: string; cat: string; status: string; created_at: number }[];
}
