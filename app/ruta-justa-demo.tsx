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
type WorkerStep = "role" | "home" | "capture" | "review" | "submitted";
type Language = "es" | "en";
type ApiReport = ReportRecord & { tags: AiDraft["tags"] };

const locations = [
  { label: "Calle 19 commercial corridor", labelEs: "Corredor comercial de la Calle 19", latitude: 4.6085, longitude: -74.0872 },
  { label: "Santa Fe collection point", labelEs: "Punto de recolección de Santa Fe", latitude: 4.6131, longitude: -74.0822 },
  { label: "Rail corridor", labelEs: "Corredor ferroviario", latitude: 4.6112, longitude: -74.0908 },
  { label: "ECA La Amistad approach", labelEs: "Acceso a la ECA La Amistad", latitude: 4.6158, longitude: -74.0766 },
];

const categories: Array<{ id: ReportCategory; icon: typeof Warehouse }> = [
  { id: "eca", icon: Warehouse },
  { id: "blocked", icon: ShieldAlert },
  { id: "contamination", icon: Trash2 },
  { id: "schedule", icon: Clock3 },
  { id: "illegal_dumping", icon: AlertTriangle },
];

const roleOptions: Array<{ id: ContributorType; icon: typeof Route; en: { label: string; description: string }; es: { label: string; description: string } }> = [
  { id: "reciclador", icon: Route, en: { label: "Waste worker", description: "Route, ECA and field reports" }, es: { label: "Reciclador/a", description: "Ruta, ECA y reportes de campo" } },
  { id: "organization", icon: Users, en: { label: "Organization", description: "Coordinate and track team reports" }, es: { label: "Organización", description: "Coordina y revisa reportes del equipo" } },
  { id: "volunteer", icon: Sparkles, en: { label: "Volunteer", description: "Quick photo-guided reporting" }, es: { label: "Voluntario/a", description: "Reportes rápidos con fotos y guía" } },
];

const categoryUiCopy: Record<Language, Record<ReportCategory, { short: string; description: string; volunteerShort: string; volunteerDescription: string; full: string }>> = {
  en: {
    eca: { short: "ECA capacity", description: "Closed, full or long queue", volunteerShort: "Drop-off full", volunteerDescription: "Closed or busy", full: "ECA closed or full" },
    blocked: { short: "Access & safety", description: "Blocked street or safety risk", volunteerShort: "Street blocked", volunteerDescription: "Cannot pass", full: "blocked or unsafe access" },
    contamination: { short: "Contamination", description: "Mixed or damaged material", volunteerShort: "Mixed waste", volunteerDescription: "Materials mixed", full: "mixed or contaminated material" },
    schedule: { short: "Schedule conflict", description: "Collection timing conflict", volunteerShort: "Missed pickup", volunteerDescription: "Did not arrive", full: "a collection schedule conflict" },
    illegal_dumping: { short: "Illegal dumping", description: "Bulky waste or illegal dumping", volunteerShort: "Waste pile", volunteerDescription: "Left in public", full: "illegal dumping or bulky waste" },
  },
  es: {
    eca: { short: "Capacidad de la ECA", description: "Cerrada, llena o con fila larga", volunteerShort: "Punto lleno", volunteerDescription: "Cerrado o lleno", full: "una ECA cerrada o llena" },
    blocked: { short: "Acceso y seguridad", description: "Calle bloqueada o riesgo de seguridad", volunteerShort: "Calle bloqueada", volunteerDescription: "No se puede pasar", full: "un acceso bloqueado o inseguro" },
    contamination: { short: "Contaminación", description: "Material mezclado o dañado", volunteerShort: "Residuos mezclados", volunteerDescription: "Materiales mezclados", full: "material mezclado o contaminado" },
    schedule: { short: "Conflicto de horario", description: "Problema con el horario de recolección", volunteerShort: "Recolección perdida", volunteerDescription: "No llegó", full: "un conflicto de horario de recolección" },
    illegal_dumping: { short: "Vertido ilegal", description: "Residuos voluminosos o vertido ilegal", volunteerShort: "Montón de residuos", volunteerDescription: "Dejado en público", full: "un vertido ilegal o residuos voluminosos" },
  },
};

const aiTagSpanish: Record<string, string> = {
  "ECA capacity": "Capacidad de la ECA",
  "Access & safety": "Acceso y seguridad",
  "Contamination": "Contaminación",
  "Schedule conflict": "Conflicto de horario",
  "Illegal dumping": "Vertido ilegal",
  "ECA access pressure": "Presión de acceso a la ECA",
  "Blocked or unsafe access": "Acceso bloqueado o inseguro",
  "Mixed or contaminated material": "Material mezclado o contaminado",
  "Bulky or illegally dumped waste": "Residuos voluminosos o vertidos ilegalmente",
  "Obstruction visible": "Obstrucción visible",
  "Mixed material visible": "Material mezclado visible",
  "Bulky waste visible": "Residuos voluminosos visibles",
  "Facility access issue": "Problema de acceso a la instalación",
  "Street collection context": "Contexto de recolección en calle",
};

