import { getDb } from "../../../db";
import { reports } from "../../../db/schema";
import { analyzeDraft } from "../../../lib/demo-ai";
import type { ContributorType, ReportCategory } from "../../../lib/types";

const locations = {
  "Calle 19 commercial corridor": { latitude: 4.6085, longitude: -74.0872 },
  "Santa Fe collection point": { latitude: 4.6131, longitude: -74.0822 },
  "Rail corridor": { latitude: 4.6112, longitude: -74.0908 },
  "ECA La Amistad approach": { latitude: 4.6158, longitude: -74.0766 },
};

const seeds: Array<{ id: string; daysAgo: number; contributorType: ContributorType; category: ReportCategory; description: string; locationLabel: keyof typeof locations }> = [
  { id: "demo_01", daysAgo: 12, contributorType: "reciclador", category: "blocked", description: "Furniture and black bags are blocking the cart route.", locationLabel: "Calle 19 commercial corridor" },
  { id: "demo_02", daysAgo: 11, contributorType: "organization", category: "schedule", description: "The non-recyclable truck arrived earlier than the posted schedule.", locationLabel: "Santa Fe collection point" },
  { id: "demo_03", daysAgo: 10, contributorType: "volunteer", category: "illegal_dumping", description: "Tires and construction debris are accumulating beside the rail corridor.", locationLabel: "Rail corridor" },
  { id: "demo_04", daysAgo: 9, contributorType: "reciclador", category: "eca", description: "Long queue at the ECA and unloading was delayed.", locationLabel: "ECA La Amistad approach" },
  { id: "demo_05", daysAgo: 8, contributorType: "reciclador", category: "blocked", description: "Unsafe passage and bags spread across the sidewalk.", locationLabel: "Calle 19 commercial corridor" },
  { id: "demo_06", daysAgo: 7, contributorType: "organization", category: "contamination", description: "Food waste is mixed with cardboard and plastic.", locationLabel: "Santa Fe collection point" },
  { id: "demo_07", daysAgo: 5, contributorType: "reciclador", category: "blocked", description: "The same street segment is blocked again by bulky waste.", locationLabel: "Calle 19 commercial corridor" },
  { id: "demo_08", daysAgo: 3, contributorType: "volunteer", category: "illegal_dumping", description: "New furniture and tires appeared near the rail corridor.", locationLabel: "Rail corridor" },
];

export async function POST() {
  try {
    const now = Date.now();
    const values = seeds.map((seed) => {
      const analysis = analyzeDraft(seed.category, seed.description, false);
      const point = locations[seed.locationLabel];
      return {
        id: seed.id,
        createdAt: new Date(now - seed.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        contributorType: seed.contributorType,
        category: seed.category,
        description: seed.description,
        locationLabel: seed.locationLabel,
        latitude: point.latitude,
        longitude: point.longitude,
        urgency: analysis.urgent ? "urgent" : "routine",
        photoKey: null,
        aiTags: JSON.stringify(analysis.tags),
        aiSummary: analysis.summary,
        aiConfidence: analysis.confidence,
        status: analysis.urgent ? "urgent_alert" : "queued",
        cycleId: null,
      };
    });
    // Keep each insert below D1's bound-parameter ceiling. The stable demo IDs
    // make this safe to call whenever the dashboard opens.
    const db = getDb();
    let inserted = 0;
    for (const value of values) {
      const rows = await db.insert(reports).values(value).onConflictDoNothing().returning({ id: reports.id });
      inserted += rows.length;
    }
    return Response.json({ seeded: inserted, available: values.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to seed demo" }, { status: 500 });
  }
}
