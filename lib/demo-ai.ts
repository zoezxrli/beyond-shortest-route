import type { AiDraft, ReportCategory, ReportRecord } from "./types";

export const categoryCopy: Record<ReportCategory, { label: string; short: string }> = {
  eca: { label: "ECA closed or full", short: "ECA capacity" },
  blocked: { label: "Blocked or unsafe access", short: "Access & safety" },
  contamination: { label: "Mixed or contaminated material", short: "Contamination" },
  schedule: { label: "Collection schedule conflict", short: "Schedule conflict" },
  illegal_dumping: { label: "Illegal dumping or bulky waste", short: "Illegal dumping" },
};

const keywordRules: Array<{ words: string[]; label: string; category: ReportCategory }> = [
  { words: ["cerrada", "closed", "llena", "full", "queue", "fila"], label: "ECA access pressure", category: "eca" },
  { words: ["blocked", "bloqueada", "unsafe", "peligro", "danger", "street"], label: "Blocked or unsafe access", category: "blocked" },
  { words: ["mixed", "mezclada", "contaminated", "comida", "food", "black bags"], label: "Mixed or contaminated material", category: "contamination" },
  { words: ["early", "temprano", "schedule", "horario", "truck", "camión"], label: "Schedule conflict", category: "schedule" },
  { words: ["furniture", "muebles", "tires", "llantas", "construction", "escombros"], label: "Bulky or illegally dumped waste", category: "illegal_dumping" },
];

export function analyzeDraft(category: ReportCategory, description: string, hasPhoto: boolean): AiDraft {
  const normalized = description.toLowerCase();
  const tags: AiDraft["tags"] = [
    { label: categoryCopy[category].short, confidence: 0.94, source: "worker" },
  ];

  for (const rule of keywordRules) {
    if (rule.words.some((word) => normalized.includes(word)) && !tags.some((tag) => tag.label === rule.label)) {
      tags.push({ label: rule.label, confidence: rule.category === category ? 0.9 : 0.78, source: "nlp" });
    }
  }

  if (hasPhoto) {
    const visionLabel = category === "blocked"
      ? "Obstruction visible"
      : category === "contamination"
        ? "Mixed material visible"
        : category === "illegal_dumping"
          ? "Bulky waste visible"
          : category === "eca"
            ? "Facility access issue"
            : "Street collection context";
    tags.push({ label: visionLabel, confidence: 0.86, source: "vision" });
  }

  const urgent = category === "blocked" || category === "eca" || /danger|unsafe|peligro|cerrada|closed/i.test(description);
  const confidence = Math.round((tags.reduce((sum, tag) => sum + tag.confidence, 0) / tags.length) * 100);
  const detail = description.trim() ? ` The report notes: “${description.trim().slice(0, 130)}${description.trim().length > 130 ? "…" : ""}”` : "";

  return {
    tags,
    confidence,
    urgent,
    summary: `${categoryCopy[category].label} was identified${hasPhoto ? " from a photo plus worker input" : " from worker input"}.${detail}`,
  };
}

export function buildPlan(reports: ReportRecord[], now = new Date()) {
  const counts = new Map<ReportCategory, number>();
  for (const report of reports) counts.set(report.category, (counts.get(report.category) ?? 0) + 1);
  const dominantIssue = ([...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "blocked") as ReportCategory;
  const urgentCount = reports.filter((report) => report.urgency === "urgent").length;
  const locations = new Map<string, number>();
  for (const report of reports) locations.set(report.locationLabel, (locations.get(report.locationLabel) ?? 0) + 1);
  const hotspot = [...locations.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Los Mártires";

  const routeMode = dominantIssue === "schedule" || dominantIssue === "blocked" || dominantIssue === "eca" ? "deadline" : "shortest";
  const recommendationByIssue: Record<ReportCategory, string> = {
    blocked: `Pilot an alternative approach to ${hotspot} that avoids the recurring access cluster and preserves worker override.`,
    eca: `Shift the planned ECA arrival window and test overflow handling before changing the full collection route.`,
    schedule: `Move the affected selective collection segment earlier and coordinate the change with the non-recyclable operator.`,
    contamination: `Keep the current route, but target source-separation outreach at ${hotspot} before considering a route change.`,
    illegal_dumping: `Separate bulky-waste response from the recycling route and coordinate a targeted intervention at ${hotspot}.`,
  };

  const generatedAt = now.toISOString();
  const periodEnd = generatedAt;
  const periodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `plan_${crypto.randomUUID()}`,
    generatedAt,
    periodStart,
    periodEnd,
    reportCount: reports.length,
    dominantIssue,
    summary: `${reports.length} reports were grouped into ${locations.size} locations. ${categoryCopy[dominantIssue].short} was the dominant recurring pattern; ${urgentCount} reports required immediate attention.`,
    recommendation: recommendationByIssue[dominantIssue],
    routeMode,
    proposedDistanceKm: routeMode === "deadline" ? 7.9 : 7.5,
    estimatedMinutesSaved: routeMode === "deadline" ? 14 : 6,
    avoidedIssues: Math.max(1, Math.min(reports.length, counts.get(dominantIssue) ?? 1)),
    status: "needs_review" as const,
  };
}
