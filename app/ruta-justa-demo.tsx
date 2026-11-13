"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  EyeOff,
  FileText,
  ImageIcon,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Mic,
  RefreshCw,
  Route,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup as LeafletLayerGroup, Map as LeafletMap, Polyline as LeafletPolyline } from "leaflet";
import { analyzeDraft, categoryCopy } from "../lib/demo-ai";
import type { AiDraft, ContributorType, PlanRecord, ReportCategory, ReportRecord } from "../lib/types";

type View = "worker" | "dashboard";
type WorkerStep = "home" | "capture" | "review" | "submitted";
type ApiReport = ReportRecord & { tags: AiDraft["tags"] };

const locations = [
  { label: "Calle 19 commercial corridor", latitude: 4.6085, longitude: -74.0872 },
  { label: "Santa Fe collection point", latitude: 4.6131, longitude: -74.0822 },
  { label: "Rail corridor", latitude: 4.6112, longitude: -74.0908 },
  { label: "ECA La Amistad approach", latitude: 4.6158, longitude: -74.0766 },
];

const categories: Array<{ id: ReportCategory; icon: typeof Warehouse; description: string }> = [
  { id: "eca", icon: Warehouse, description: "Closed, full or long queue" },
  { id: "blocked", icon: ShieldAlert, description: "Blocked street or safety risk" },
  { id: "contamination", icon: Trash2, description: "Mixed or damaged material" },
  { id: "schedule", icon: Clock3, description: "Collection timing conflict" },
  { id: "illegal_dumping", icon: AlertTriangle, description: "Bulky waste or illegal dumping" },
];

const categoryColors: Record<ReportCategory, string> = {
  eca: "#7b4b86",
  blocked: "#c24a42",
  contamination: "#ca8a18",
  schedule: "#2d75ae",
  illegal_dumping: "#795548",
};

function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function daysUntil(value: string | null) {
  if (!value) return 14;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
}

export default function DemoApp() {
  const [view, setView] = useState<View>("worker");
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <main className="site-shell">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => setView("worker")}>
          <span className="brand-mark"><Route size={19} /></span>
          <span><strong>Ruta Justa Bogotá</strong><small>Los Mártires · interactive demo</small></span>
        </button>
        <nav className="role-switch" aria-label="Demo interface">
          <button type="button" className={view === "worker" ? "active" : ""} onClick={() => setView("worker")}><Users size={16} /> Worker app</button>
          <button type="button" className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><LayoutDashboard size={16} /> Decision dashboard</button>
        </nav>
        <div className="demo-label"><Sparkles size={14} /> Simulated AI demo</div>
      </header>

      {view === "worker" ? (
        <WorkerApp
          onOpenDashboard={() => setView("dashboard")}
          onSubmitted={() => setRefreshToken((value) => value + 1)}
        />
      ) : (
        <DecisionDashboard refreshToken={refreshToken} onOpenWorker={() => setView("worker")} />
      )}
    </main>
  );
}