const workerText = {
  en: {
    personalized: "Anonymous reporting",
    welcome: "Welcome to Ruta Justa",
    oneTap: "1 tap",
    howHelping: "How are you helping today?",
    roleHint: "Choose the option that fits best. You can choose again next time.",
    notSureLead: "Not sure?",
    notSureAction: "Choose Volunteer and we’ll guide you.",
    anonymousNote: "No sign-in required · anonymous reporting",
    tuesdayRoute: "Tuesday route",
    greeting: "Good morning, Ana",
    ecaOpen: "ECA open",
    today: "Today",
    onSchedule: "On schedule",
    collectionSummary: "5 collection areas · estimated ECA arrival 10:05",
    scheduleNotice: "Schedule notice",
    noticeText: "Non-recyclable collection may arrive 20 minutes earlier near Calle 19.",
    reportRouteIssue: "Report a route issue",
    viewUpdates: "View report updates",
    switchWorker: "Not a waste worker? Switch role",
    fieldCoordination: "Field coordination",
    active: "3 active",
    teamOverview: "Team overview",
    keepMoving: "Keep community reports moving",
    coordinateContext: "Coordinate submissions without losing frontline context.",
    thisMonth: "This month",
    unresolved: "Unresolved",
    urgent: "Urgent",
    recentTeam: "Recent team activity",
    calleReport: "Calle 19 report",
    sentByTeam: "Sent by field team · 18 min ago",
    queued: "Queued",
    ecaFollowup: "ECA follow-up",
    reviewedCoordinator: "Reviewed by coordinator",
    done: "Done",
    createFieldReport: "Create a field report",
    trackTeamReports: "Track team reports",
    switchRole: "Switch contributor role",
    volunteerQuick: "Volunteer quick report",
    whatSee: "What did you see?",
    threeSteps: "3 steps",
    about20: "About 20 seconds",
    startVisible: "Start with what you can see",
    photoEnough: "A photo or one short sentence is enough. AI will organize the details for you.",
    choosePicture: "Choose the closest picture",
    startQuick: "Start a quick report",
    trackMine: "Track my reports",
    visualGuided: "Visual guided report",
    teamField: "Team field report",
    about30: "About 30 seconds",
    showSaw: "Show us what you saw",
    reportIssue: "Report an issue",
    back: "Back",
    change: "Change",
    contributor: "Contributor",
    photoReady: "Photo ready",
    takePhoto: "Take or add a photo",
    tapReplace: "Tap to replace it",
    aiSuggestType: "AI can suggest the issue type",
    whatLooks: "What does it look like?",
    whatHappened: "What happened?",
    approximateLocation: "Approximate location",
    optionalSentence: "Optional: say or type one sentence",
    voiceText: "Voice or text description",
    volunteerPlaceholder: "For example: bags and furniture are blocking the sidewalk…",
    generalPlaceholder: "Describe what you see…",
    demoVoice: "Demo voice note",
    changePhoto: "Change photo",
    addPhoto: "Add photo",
    privacy: "Exact location stays with the ORO. Faces and licence plates should be blurred before long-term storage.",
    letAi: "Let AI organize this",
    reviewSummary: "Review AI summary",
    plainCheck: "Plain-language check",
    contributorCheck: "Contributor confirmation",
    doesRight: "Does this look right?",
    checkSummary: "Check the AI summary",
    cvAnalyzed: "CV demo analyzed",
    textOnly: "Text-only analysis",
    simulatedAi: "Simulated AI output for concept demonstration",
    aiSuggestion: "AI suggestion",
    aiSummary: "AI summary",
    wrongEdit: "Something is wrong — edit it",
    correctLabels: "Correct labels or description",
    sending: "Sending…",
    looksRight: "Looks right — send report",
    confirmSend: "Confirm and send to ORO",
    visibleFollowup: "Visible follow-up",
    reportReceived: "Report received",
    yourUpdates: "Your report updates",
    received: "Received",
    enteredSystem: "Your report entered the planning system",
    noUpdates: "No unresolved updates",
    urgentQueue: "Urgent issues alert the ORO now. This report also enters the next 14-day analysis window.",
    updatesExplain: "New reports will show their review and action status here.",
    reportJourney: "Report journey",
    live: "Live",
    aiLabels: "AI labels",
    queue14: "14-day queue",
    humanNote: "AI organizes the evidence. People still approve any operational change.",
    nothingAttention: "Nothing needs your attention right now.",
    watchMap: "Watch it appear on the map",
    backRoute: "Back to today’s route",
    backTeam: "Back to team overview",
    backVolunteer: "Back to volunteer home",
    team: "Team",
    home: "Home",
    quickReport: "Quick report",
    report: "Report",
    updates: "Updates",
    routeName: "Route 4 · La Amistad",
  },
  es: {
    personalized: "Reporte anónimo",
    welcome: "Bienvenido/a a Ruta Justa",
    oneTap: "1 toque",
    howHelping: "¿Cómo colaboras hoy?",
    roleHint: "Elige la opción que mejor te describa. Podrás elegir de nuevo la próxima vez.",
    notSureLead: "¿No estás seguro/a?",
    notSureAction: "Elige Voluntario/a y te guiaremos.",
    anonymousNote: "Sin registro · reporte anónimo",
    tuesdayRoute: "Ruta del martes",
    greeting: "Buenos días, Ana",
    ecaOpen: "ECA abierta",
    today: "Hoy",
    onSchedule: "A tiempo",
    collectionSummary: "5 zonas de recolección · llegada estimada a la ECA 10:05",
    scheduleNotice: "Aviso de horario",
    noticeText: "La recolección no reciclable puede llegar 20 minutos antes cerca de la Calle 19.",
    reportRouteIssue: "Reportar un problema en la ruta",
    viewUpdates: "Ver actualizaciones",
    switchWorker: "¿No eres reciclador/a? Cambiar rol",
    fieldCoordination: "Coordinación de campo",
    active: "3 activos",
    teamOverview: "Resumen del equipo",
    keepMoving: "Mantén en movimiento los reportes comunitarios",
    coordinateContext: "Coordina reportes sin perder el contexto del territorio.",
    thisMonth: "Este mes",
    unresolved: "Sin resolver",
    urgent: "Urgentes",
    recentTeam: "Actividad reciente del equipo",
    calleReport: "Reporte de la Calle 19",
    sentByTeam: "Enviado por el equipo · hace 18 min",
    queued: "En cola",
    ecaFollowup: "Seguimiento de la ECA",
    reviewedCoordinator: "Revisado por coordinación",
    done: "Listo",
    createFieldReport: "Crear reporte de campo",
    trackTeamReports: "Seguir reportes del equipo",
    switchRole: "Cambiar rol",
    volunteerQuick: "Reporte rápido de voluntariado",
    whatSee: "¿Qué viste?",
    threeSteps: "3 pasos",
    about20: "Unos 20 segundos",
    startVisible: "Empieza con lo que puedes ver",
    photoEnough: "Una foto o una frase corta es suficiente. La IA organizará los detalles.",
    choosePicture: "Elige la imagen más parecida",
    startQuick: "Iniciar reporte rápido",
    trackMine: "Seguir mis reportes",
    visualGuided: "Reporte visual guiado",
    teamField: "Reporte de campo del equipo",
    about30: "Unos 30 segundos",
    showSaw: "Muéstranos lo que viste",
    reportIssue: "Reportar un problema",
    back: "Volver",
    change: "Cambiar",
    contributor: "Colaborador/a",
    photoReady: "Foto lista",
    takePhoto: "Tomar o añadir una foto",
    tapReplace: "Toca para reemplazarla",
    aiSuggestType: "La IA puede sugerir el tipo de problema",
    whatLooks: "¿A qué se parece?",
    whatHappened: "¿Qué ocurrió?",
    approximateLocation: "Ubicación aproximada",
    optionalSentence: "Opcional: di o escribe una frase",
    voiceText: "Descripción por voz o texto",
    volunteerPlaceholder: "Por ejemplo: bolsas y muebles bloquean la acera…",
    generalPlaceholder: "Describe lo que ves…",
    demoVoice: "Nota de voz de ejemplo",
    changePhoto: "Cambiar foto",
    addPhoto: "Añadir foto",
    privacy: "La ubicación exacta permanece con la ORO. Los rostros y matrículas deben difuminarse antes del almacenamiento a largo plazo.",
    letAi: "Dejar que la IA lo organice",
    reviewSummary: "Revisar resumen de IA",
    plainCheck: "Confirmación sencilla",
    contributorCheck: "Confirmación del colaborador",
    doesRight: "¿Esto se ve correcto?",
    checkSummary: "Revisa el resumen de IA",
    cvAnalyzed: "Imagen analizada en la demostración",
    textOnly: "Análisis solo de texto",
    simulatedAi: "Resultado de IA simulado para demostrar el concepto",
    aiSuggestion: "Sugerencia de IA",
    aiSummary: "Resumen de IA",
    wrongEdit: "Algo está mal — editar",
    correctLabels: "Corregir etiquetas o descripción",
    sending: "Enviando…",
    looksRight: "Se ve bien — enviar reporte",
    confirmSend: "Confirmar y enviar a la ORO",
    visibleFollowup: "Seguimiento visible",
    reportReceived: "Reporte recibido",
    yourUpdates: "Actualizaciones de tu reporte",
    received: "Recibido",
    enteredSystem: "Tu reporte entró al sistema de planificación",
    noUpdates: "No hay actualizaciones pendientes",
    urgentQueue: "Los problemas urgentes alertan ahora a la ORO. El reporte también entra al próximo análisis de 14 días.",
    updatesExplain: "Los reportes nuevos mostrarán aquí su estado de revisión y acción.",
    reportJourney: "Recorrido del reporte",
    live: "En vivo",
    aiLabels: "Etiquetas de IA",
    queue14: "Cola de 14 días",
    humanNote: "La IA organiza la evidencia. Las personas aprueban cualquier cambio operativo.",
    nothingAttention: "Nada requiere tu atención en este momento.",
    watchMap: "Verlo aparecer en el mapa",
    backRoute: "Volver a la ruta de hoy",
    backTeam: "Volver al resumen del equipo",
    backVolunteer: "Volver al inicio de voluntariado",
    team: "Equipo",
    home: "Inicio",
    quickReport: "Reporte rápido",
    report: "Reportar",
    updates: "Novedades",
    routeName: "Ruta 4 · La Amistad",
  },
} as const;

