import { asc, desc, eq, or } from "drizzle-orm";
import { getDb } from "../../../db";
import { plans, reports } from "../../../db/schema";
import { buildPlan } from "../../../lib/demo-ai";
import type { ReportRecord } from "../../../lib/types";

const DAY = 24 * 60 * 60 * 1000;

async function getState() {
  const db = getDb();
  const [latestPlan] = await db.select().from(plans).orderBy(desc(plans.generatedAt)).limit(1);
  const pending = await db.select().from(reports).where(or(eq(reports.status, "queued"), eq(reports.status, "urgent_alert"))).orderBy(asc(reports.createdAt));
  const base = latestPlan?.generatedAt ?? pending[0]?.createdAt ?? new Date().toISOString();
  const nextCycleAt = new Date(new Date(base).getTime() + 14 * DAY).toISOString();
  return { latestPlan: latestPlan ?? null, pending, nextCycleAt };
}

export async function GET() {
  try {
    const state = await getState();
    return Response.json({
      ...state,
      queuedCount: state.pending.length,
      urgentCount: state.pending.filter((report) => report.urgency === "urgent").length,
      due: Date.now() >= new Date(state.nextCycleAt).getTime(),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load analysis" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({})) as { force?: boolean; planId?: string; status?: string };
    const db = getDb();

    if (payload.planId && payload.status) {
      const allowed = new Set(["needs_review", "pilot", "approved", "rejected"]);
      if (!allowed.has(payload.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
      const [updated] = await db.update(plans).set({ status: payload.status }).where(eq(plans.id, payload.planId)).returning();
      return Response.json({ plan: updated });
    }

    const state = await getState();
    if (!state.pending.length) return Response.json({ error: "No new reports are waiting for the next cycle." }, { status: 409 });
    if (!payload.force && Date.now() < new Date(state.nextCycleAt).getTime()) {
      return Response.json({ error: "The 14-day cycle is not due yet.", nextCycleAt: state.nextCycleAt }, { status: 409 });
    }

    const plan = buildPlan(state.pending as ReportRecord[]);
    const [inserted] = await db.insert(plans).values(plan).returning();
    await db.update(reports).set({ status: "included", cycleId: plan.id }).where(or(eq(reports.status, "queued"), eq(reports.status, "urgent_alert")));
    return Response.json({ plan: inserted }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate plan" }, { status: 500 });
  }
}
