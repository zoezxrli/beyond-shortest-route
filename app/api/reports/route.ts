import { desc } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { reports } from "../../../db/schema";
import { analyzeDraft } from "../../../lib/demo-ai";
import type { ContributorType, ReportCategory } from "../../../lib/types";

const validCategories = new Set(["eca", "blocked", "contamination", "schedule", "illegal_dumping"]);
const validContributors = new Set(["reciclador", "organization", "volunteer"]);

export async function GET() {
  try {
    const rows = await getDb().select().from(reports).orderBy(desc(reports.createdAt)).limit(100);
    return Response.json({ reports: rows.map((row) => ({ ...row, tags: JSON.parse(row.aiTags) })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load reports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const contributorType = String(form.get("contributorType") ?? "") as ContributorType;
    const category = String(form.get("category") ?? "") as ReportCategory;
    const description = String(form.get("description") ?? "").trim();
    const locationLabel = String(form.get("locationLabel") ?? "").trim();
    const latitude = Number(form.get("latitude"));
    const longitude = Number(form.get("longitude"));
    const photo = form.get("photo");

    if (!validContributors.has(contributorType) || !validCategories.has(category)) {
      return Response.json({ error: "Choose a valid contributor and issue type." }, { status: 400 });
    }
    if (!locationLabel || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json({ error: "Choose an approximate location." }, { status: 400 });
    }

    const hasPhoto = photo instanceof File && photo.size > 0;
    if (hasPhoto && photo.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Photo must be 5 MB or smaller." }, { status: 400 });
    }

    const analysis = analyzeDraft(category, description, hasPhoto);
    const id = `report_${crypto.randomUUID()}`;
    let photoKey: string | null = null;

    if (hasPhoto) {
      if (!env.BUCKET) throw new Error("Photo storage is unavailable.");
      const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      photoKey = `${id}.${extension}`;
      await env.BUCKET.put(photoKey, await photo.arrayBuffer(), {
        httpMetadata: { contentType: photo.type || "image/jpeg" },
      });
    }

    const [report] = await getDb().insert(reports).values({
      id,
      createdAt: new Date().toISOString(),
      contributorType,
      category,
      description,
      locationLabel,
      latitude,
      longitude,
      urgency: analysis.urgent ? "urgent" : "routine",
      photoKey,
      aiTags: JSON.stringify(analysis.tags),
      aiSummary: analysis.summary,
      aiConfidence: analysis.confidence,
      status: analysis.urgent ? "urgent_alert" : "queued",
      cycleId: null,
    }).returning();

    return Response.json({ report: { ...report, tags: analysis.tags }, analysis }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to submit report" }, { status: 500 });
  }
}