const categoryColors: Record<ReportCategory, string> = {
  eca: "#7c3aed",
  blocked: "#c24a42",
  contamination: "#ca8a18",
  schedule: "#0891b2",
  illegal_dumping: "#795548",
};

const analysisStages = [
  { label: "Group reports", detail: "Finding repeated worker signals" },
  { label: "Detect hotspots", detail: "Comparing place, time and urgency" },
  { label: "Test routes", detail: "Checking access and ECA constraints" },
  { label: "Draft proposal", detail: "Preparing a plan for human review" },
];

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
  const [workerRole, setWorkerRole] = useState<ContributorType | null>(null);
  const [workerSession, setWorkerSession] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  function openWorkerPicker() {
    setWorkerRole(null);
    setWorkerSession((value) => value + 1);
    setView("worker");
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <button className="brand" type="button" onClick={openWorkerPicker}>
          <span className="brand-mark"><Route size={19} /></span>
          <span><strong>Ruta Justa Bogotá</strong><small>Los Mártires · interactive demo</small></span>
        </button>
        <nav className="role-switch" aria-label="Demo interface">
          <button type="button" className={view === "worker" ? "active" : ""} onClick={openWorkerPicker}><Users size={16} /> Worker app</button>
          <button type="button" className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><LayoutDashboard size={16} /> Decision dashboard</button>
        </nav>
        <div className="demo-label"><Sparkles size={14} /> Simulated AI demo</div>
      </header>

      {view === "worker" ? (
        <WorkerApp
          key={workerSession}
          selectedRole={workerRole}
          onRoleChange={setWorkerRole}
          onOpenDashboard={() => setView("dashboard")}
          onSubmitted={() => setRefreshToken((value) => value + 1)}
        />
      ) : (
        <DecisionDashboard refreshToken={refreshToken} onOpenWorker={openWorkerPicker} />
      )}
    </main>
  );
}