function WorkerApp({ onOpenDashboard, onSubmitted }: { onOpenDashboard: () => void; onSubmitted: () => void }) {
  const [step, setStep] = useState<WorkerStep>("home");
  const [contributorType, setContributorType] = useState<ContributorType>("reciclador");
  const [category, setCategory] = useState<ReportCategory>("blocked");
  const [description, setDescription] = useState("");
  const [locationIndex, setLocationIndex] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const photoUrl = useMemo(
    () => (photo ? URL.createObjectURL(photo) : null),
    [photo],
  );
  const [analysis, setAnalysis] = useState<AiDraft | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  function startReview() {
    setError("");
    setAnalysis(analyzeDraft(category, description, Boolean(photo)));
    setStep("review");
  }

  async function submitReport() {
    if (!analysis) return;
    setSubmitting(true);
    setError("");
    try {
      const location = locations[locationIndex];
      const form = new FormData();
      form.set("contributorType", contributorType);
      form.set("category", category);
      form.set("description", description);
      form.set("locationLabel", location.label);
      form.set("latitude", String(location.latitude));
      form.set("longitude", String(location.longitude));
      if (photo) form.set("photo", photo);
      const response = await fetch("/api/reports", { method: "POST", body: form });
      const data = await response.json() as { report?: ApiReport; error?: string };
      if (!response.ok || !data.report) throw new Error(data.error ?? "Submission failed");
      setSubmittedId(data.report.id);
      setStep("submitted");
      onSubmitted();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep("home");
    setCategory("blocked");
    setDescription("");
    setPhoto(null);
    setAnalysis(null);
    setSubmittedId(null);
    setError("");
  }

  return (
    <section className="worker-stage">
      <div className="worker-context">
        <span className="eyebrow">Frontline reporting</span>
        <h1>Useful to workers before it asks for data.</h1>
        <p>The mobile interface gives route and ECA updates, accepts reports from recyclers, organizations or volunteers, and returns visible follow-up.</p>
        <div className="context-flow">
          <div><span>1</span><p><strong>Capture</strong><small>Photo, text, voice and approximate location</small></p></div>
          <div><span>2</span><p><strong>Confirm</strong><small>Worker corrects simulated CV/NLP labels</small></p></div>
          <div><span>3</span><p><strong>Follow up</strong><small>Urgent alert now; planning review every 14 days</small></p></div>
        </div>
        <button className="secondary-button desktop-only" type="button" onClick={onOpenDashboard}>Open decision dashboard <ArrowRight size={16} /></button>
      </div>

      <div className="phone-frame" aria-label="Worker mobile application">
        <div className="phone-screen">
          <div className="phone-status"><span>8:42</span><span>Low-data mode · Online</span></div>

          {step === "home" && (
            <div className="phone-view">
              <div className="mobile-header"><div><span>Tuesday route</span><h2>Good morning, Ana</h2></div><span className="status-pill success">ECA open</span></div>
              <div className="mobile-content">
                <article className="route-card">
                  <div className="card-heading"><div><span>Today</span><h3>Route 4 · La Amistad</h3></div><span className="status-pill success">On schedule</span></div>
                  <p>5 collection areas · estimated ECA arrival 10:05</p>
                  <div className="mini-route"><span>S</span><i></i><span>C</span><i></i><span className="eca-node">E</span></div>
                </article>
                <article className="notice-card"><CircleAlert size={18} /><div><strong>Schedule notice</strong><p>Non-recyclable collection may arrive 20 minutes earlier near Calle 19.</p></div></article>
                <button className="primary-button full" type="button" onClick={() => setStep("capture")}><Upload size={17} /> Report a route issue</button>
                <button className="text-button full" type="button" onClick={() => setStep("submitted")}><MessageSquareText size={16} /> View report updates</button>
              </div>
            </div>
          )}

          {step === "capture" && (
            <div className="phone-view">
              <div className="mobile-header compact"><button className="icon-button" type="button" onClick={() => setStep("home")} aria-label="Back"><ArrowLeft size={18} /></button><div><span>About 30 seconds</span><h2>Report an issue</h2></div><span>1 / 2</span></div>
              <div className="mobile-content capture-content">
                <label className="field-label">I am reporting as</label>
                <div className="segmented-control">
                  {(["reciclador", "organization", "volunteer"] as ContributorType[]).map((type) => (
                    <button key={type} type="button" className={contributorType === type ? "active" : ""} onClick={() => setContributorType(type)}>{type === "reciclador" ? "Worker" : type === "organization" ? "Organization" : "Volunteer"}</button>
                  ))}
                </div>
                <label className="field-label">What happened?</label>
                <div className="category-grid">
                  {categories.map((item) => {
                    const Icon = item.icon;
                    return <button key={item.id} type="button" className={category === item.id ? "selected" : ""} onClick={() => setCategory(item.id)}><Icon size={18} /><strong>{categoryCopy[item.id].short}</strong><small>{item.description}</small></button>;
                  })}
                </div>
                <label className="field-label" htmlFor="report-location">Approximate location</label>
                <select id="report-location" className="select-input" value={locationIndex} onChange={(event) => setLocationIndex(Number(event.target.value))}>
                  {locations.map((location, index) => <option value={index} key={location.label}>{location.label}</option>)}
                </select>
                <label className="field-label" htmlFor="report-description">Voice or text description</label>
                <textarea id="report-description" className="text-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what you see…" rows={3} />
                <div className="input-actions">
                  <button className="secondary-button" type="button" onClick={() => setDescription("La calle está bloqueada por bolsas negras y muebles. Es difícil pasar con la carreta.")}><Mic size={16} /> Demo voice note</button>
                  <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}><Camera size={16} /> {photo ? "Change photo" : "Add photo"}</button>
                  <input ref={inputRef} hidden type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
                </div>
                {photoUrl && <div className="photo-preview"><img src={photoUrl} alt="Selected report" /><button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo"><X size={16} /></button></div>}
                <div className="privacy-note"><EyeOff size={16} /><span>Exact location stays with the ORO. Faces and licence plates should be blurred before long-term storage.</span></div>
                <button className="primary-button full" type="button" onClick={startReview}>Review AI summary <ChevronRight size={17} /></button>
              </div>
            </div>
          )}

          {step === "review" && analysis && (
            <div className="phone-view">
              <div className="mobile-header compact"><button className="icon-button" type="button" onClick={() => setStep("capture")} aria-label="Back"><ArrowLeft size={18} /></button><div><span>Worker confirmation</span><h2>Check the AI summary</h2></div><span>2 / 2</span></div>
              <div className="mobile-content">
                {photoUrl ? <div className="review-photo"><img src={photoUrl} alt="Report being analyzed" /><span><ScanSearch size={15} /> CV demo analyzed</span></div> : <div className="no-photo"><ImageIcon size={22} /><span>Text-only analysis</span></div>}
                <div className="ai-disclaimer"><Sparkles size={16} /><span>Simulated AI output for concept demonstration</span></div>
                <div className="tag-list">
                  {analysis.tags.map((tag) => <span key={tag.source + tag.label}><strong>{tag.label}</strong><small>{Math.round(tag.confidence * 100)}% · {tag.source}</small></span>)}
                </div>
                <article className="summary-box"><span>AI summary</span><p>{analysis.summary}</p></article>
                <button className="text-button full" type="button" onClick={() => setStep("capture")}><FileText size={16} /> Correct labels or description</button>
                {error && <p className="error-message">{error}</p>}
                <button className="primary-button full" type="button" disabled={submitting} onClick={submitReport}>{submitting ? <><RefreshCw className="spin" size={16} /> Sending…</> : <><Check size={17} /> Confirm and send to ORO</>}</button>
              </div>
            </div>
          )}

          {step === "submitted" && (
            <div className="phone-view">
              <div className="mobile-header"><div><span>Visible follow-up</span><h2>{submittedId ? "Report received" : "Your report updates"}</h2></div><span className="status-pill success">Received</span></div>
              <div className="mobile-content submitted-content">
                <div className="success-mark"><Check size={26} /></div>
                <h3>{submittedId ? "Your report entered the planning system" : "No unresolved updates"}</h3>
                <p>{submittedId ? "Urgent issues alert the ORO now. This report also enters the next 14-day analysis window." : "New reports will show their review and action status here."}</p>
                {submittedId && <div className="report-id">{submittedId.slice(0, 20)}</div>}
                <div className="status-timeline">
                  <div className="complete"><CheckCircle2 size={17} /><span><strong>AI labels confirmed</strong><small>Worker-approved interpretation</small></span></div>
                  <div className="complete"><Users size={17} /><span><strong>ORO notified</strong><small>Immediate if urgent</small></span></div>
                  <div><CalendarClock size={17} /><span><strong>Biweekly analysis</strong><small>Queued for the next planning cycle</small></span></div>
                </div>
                {submittedId && <button className="primary-button full" type="button" onClick={onOpenDashboard}>Watch it reach the dashboard <ArrowRight size={17} /></button>}
                <button className="text-button full" type="button" onClick={reset}>Back to today’s route</button>
              </div>
            </div>
          )}

          <nav className="mobile-nav" aria-label="Worker app navigation">
            <button type="button" className={step === "home" ? "active" : ""} onClick={() => setStep("home")}><Route size={17} /><span>Today</span></button>
            <button type="button" className={step === "capture" || step === "review" ? "active" : ""} onClick={() => setStep("capture")}><Upload size={17} /><span>Report</span></button>
            <button type="button" className={step === "submitted" ? "active" : ""} onClick={() => setStep("submitted")}><MessageSquareText size={17} /><span>Updates</span></button>
          </nav>
        </div>
      </div>
    </section>
  );
}

type AnalysisState = {
  latestPlan: PlanRecord | null;
  pending: ReportRecord[];
  nextCycleAt: string;
  queuedCount: number;
  urgentCount: number;
  due: boolean;
};

function DecisionDashboard({ refreshToken, onOpenWorker }: { refreshToken: number; onOpenWorker: () => void }) {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [reportResponse, analysisResponse] = await Promise.all([
        fetch("/api/reports", { cache: "no-store" }),
        fetch("/api/analysis", { cache: "no-store" }),
      ]);
      const reportData = await reportResponse.json() as { reports?: ApiReport[]; error?: string };
      const analysisData = await analysisResponse.json() as AnalysisState & { error?: string };
      if (!reportResponse.ok) throw new Error(reportData.error ?? "Unable to load reports");
      if (!analysisResponse.ok) throw new Error(analysisData.error ?? "Unable to load analysis");
      setReports(reportData.reports ?? []);
      setAnalysis(analysisData);
      setError("");
      if (analysisData.due && analysisData.queuedCount > 0) {
        await fetch("/api/analysis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ force: false }) });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      await fetch("/api/demo", { method: "POST" });
      if (!cancelled) await load();
    }
    void initialize();
    const interval = window.setInterval(() => { if (!cancelled) void load(); }, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [load, refreshToken]);

  async function generatePlan() {
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/analysis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ force: true }) });
      const data = await response.json() as { plan?: PlanRecord; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to generate plan");
      await load();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Unable to generate plan");
    } finally {
      setGenerating(false);
    }
  }

  async function updatePlan(status: PlanRecord["status"]) {
    if (!analysis?.latestPlan) return;
    await fetch("/api/analysis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planId: analysis.latestPlan.id, status }) });
    await load();
  }

  const recentReports = reports.slice(0, 5);
  const dominantCounts = useMemo(() => {
    const result = new Map<ReportCategory, number>();
    reports.filter((report) => report.status === "queued" || report.status === "urgent_alert").forEach((report) => result.set(report.category, (result.get(report.category) ?? 0) + 1));
    return [...result.entries()].sort((a, b) => b[1] - a[1]);
  }, [reports]);

  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <div><span className="eyebrow">Decision support · ORO + UAESP</span><h1>Biweekly waste-picking review</h1><p>New reports are classified immediately. Route and infrastructure proposals are generated every 14 days for human review.</p></div>
        <button className="secondary-button" type="button" onClick={onOpenWorker}><Users size={16} /> Open worker input</button>
      </header>

      <div className="cycle-strip">
        <div><span>New reports</span><strong>{analysis?.queuedCount ?? 0}</strong></div>
        <div><span>Urgent alerts</span><strong className="urgent-number">{analysis?.urgentCount ?? 0}</strong></div>
        <div className="cycle-progress"><span>Next 14-day plan</span><strong>{analysis ? String(daysUntil(analysis.nextCycleAt)) + " days" : "Loading"}</strong><div><i style={{ width: String(analysis ? Math.max(8, ((14 - daysUntil(analysis.nextCycleAt)) / 14) * 100) : 8) + "%" }} /></div></div>
        <button className="primary-button" type="button" disabled={generating || !analysis?.queuedCount} onClick={generatePlan}>{generating ? <><RefreshCw className="spin" size={16} /> Generating…</> : <><Sparkles size={16} /> Run next cycle now</>}</button>
      </div>

      {error && <div className="dashboard-error"><AlertTriangle size={17} /> {error}</div>}

      <div className="dashboard-grid">
        <section className="map-panel">
          <div className="panel-title"><div><span className="eyebrow">Los Mártires · real basemap</span><h2>Worker reports + route alternatives</h2></div><div className="map-legend"><span><i className="current-line" /> Current</span>{analysis?.latestPlan && <span><i className="proposed-line" /> Proposed</span>}<span><b className="report-dot" /> Reports</span></div></div>
          <RouteMap reports={reports} plan={analysis?.latestPlan ?? null} />
          <div className="provenance-row"><span>OpenStreetMap basemap</span><span>Bogotá locality boundary</span><span>OSM-derived walking network</span><span>Worker reports</span><span>Simulated AI inference</span></div>
        </section>

        <aside className="analysis-panel">
          <div className="panel-title"><div><span className="eyebrow">Live analysis</span><h2>AI pattern queue</h2></div><button className="icon-button" type="button" onClick={() => void load()} aria-label="Refresh"><RefreshCw size={16} /></button></div>
          {loading ? <div className="loading-block">Loading reports…</div> : (
            <>
              <div className="analysis-summary"><ScanSearch size={18} /><div><strong>{analysis?.queuedCount ?? 0} reports awaiting cycle review</strong><p>{dominantCounts[0] ? categoryCopy[dominantCounts[0][0]].short + " is the most frequent current pattern." : "New input will appear here."}</p></div></div>
              <div className="issue-bars">
                {dominantCounts.slice(0, 4).map(([issue, count]) => <div key={issue}><span>{categoryCopy[issue].short}</span><div><i style={{ width: String(Math.max(16, (count / Math.max(1, analysis?.queuedCount ?? 1)) * 100)) + "%", background: categoryColors[issue] }} /></div><strong>{count}</strong></div>)}
              </div>
              <h3 className="section-label">Latest inputs</h3>
              <div className="report-feed">
                {recentReports.map((report) => <article key={report.id} className={report.status === "urgent_alert" ? "urgent" : ""}>
                  <span className="feed-icon" style={{ color: categoryColors[report.category], background: categoryColors[report.category] + "18" }}><MapPin size={15} /></span>
                  <div><div><strong>{categoryCopy[report.category].short}</strong><small>{formatDate(report.createdAt, true)}</small></div><p>{report.locationLabel}</p><span>{report.aiConfidence}% confidence · {report.status.replace("_", " ")}</span></div>
                </article>)}
              </div>
            </>
          )}
        </aside>
      </div>

      <section className="plan-section">
        <div className="panel-title"><div><span className="eyebrow">Latest biweekly output</span><h2>{analysis?.latestPlan ? "Plan generated " + formatDate(analysis.latestPlan.generatedAt, true) : "No plan generated yet"}</h2></div>{analysis?.latestPlan && <span className={"review-status " + analysis.latestPlan.status}>{analysis.latestPlan.status.replace("_", " ")}</span>}</div>
        {analysis?.latestPlan ? (
          <div className="plan-grid">
            <article className="plan-narrative"><Sparkles size={19} /><div><h3>{categoryCopy[analysis.latestPlan.dominantIssue].short} shaped this cycle</h3><p>{analysis.latestPlan.summary}</p><strong>Recommended response</strong><p>{analysis.latestPlan.recommendation}</p></div></article>
            <div className="metric-compare"><div><span>Current route</span><strong>7.4 km</strong><small>Shortest-distance baseline</small></div><ArrowRight size={18} /><div><span>Proposed pilot</span><strong>{analysis.latestPlan.proposedDistanceKm.toFixed(1)} km</strong><small>{analysis.latestPlan.estimatedMinutesSaved} min burden avoided</small></div></div>
            {analysis.latestPlan.status === "needs_review" ? (
              <div className="plan-actions"><button className="secondary-button" type="button" onClick={() => void updatePlan("rejected")}>Reject with reason</button><button className="primary-button" type="button" onClick={() => void updatePlan("pilot")}>Start 7-day pilot</button></div>
            ) : (
              <div className={"plan-decision " + analysis.latestPlan.status}>
                {analysis.latestPlan.status === "pilot" ? "7-day pilot active · worker feedback remains open" : "Returned for revision · no route change has been published"}
              </div>
            )}
          </div>
        ) : (
          <div className="empty-plan"><CalendarClock size={28} /><div><strong>The first proposal is waiting for the cycle boundary.</strong><p>Use “Run next cycle now” to demonstrate what the system would generate after 14 days.</p></div></div>
        )}
      </section>
    </section>
  );
}

