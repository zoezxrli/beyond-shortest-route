export type ContributorType = "reciclador" | "organization" | "volunteer";

export type ReportCategory =
  | "eca"
  | "blocked"
  | "contamination"
  | "schedule"
  | "illegal_dumping";

export type AiDraft = {
  tags: Array<{ label: string; confidence: number; source: "vision" | "nlp" | "worker" }>;
  summary: string;
  confidence: number;
  urgent: boolean;
};

export type ReportRecord = {
  id: string;
  createdAt: string;
  contributorType: ContributorType;
  category: ReportCategory;
  description: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  urgency: "routine" | "urgent";
  photoKey: string | null;
  aiTags: string;
  aiSummary: string;
  aiConfidence: number;
  status: "queued" | "urgent_alert" | "included" | "resolved";
  cycleId: string | null;
};

export type PlanRecord = {
  id: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  reportCount: number;
  dominantIssue: ReportCategory;
  summary: string;
  recommendation: string;
  routeMode: "shortest" | "deadline";
  proposedDistanceKm: number;
  estimatedMinutesSaved: number;
  avoidedIssues: number;
  status: "needs_review" | "pilot" | "approved" | "rejected";
};