function WorkerApp({ selectedRole, onRoleChange, onOpenDashboard, onSubmitted }: { selectedRole: ContributorType | null; onRoleChange: (role: ContributorType | null) => void; onOpenDashboard: () => void; onSubmitted: () => void }) {
  const [step, setStep] = useState<WorkerStep>(selectedRole ? "home" : "role");
  const [language, setLanguage] = useState<Language>("es");
  const [category, setCategory] = useState<ReportCategory>("blocked");
  const [description, setDescription] = useState("");
  const [locationIndex, setLocationIndex] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiDraft | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = workerText[language];
  const roleDetails = roleOptions.find((role) => role.id === selectedRole) ?? null;
  const roleCopy = roleDetails ? roleDetails[language] : null;

  function chooseRole(role: ContributorType) {
    onRoleChange(role);
    setCategory(role === "volunteer" ? "illegal_dumping" : "blocked");
    setStep("home");
  }

  function switchRole() {
    onRoleChange(null);
    setCategory("blocked");
    setDescription("");
    setPhoto(null);
    setAnalysis(null);
    setSubmittedId(null);
    setError("");
    setStep("role");
  }

  function startReport(suggestedCategory?: ReportCategory) {
    if (suggestedCategory) setCategory(suggestedCategory);
    setStep("capture");
  }

  useEffect(() => {
    if (!photo) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function startReview() {
    setError("");
    setAnalysis(analyzeDraft(category, description, Boolean(photo)));
    setStep("review");
  }

  async function submitReport() {
    if (!analysis || !selectedRole) return;
    setSubmitting(true);
    setError("");
    try {
      const location = locations[locationIndex];
      const form = new FormData();
      form.set("contributorType", selectedRole);
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
    setStep(selectedRole ? "home" : "role");
    setCategory(selectedRole === "volunteer" ? "illegal_dumping" : "blocked");
    setDescription("");
    setPhoto(null);
    setAnalysis(null);
    setSubmittedId(null);
    setError("");
  }

  const localizedSummary = analysis
    ? language === "en"
      ? analysis.summary
      : `La IA identificó ${categoryUiCopy.es[category].full}${photo ? " a partir de la foto y los datos aportados" : " a partir de los datos aportados"}.${description.trim() ? ` El reporte señala: “${description.trim()}”` : ""}`
    : "";

  return (
    <section className="worker-stage">
      <div className="worker-context">
        <span className="eyebrow">Frontline reporting</span>
        <h1>One reporting system, three ways in.</h1>
        <p>Workers, organizations and volunteers enter through role-specific home screens, while every verified report reaches the same planning system.</p>
        <div className="context-flow">
          <div><span>1</span><p><strong>Choose a role</strong><small>The app shows only the tools that person needs</small></p></div>
          <div><span>2</span><p><strong>Use visual guidance</strong><small>Photo, icons, voice and plain-language confirmation</small></p></div>
          <div><span>3</span><p><strong>Join one shared queue</strong><small>Urgent alert now; planning review every 14 days</small></p></div>
        </div>
        <button className="secondary-button desktop-only" type="button" onClick={onOpenDashboard}>Open decision dashboard <ArrowRight size={16} /></button>
      </div>

      <div className="phone-frame" aria-label="Worker mobile application">
        <div className="phone-screen">
          <div className="phone-status"><span>8:42</span><div className="language-toggle" role="group" aria-label="Language"><button type="button" className={language === "es" ? "active" : ""} onClick={() => setLanguage("es")}>ES</button><button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button></div></div>
          <input ref={inputRef} hidden type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />

          {step === "role" && (
            <div className="phone-view role-onboarding">
              <div className="mobile-header"><div><span>{copy.personalized}</span><h2>{copy.welcome}</h2></div><span className="status-pill success">{copy.oneTap}</span></div>
              <div className="mobile-content role-select-content">
                <h3>{copy.howHelping}</h3>
                <p>{copy.roleHint}</p>
                <div className="role-card-list">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    const localizedRole = role[language];
                    return <button key={role.id} type="button" onClick={() => chooseRole(role.id)}><span className={"role-card-icon " + role.id}><Icon size={20} /></span><span><strong>{localizedRole.label}</strong><em>{localizedRole.description}</em></span><ChevronRight size={18} /></button>;
                  })}
                </div>
                <button className="unsure-link" type="button" onClick={() => chooseRole("volunteer")}><strong>{copy.notSureLead}</strong> {copy.notSureAction}</button>
                <div className="role-assurance"><EyeOff size={15} /><span>{copy.anonymousNote}</span></div>
              </div>
            </div>
          )}

          {step === "home" && selectedRole === "reciclador" && (
            <div className="phone-view">
              <div className="mobile-header"><div><span>{copy.tuesdayRoute}</span><h2>{copy.greeting}</h2></div><span className="status-pill success">{copy.ecaOpen}</span></div>
              <div className="mobile-content">
                <article className="route-card">
                  <div className="card-heading"><div><span>{copy.today}</span><h3>{copy.routeName}</h3></div><span className="status-pill success">{copy.onSchedule}</span></div>
                  <p>{copy.collectionSummary}</p>
                  <div className="mini-route"><span>S</span><i></i><span>C</span><i></i><span className="eca-node">E</span></div>
                </article>
                <article className="notice-card"><CircleAlert size={18} /><div><strong>{copy.scheduleNotice}</strong><p>{copy.noticeText}</p></div></article>
                <button className="primary-button full" type="button" onClick={() => startReport()}><Upload size={17} /> {copy.reportRouteIssue}</button>
                <button className="text-button full" type="button" onClick={() => setStep("submitted")}><MessageSquareText size={16} /> {copy.viewUpdates}</button>
                <button className="role-switch-link" type="button" onClick={switchRole}>{copy.switchWorker}</button>
              </div>
            </div>
          )}

          {step === "home" && selectedRole === "organization" && (
            <div className="phone-view">
              <div className="mobile-header"><div><span>{copy.fieldCoordination}</span><h2>Comunidad Circular</h2></div><span className="status-pill success">{copy.active}</span></div>
              <div className="mobile-content role-home-content">
                <article className="role-hero-card organization"><span><Users size={20} /></span><div><small>{copy.teamOverview}</small><h3>{copy.keepMoving}</h3><p>{copy.coordinateContext}</p></div></article>
                <div className="organization-metrics"><div><strong>12</strong><span>{copy.thisMonth}</span></div><div><strong>3</strong><span>{copy.unresolved}</span></div><div><strong className="urgent-number">2</strong><span>{copy.urgent}</span></div></div>
                <h3 className="section-label">{copy.recentTeam}</h3>
                <div className="team-activity"><div><span className="feed-icon"><MapPin size={15} /></span><p><strong>{copy.calleReport}</strong><small>{copy.sentByTeam}</small></p><b>{copy.queued}</b></div><div><span className="feed-icon"><CheckCircle2 size={15} /></span><p><strong>{copy.ecaFollowup}</strong><small>{copy.reviewedCoordinator}</small></p><b>{copy.done}</b></div></div>
                <button className="primary-button full" type="button" onClick={() => startReport()}><Upload size={17} /> {copy.createFieldReport}</button>
                <button className="text-button full" type="button" onClick={() => setStep("submitted")}><MessageSquareText size={16} /> {copy.trackTeamReports}</button>
                <button className="role-switch-link" type="button" onClick={switchRole}>{copy.switchRole}</button>
              </div>
            </div>
          )}

          {step === "home" && selectedRole === "volunteer" && (
            <div className="phone-view">
              <div className="mobile-header"><div><span>{copy.volunteerQuick}</span><h2>{copy.whatSee}</h2></div><span className="status-pill success">{copy.threeSteps}</span></div>
              <div className="mobile-content role-home-content volunteer-home">
                <article className="role-hero-card volunteer"><span><Camera size={22} /></span><div><small>{copy.about20}</small><h3>{copy.startVisible}</h3><p>{copy.photoEnough}</p></div></article>
                <span className="visual-prompt-label">{copy.choosePicture}</span>
                <div className="visual-issue-grid">
                  <button type="button" onClick={() => startReport("blocked")}><ShieldAlert size={22} /><strong>{categoryUiCopy[language].blocked.volunteerShort}</strong><small>{categoryUiCopy[language].blocked.volunteerDescription}</small></button>
                  <button type="button" onClick={() => startReport("illegal_dumping")}><Trash2 size={22} /><strong>{categoryUiCopy[language].illegal_dumping.volunteerShort}</strong><small>{categoryUiCopy[language].illegal_dumping.volunteerDescription}</small></button>
                  <button type="button" onClick={() => startReport("eca")}><Warehouse size={22} /><strong>{categoryUiCopy[language].eca.volunteerShort}</strong><small>{categoryUiCopy[language].eca.volunteerDescription}</small></button>
                  <button type="button" onClick={() => startReport("schedule")}><Clock3 size={22} /><strong>{categoryUiCopy[language].schedule.volunteerShort}</strong><small>{categoryUiCopy[language].schedule.volunteerDescription}</small></button>
                </div>
                <button className="primary-button full" type="button" onClick={() => startReport()}><Camera size={17} /> {copy.startQuick}</button>
                <button className="text-button full" type="button" onClick={() => setStep("submitted")}><MessageSquareText size={16} /> {copy.trackMine}</button>
                <button className="role-switch-link" type="button" onClick={switchRole}>{copy.switchRole}</button>
              </div>
            </div>
          )}

          {step === "capture" && (
            <div className="phone-view">
              <div className="mobile-header compact"><button className="icon-button" type="button" onClick={() => setStep("home")} aria-label={copy.back}><ArrowLeft size={18} /></button><div><span>{selectedRole === "volunteer" ? copy.visualGuided : selectedRole === "organization" ? copy.teamField : copy.about30}</span><h2>{selectedRole === "volunteer" ? copy.showSaw : copy.reportIssue}</h2></div><span>1 / 2</span></div>
              <div className="mobile-content capture-content">
                <div className="selected-role-strip"><span>{roleCopy?.label ?? copy.contributor}</span><button type="button" onClick={switchRole}>{copy.change}</button></div>
                {selectedRole === "volunteer" && (
                  <button className={"volunteer-camera-card " + (photo ? "has-photo" : "")} type="button" onClick={() => inputRef.current?.click()}>
                    {photoUrl ? <img src={photoUrl} alt={copy.photoReady} /> : <span><Camera size={25} /></span>}
                    <div><strong>{photo ? copy.photoReady : copy.takePhoto}</strong><small>{photo ? copy.tapReplace : copy.aiSuggestType}</small></div>
                    <ChevronRight size={18} />
                  </button>
                )}
                <label className="field-label">{selectedRole === "volunteer" ? copy.whatLooks : copy.whatHappened}</label>
                <div className="category-grid">
                  {categories.map((item) => {
                    const Icon = item.icon;
                    const categoryText = categoryUiCopy[language][item.id];
                    const displayText = selectedRole === "volunteer"
                      ? { short: categoryText.volunteerShort, description: categoryText.volunteerDescription }
                      : { short: categoryText.short, description: categoryText.description };
                    return <button key={item.id} type="button" className={category === item.id ? "selected" : ""} onClick={() => setCategory(item.id)}><Icon size={18} /><strong>{displayText.short}</strong><small>{displayText.description}</small></button>;
                  })}
                </div>
                <label className="field-label" htmlFor="report-location">{copy.approximateLocation}</label>
                <select id="report-location" className="select-input" value={locationIndex} onChange={(event) => setLocationIndex(Number(event.target.value))}>
                  {locations.map((location, index) => <option value={index} key={location.label}>{language === "es" ? location.labelEs : location.label}</option>)}
                </select>
                <label className="field-label" htmlFor="report-description">{selectedRole === "volunteer" ? copy.optionalSentence : copy.voiceText}</label>
                <textarea id="report-description" className="text-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={selectedRole === "volunteer" ? copy.volunteerPlaceholder : copy.generalPlaceholder} rows={3} />
                <div className={"input-actions " + (selectedRole === "volunteer" ? "single" : "")}>
                  <button className="secondary-button" type="button" onClick={() => setDescription(language === "es" ? "La calle está bloqueada por bolsas negras y muebles. Es difícil pasar con la carreta." : "The street is blocked by black bags and furniture. It is hard to pass with the cart.")}><Mic size={16} /> {copy.demoVoice}</button>
                  {selectedRole !== "volunteer" && <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}><Camera size={16} /> {photo ? copy.changePhoto : copy.addPhoto}</button>}
                </div>
                {photoUrl && selectedRole !== "volunteer" && <div className="photo-preview"><img src={photoUrl} alt={copy.photoReady} /><button type="button" onClick={() => setPhoto(null)} aria-label={copy.changePhoto}><X size={16} /></button></div>}
                <div className="privacy-note"><EyeOff size={16} /><span>{copy.privacy}</span></div>
                <button className="primary-button full" type="button" onClick={startReview}>{selectedRole === "volunteer" ? copy.letAi : copy.reviewSummary} <ChevronRight size={17} /></button>
              </div>
            </div>
          )}

          {step === "review" && analysis && (
            <div className="phone-view">
              <div className="mobile-header compact"><button className="icon-button" type="button" onClick={() => setStep("capture")} aria-label={copy.back}><ArrowLeft size={18} /></button><div><span>{selectedRole === "volunteer" ? copy.plainCheck : copy.contributorCheck}</span><h2>{selectedRole === "volunteer" ? copy.doesRight : copy.checkSummary}</h2></div><span>2 / 2</span></div>
              <div className="mobile-content">
                {photoUrl ? <div className="review-photo"><img src={photoUrl} alt={copy.reviewSummary} /><span><ScanSearch size={15} /> {copy.cvAnalyzed}</span></div> : <div className="no-photo"><ImageIcon size={22} /><span>{copy.textOnly}</span></div>}
                <div className="ai-disclaimer"><Sparkles size={16} /><span>{copy.simulatedAi}</span></div>
                <div className="tag-list">
                  {analysis.tags.map((tag) => {
                    const tagLabel = language === "es" ? aiTagSpanish[tag.label] ?? tag.label : tag.label;
                    return <span key={tag.source + tag.label}><strong>{tagLabel}</strong><small>{selectedRole === "volunteer" ? `${copy.aiSuggestion} · ${tag.source}` : `${Math.round(tag.confidence * 100)}% · ${tag.source}`}</small></span>;
                  })}
                </div>
                <article className="summary-box"><span>{copy.aiSummary}</span><p>{localizedSummary}</p></article>
                <button className="text-button full" type="button" onClick={() => setStep("capture")}><FileText size={16} /> {selectedRole === "volunteer" ? copy.wrongEdit : copy.correctLabels}</button>
                {error && <p className="error-message">{error}</p>}
                <button className="primary-button full" type="button" disabled={submitting} onClick={submitReport}>{submitting ? <><RefreshCw className="spin" size={16} /> {copy.sending}</> : <><Check size={17} /> {selectedRole === "volunteer" ? copy.looksRight : copy.confirmSend}</>}</button>
              </div>
            </div>
          )}

          {step === "submitted" && (
            <div className="phone-view">
              <div className="mobile-header"><div><span>{copy.visibleFollowup}</span><h2>{submittedId ? copy.reportReceived : copy.yourUpdates}</h2></div><span className="status-pill success">{copy.received}</span></div>
              <div className="mobile-content submitted-content">
                <div className="success-mark"><Check size={26} /></div>
                <h3>{submittedId ? copy.enteredSystem : copy.noUpdates}</h3>
                <p>{submittedId ? copy.urgentQueue : copy.updatesExplain}</p>
                {submittedId && <div className="report-id">{submittedId.slice(0, 20)}</div>}
                {submittedId ? (
                  <div className="report-journey" aria-label={copy.reportJourney}>
                    <div className="journey-heading"><span><Sparkles size={13} /> {copy.reportJourney}</span><strong>{copy.live.toUpperCase()}</strong></div>
                    <div className="journey-track">
                      <div className="journey-step"><b><Check size={13} /></b><span>{copy.received}</span></div>
                      <div className="journey-step"><b><Sparkles size={13} /></b><span>{copy.aiLabels}</span></div>
                      <div className="journey-step"><b><Users size={13} /></b><span>ORO</span></div>
                      <div className="journey-step"><b><CalendarClock size={13} /></b><span>{copy.queue14}</span></div>
                    </div>
                    <p>{copy.humanNote}</p>
                  </div>
                ) : (
                  <div className="empty-update"><CheckCircle2 size={19} /><span>{copy.nothingAttention}</span></div>
                )}
                {submittedId && <button className="primary-button full" type="button" onClick={onOpenDashboard}>{copy.watchMap} <ArrowRight size={17} /></button>}
                <button className="text-button full" type="button" onClick={reset}>{selectedRole === "reciclador" ? copy.backRoute : selectedRole === "organization" ? copy.backTeam : copy.backVolunteer}</button>
              </div>
            </div>
          )}

          {selectedRole && step !== "role" && (
            <nav className="mobile-nav" aria-label={copy.contributorCheck}>
              <button type="button" className={step === "home" ? "active" : ""} onClick={() => setStep("home")}><Route size={17} /><span>{selectedRole === "reciclador" ? copy.today : selectedRole === "organization" ? copy.team : copy.home}</span></button>
              <button type="button" className={step === "capture" || step === "review" ? "active" : ""} onClick={() => setStep("capture")}>{selectedRole === "volunteer" ? <Camera size={17} /> : <Upload size={17} />}<span>{selectedRole === "volunteer" ? copy.quickReport : copy.report}</span></button>
              <button type="button" className={step === "submitted" ? "active" : ""} onClick={() => setStep("submitted")}><MessageSquareText size={17} /><span>{copy.updates}</span></button>
            </nav>
          )}
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
  const [generationStage, setGenerationStage] = useState(0);
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
    setGenerationStage(0);
    setError("");
    const stageTimers = analysisStages.slice(1).map((_, index) => window.setTimeout(() => setGenerationStage(index + 1), (index + 1) * 600));
    try {
      const responsePromise = fetch("/api/analysis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ force: true }) });
      const [response] = await Promise.all([
        responsePromise,
        new Promise<void>((resolve) => window.setTimeout(resolve, 2400)),
      ]);
      const data = await response.json() as { plan?: PlanRecord; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to generate plan");
      await load();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Unable to generate plan");
    } finally {
      stageTimers.forEach((timer) => window.clearTimeout(timer));
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

      {refreshToken > 0 && !generating && (
        <div className="arrival-banner" role="status">
          <span><CheckCircle2 size={18} /></span>
          <div><strong>Worker report received</strong><p>It is now visible on the map, included in the AI pattern queue and waiting for the next 14-day review.</p></div>
          <b>NEW INPUT</b>
        </div>
      )}

      {generating && (
        <section className="ai-runner" aria-live="polite" aria-label="AI biweekly analysis progress">
          <div className="ai-runner-heading">
            <span className="ai-orbit"><Sparkles size={18} /></span>
            <div><small>SIMULATED BIWEEKLY AI CYCLE</small><strong>{analysisStages[generationStage].label}</strong><p>{analysisStages[generationStage].detail}</p></div>
            <b>{generationStage + 1} / {analysisStages.length}</b>
          </div>
          <div className="ai-runner-progress"><i style={{ width: String(((generationStage + 1) / analysisStages.length) * 100) + "%" }} /></div>
          <div className="ai-stage-list">
            {analysisStages.map((stage, index) => <span key={stage.label} className={index < generationStage ? "complete" : index === generationStage ? "active" : ""}><i>{index < generationStage ? <Check size={12} /> : index + 1}</i>{stage.label}</span>)}
          </div>
          <p className="human-review-note">AI generates a proposal—not an automatic route change. ORO and UAESP review the evidence before any pilot.</p>
        </section>
      )}

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
                {recentReports.map((report, index) => <article key={report.id} className={[report.status === "urgent_alert" ? "urgent" : "", index === 0 && refreshToken > 0 ? "new-arrival" : ""].filter(Boolean).join(" ")}>
                  <span className="feed-icon" style={{ color: categoryColors[report.category], background: categoryColors[report.category] + "18" }}><MapPin size={15} /></span>
                  <div><div><strong>{categoryCopy[report.category].short}</strong>{index === 0 && refreshToken > 0 && <b className="arrival-pill">New</b>}<small>{formatDate(report.createdAt, true)}</small></div><p>{report.locationLabel}</p><span>{report.aiConfidence}% confidence · {report.status.replace("_", " ")}</span></div>
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
        style: { color: "#17365f", weight: 2, opacity: 0.72, fillColor: "#2563eb", fillOpacity: 0.065 },
        interactive: false,
      }).addTo(map);

      const currentRoute = routeCoordinates(mapData.options.baseline_id).map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
      leaflet.polyline(currentRoute, { color: "#ffffff", weight: 10, opacity: 0.9, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
      leaflet.polyline(currentRoute, { color: "#2563eb", weight: 5.5, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);

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
        proposedRouteRef.current = leaflet.polyline(proposed, { color: "#7c3aed", weight: 5, opacity: 0.95, dashArray: "11 8", className: "ai-proposed-route", lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
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
      proposedRouteRef.current = leaflet.polyline(proposed, { color: "#7c3aed", weight: 5, opacity: 0.95, dashArray: "11 8", className: "ai-proposed-route", lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
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