type MapData = {
  boundary: { type: "FeatureCollection"; features: Array<{ type: "Feature"; properties: Record<string, unknown>; geometry: { type: "Polygon"; coordinates: [number, number][][] } }> };
  points: { type: "FeatureCollection"; features: Array<{ type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] }; properties: { id: string; name?: string; role: string } }> };
  paths: Record<string, { coordinates: [number, number][] }>;
  options: { baseline_id: string; default_constrained_id: string; options: Array<{ id: string; order: string[] }> };
};

function RouteMap({ reports, plan }: { reports: ApiReport[]; plan: PlanRecord | null }) {
  const [data, setData] = useState<MapData | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const reportLayerRef = useRef<LeafletLayerGroup | null>(null);
  const proposedRouteRef = useRef<LeafletPolyline | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/boundary.geojson").then((response) => response.json()),
      fetch("/data/points.geojson").then((response) => response.json()),
      fetch("/data/pairwise_paths.json").then((response) => response.json()),
      fetch("/data/route_options.json").then((response) => response.json()),
    ]).then(([boundary, points, paths, options]) => setData({
      boundary: boundary as MapData["boundary"],
      points: points as MapData["points"],
      paths: paths as MapData["paths"],
      options: options as MapData["options"],
    })).catch(() => setData(null));
  }, []);

  const routeCoordinates = useCallback((routeId: string) => {
    if (!data) return [];
    const option = data.options.options.find((candidate) => candidate.id === routeId);
    if (!option) return [];
    const result: [number, number][] = [];
    option.order.slice(0, -1).forEach((from, index) => {
      const to = option.order[index + 1];
      const segment = data.paths[from + ">" + to]?.coordinates ?? [];
      result.push(...(index === 0 ? segment : segment.slice(1)));
    });
    return result;
  }, [data]);

  const popupCard = useCallback((report: ApiReport) => {
    const card = document.createElement("div");
    card.className = "report-popup";
    const eyebrow = document.createElement("span");
    eyebrow.textContent = report.urgency === "urgent" ? "Urgent worker report" : "Worker report";
    const heading = document.createElement("strong");
    heading.textContent = categoryCopy[report.category].short;
    const location = document.createElement("p");
    location.textContent = report.locationLabel;
    const description = document.createElement("p");
    description.textContent = report.description || "No additional description";
    const meta = document.createElement("small");
    meta.textContent = report.aiConfidence + "% AI confidence · " + report.status.replace("_", " ");
    card.appendChild(eyebrow);
    card.appendChild(heading);
    card.appendChild(location);
    card.appendChild(description);
    card.appendChild(meta);
    return card;
  }, []);

  const drawReports = useCallback((leaflet: typeof import("leaflet"), layer: LeafletLayerGroup, items: ApiReport[]) => {
    layer.clearLayers();
    items.slice(0, 100).forEach((report) => {
      const color = categoryColors[report.category];
      leaflet.circleMarker([report.latitude, report.longitude], {
        radius: report.urgency === "urgent" ? 9 : 7,
        color: "#ffffff",
        weight: 3,
        fillColor: color,
        fillOpacity: 0.96,
        className: report.urgency === "urgent" ? "urgent-report-marker" : "report-map-marker",
      }).bindPopup(popupCard(report), { maxWidth: 290, className: "worker-report-popup" }).addTo(layer);
    });
  }, [popupCard]);

  useEffect(() => {
    if (!data || !containerRef.current) return;
    const mapData = data;
    let cancelled = false;
    let map: LeafletMap | null = null;

    async function initialize() {
      const leaflet = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      leafletRef.current = leaflet;
      map = leaflet.map(containerRef.current, {
        center: [4.608, -74.087],
        zoom: 14,
        minZoom: 11,
        maxZoom: 18,
        zoomControl: true,
      });
      mapRef.current = map;
      leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      leaflet.control.scale({ metric: true, imperial: false, maxWidth: 110, position: "bottomleft" }).addTo(map);

      leaflet.geoJSON(mapData.boundary, {
        style: { color: "#18211d", weight: 2, opacity: 0.72, fillColor: "#087f67", fillOpacity: 0.055 },
        interactive: false,
      }).addTo(map);

      const currentRoute = routeCoordinates(mapData.options.baseline_id).map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
      leaflet.polyline(currentRoute, { color: "#ffffff", weight: 10, opacity: 0.9, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
      leaflet.polyline(currentRoute, { color: "#087f67", weight: 5.5, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);

      mapData.points.features.forEach((feature) => {
        const markerClass = feature.properties.role === "eca" ? "eca" : "collection";
        const icon = leaflet.divIcon({
          className: "route-stop-icon",
          html: '<span class="route-stop-marker ' + markerClass + '">' + feature.properties.id + "</span>",
          iconSize: feature.properties.role === "eca" ? [28, 28] : [22, 22],
          iconAnchor: feature.properties.role === "eca" ? [14, 14] : [11, 11],
        });
        leaflet.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], { icon, keyboard: true, title: feature.properties.name ?? feature.properties.id })
          .bindTooltip(feature.properties.name ?? feature.properties.id, { direction: "top", offset: [0, -11] })
          .addTo(map!);
      });

      reportLayerRef.current = leaflet.layerGroup().addTo(map);
      drawReports(leaflet, reportLayerRef.current, reports);

      if (plan) {
        const proposed = routeCoordinates(plan.routeMode === "deadline" ? mapData.options.default_constrained_id : mapData.options.baseline_id)
          .map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
        proposedRouteRef.current = leaflet.polyline(proposed, { color: "#7b4b86", weight: 5, opacity: 0.95, dashArray: "11 8", lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
      }

      const boundaryRing = mapData.boundary.features[0].geometry.coordinates[0];
      const bounds = leaflet.latLngBounds(boundaryRing.map(([longitude, latitude]) => [latitude, longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [34, 34], animate: false });
      window.requestAnimationFrame(() => map?.invalidateSize(false));
      setMapReady(true);
    }

    void initialize();
    return () => {
      cancelled = true;
      setMapReady(false);
      map?.remove();
      if (mapRef.current === map) mapRef.current = null;
      leafletRef.current = null;
      reportLayerRef.current = null;
      proposedRouteRef.current = null;
    };
  }, [data, drawReports, routeCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const reportLayer = reportLayerRef.current;
    if (!map || !leaflet || !reportLayer || !mapReady || !data) return;
    drawReports(leaflet, reportLayer, reports);
    if (proposedRouteRef.current) {
      proposedRouteRef.current.removeFrom(map);
      proposedRouteRef.current = null;
    }
    if (plan) {
      const proposed = routeCoordinates(plan.routeMode === "deadline" ? data.options.default_constrained_id : data.options.baseline_id)
        .map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
      proposedRouteRef.current = leaflet.polyline(proposed, { color: "#7b4b86", weight: 5, opacity: 0.95, dashArray: "11 8", lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
    }
  }, [data, drawReports, mapReady, plan, reports, routeCoordinates]);

  return (
    <div className="real-map-shell">
      <div ref={containerRef} className="route-map" role="application" aria-label="Interactive OpenStreetMap of Los Mártires showing worker reports and route alternatives" />
      {!mapReady && <div className="map-loading">Loading the real Bogotá basemap…</div>}
      <div className="map-data-badge"><i /> Real basemap · simulated operational data</div>
    </div>
  );
}
