import { RECIPES, CATEGORIES, DIET_LABEL, SEASONS, KAIA_LABEL, quarterOf, activeRecipes } from "./recipes.js";
import { WEEKS, GOAL_WEEK, PLAN_START, PLAN_VERSION, sessionsFor, weekLabel, PEOPLE } from "./training.js";
import { EXERCISES, illustration } from "./exercises.js";
import { parseHealthText, matchWorkouts, workoutCategory, fmtWorkout } from "./health.js";

// ---------- Speicher ----------
const KEY = "gis-state-v1";
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const wd = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - wd);
  return d;
}
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtDate = (d) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

function defaultState() {
  return {
    profile: "rohat",
    startDate: PLAN_START,
    planVersion: PLAN_VERSION,
    repeats: { rohat: [], steffi: [] },
    done: { rohat: {}, steffi: {} },
    meals: {},      // { "YYYY-MM-DD"(Montag): { Mo: [{rid, servings}], ... } }
    shopping: {},   // { weekKey: { checked:{}, pantry:{}, sent:{}, extra:[] } }
    shortcutName: "Einkauf an Erinnerungen",
    householdServings: 2,
    weights: { rohat: [], steffi: [] },        // [{ date: "YYYY-MM-DD", kg }]
    weightGoal: { rohat: 85, steffi: null },
    // Apple Health (über Kurzbefehl): Tageswerte, Workouts, letzter Abgleich
    health: { rohat: { days: {}, workouts: [], lastSync: null }, steffi: { days: {}, workouts: [], lastSync: null } },
    healthShortcutName: "Health an Get in Shape",
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const s = { ...defaultState(), ...saved };
      // Neuer Plan: Start 09.11.2026, alte Bestätigungen bleiben als Historie
      if (saved.planVersion !== PLAN_VERSION) {
        s.startDate = PLAN_START;
        s.repeats = { rohat: [], steffi: [] };
        s.planVersion = PLAN_VERSION;
      }
      return s;
    }
  } catch (e) { /* privater Modus o. ä. */ }
  return defaultState();
}
let state = load();
save();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
}

// UI-Zustand (nicht gespeichert)
const ui = {
  tab: "training",
  trainingCal: null,
  mealWeek: iso(mondayOf(new Date())),
  recipeFilter: "alle",
};

// ---------- Helfer ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const recipeById = (id) => RECIPES.find((r) => r.id === id);
const isVeg = (r) => r.diet === "vegan" || r.diet === "vegetarisch";
const icon = (name, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

function fmtQty(q) {
  if (q == null) return "";
  const whole = Math.floor(q + 1e-9);
  const frac = Math.round((q - whole) * 100) / 100;
  const fr = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[frac];
  if (fr) return (whole ? whole : "") + fr;
  return (Math.round(q * 10) / 10).toLocaleString("de-DE");
}
function fmtAmount(q, unit) {
  if (q == null) return unit ? `Menge lt. Rezept` : "";
  return `${fmtQty(q)}${unit ? " " + unit : ""}`;
}
function scaleQty(q, unit, factor) {
  if (q == null) return null;
  const v = q * factor;
  // Zählbares auf Viertel aufrunden, Gewichte auf ganze Zahlen
  if (["g", "ml"].includes(unit)) return Math.round(v);
  return Math.ceil(v * 4 - 1e-9) / 4;
}

// ---------- Training ----------
// Kalenderwoche c (1, 2, …) ab Startdatum → Planwoche. „Woche wiederholen“
// fügt die Planwoche ein weiteres Mal ein; Bestätigungen gelten je Kalenderwoche.
function planSeq(person) {
  const reps = state.repeats[person] || [];
  const seq = [];
  for (let w = 1; w <= WEEKS[person]; w++) {
    seq.push(w);
    for (const r of reps) if (r === w) seq.push(w);
  }
  return seq;
}
function todayCal() {
  const diff = Math.floor((mondayOf(new Date()) - parseIso(state.startDate)) / (7 * 864e5));
  return diff + 1; // < 1: Plan hat noch nicht begonnen
}
const clampCal = (person, c) => Math.min(planSeq(person).length, Math.max(1, c));
const doneKey = (c, id) => `c${c}:${id}`;
const isDone = (person, c, id) => state.done[person][doneKey(c, id)];

function weekComplete(person, c) {
  const w = planSeq(person)[c - 1];
  if (!w) return false;
  return sessionsFor(person, w).filter((s) => !s.optional).every((s) => isDone(person, c, s.id));
}
function streak(person) {
  let c = clampCal(person, todayCal());
  if (!weekComplete(person, c)) c--;
  let n = 0;
  while (c >= 1 && weekComplete(person, c)) { n++; c--; }
  return n;
}
function totalDone(person) {
  return Object.keys(state.done[person] || {}).length;
}
function goalDate() {
  const c = planSeq("rohat").indexOf(GOAL_WEEK) + 1;
  return addDays(parseIso(state.startDate), (c - 1) * 7 + 6);
}

function renderTraining() {
  const p = state.profile;
  const seq = planSeq(p);
  const c = ui.trainingCal ?? clampCal(p, todayCal());
  ui.trainingCal = c;
  const w = seq[c - 1];
  const start = addDays(parseIso(state.startDate), (c - 1) * 7);
  const sessions = sessionsFor(p, w);
  const required = sessions.filter((s) => !s.optional);
  const doneReq = required.filter((s) => isDone(p, c, s.id)).length;
  const pct = Math.round((doneReq / required.length) * 100);
  const now = todayCal();
  const isCurrent = c === now;
  const isRepeat = c > 1 && seq[c - 2] === w;
  const other = p === "rohat" ? "steffi" : "rohat";
  const title = p === "rohat" && w > GOAL_WEEK ? `Erhaltung · Woche ${w - GOAL_WEEK}` : `Woche ${w} von ${p === "rohat" ? GOAL_WEEK : WEEKS[p]}`;
  const extra = [weekLabel(p, w), isRepeat ? "Wiederholung" : ""].filter(Boolean).join(" · ");

  let banner = "";
  if (now < 1) {
    banner = `<div class="banner">${icon("info")}<div>Der Plan startet am <b>Mo ${parseIso(state.startDate).toLocaleDateString("de-DE")}</b>. Bis dahin: schönen Urlaub! Die Einheiten kannst du dir schon ansehen.</div></div>`;
  } else if (p === "rohat") {
    const gd = goalDate();
    const left = Math.ceil((gd - new Date()) / (7 * 864e5));
    banner = left > 0
      ? `<div class="banner">${icon("target")}<div><b>20 km</b> am So ${gd.toLocaleDateString("de-DE")} · noch ${left} ${left === 1 ? "Woche" : "Wochen"}</div></div>`
      : `<div class="banner">${icon("target")}<div>Zielwoche geschafft – jetzt <b>Erhaltung</b>: regelmäßig 20 km halten.</div></div>`;
  }

  return `
    ${banner}
    <div class="weeknav">
      <button data-act="tweek" data-d="-1" ${c <= 1 ? "disabled" : ""} aria-label="Vorherige Woche">${icon("chevron-left")}</button>
      <div class="label"><strong>${title}</strong>
        <span>${fmtDate(start)} – ${fmtDate(addDays(start, 6))}${extra ? " · " + extra : ""}${isCurrent ? " · aktuell" : ""}</span></div>
      <button data-act="tweek" data-d="1" ${c >= seq.length ? "disabled" : ""} aria-label="Nächste Woche">${icon("chevron-right")}</button>
    </div>

    <div class="card">
      <div class="progress">
        <div class="bar"><i style="width:${pct}%"></i></div>
        <b>${doneReq}/${required.length}</b>
      </div>
      <div class="stats">
        <div class="stat"><b>${streak(p)}</b><span>Wochen-Serie</span></div>
        <div class="stat"><b>${totalDone(p)}</b><span>Einheiten gesamt</span></div>
        <div class="stat"><b>${weekComplete(other, c) ? "✓" : "–"}</b><span>${PEOPLE[other]} diese Woche*</span></div>
      </div>
    </div>

    ${weightCard(p)}
    ${activityCard(p, c)}

    <div class="section-title">Einheiten</div>
    ${(() => { const hs = healthSuggestions(p, c); return sessions.map((s) => sessionCard(p, c, s, hs[s.id])).join(""); })()}
    ${isCurrent ? `<div class="btn-stack"><button class="btn block" data-act="repeat-week">${icon("repeat")}Diese Woche nächste Woche wiederholen</button></div>` : ""}
    <p class="hint mt-4">Optionale Einheiten zählen nicht für die Serie.${p === "rohat" ? " Knie-Regel: Schmerz, Schwellung oder Wegknick-Gefühl → Pause und Woche wiederholen." : ""}<br>
    * Zeigt nur, was auf <em>diesem</em> iPhone abgehakt wurde.</p>`;
}

// ---------- Gewicht ----------
const fmtKg = (kg) => kg.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const weightsOf = (p) => [...(state.weights[p] || [])].sort((a, b) => a.date.localeCompare(b.date));

function weeklyAverages(entries) {
  const m = new Map();
  for (const e of entries) {
    const k = iso(mondayOf(parseIso(e.date)));
    (m.get(k) || m.set(k, []).get(k)).push(e.kg);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, list]) => ({ week, kg: list.reduce((x, y) => x + y, 0) / list.length }));
}

function weightSpark(avgs, goal) {
  if (avgs.length < 2) return "";
  const pts = avgs.slice(-12), W = 300, H = 64, pad = 6;
  // Skala nur aus dem Verlauf, damit kleine Fortschritte sichtbar bleiben
  const vals = pts.map((a) => a.kg);
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5;
  if (goal && (goal < min || goal > max)) goal = null;
  const x = (i) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (H - 2 * pad);
  const line = pts.map((a, i) => `${x(i).toFixed(1)},${y(a.kg).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Verlauf Wochendurchschnitt">
    ${goal ? `<line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" class="goal-line"/>` : ""}
    <polyline points="${line}" class="spark-line"/>
    <circle cx="${x(pts.length - 1)}" cy="${y(last.kg)}" r="3.5" class="spark-dot"/>
  </svg>`;
}

function weightCard(p) {
  const list = weightsOf(p);
  const goal = state.weightGoal[p];
  if (!list.length) {
    return `<div class="card weight">
      <div class="w-head"><b>Gewicht</b>${goal ? `<span class="hint">Ziel ${fmtKg(goal)} kg</span>` : ""}</div>
      <p class="hint mt-2">Einmal pro Woche morgens nüchtern wiegen. Die App zeigt den Wochendurchschnitt – Tagesschwankungen von 1–2 kg sind normal.</p>
      <button class="btn block" data-act="weight-add">${icon("plus")}Gewicht eintragen</button>
    </div>`;
  }
  const first = list[0].kg, latest = list[list.length - 1].kg;
  const avgs = weeklyAverages(list);
  const avg = avgs[avgs.length - 1].kg;
  const lost = first - avg;
  const pct = goal && first > goal ? Math.max(0, Math.min(100, Math.round(((first - avg) / (first - goal)) * 100))) : null;
  return `<div class="card weight">
    <div class="w-head"><b>Gewicht</b><button class="btn ghost small" data-act="weight-add">${icon("plus", "sm")}Eintragen</button></div>
    <div class="stats w-stats">
      <div class="stat"><b>${fmtKg(avg)}</b><span>Wochen-Ø</span></div>
      <div class="stat"><b>${lost >= 0 ? "−" : "+"}${fmtKg(Math.abs(lost))}</b><span>seit Start (${fmtKg(first)})</span></div>
      <div class="stat"><b>${goal ? fmtKg(Math.max(0, avg - goal)) : "–"}</b><span>${goal ? `bis Ziel ${fmtKg(goal)}` : "kein Ziel"}</span></div>
    </div>
    ${pct !== null ? `<div class="progress mt-4"><div class="bar"><i style="width:${pct}%"></i></div><b>${pct} %</b></div>` : ""}
    ${weightSpark(avgs, goal)}
    <p class="hint mt-2">Letzter Eintrag: ${fmtKg(latest)} kg am ${parseIso(list[list.length - 1].date).toLocaleDateString("de-DE")}</p>
  </div>`;
}

function openWeightSheet() {
  const p = state.profile;
  const list = weightsOf(p).reverse();
  openSheet(`Gewicht ${PEOPLE[p]}`, `
    <label class="field-label" for="w-date">Datum</label>
    <input type="date" id="w-date" value="${iso(new Date())}">
    <label class="field-label mt-4" for="w-kg">Gewicht in kg</label>
    <input type="text" id="w-kg" inputmode="decimal" placeholder="z. B. 104,6" autocomplete="off">
    <label class="field-label mt-4" for="w-goal">Zielgewicht in kg (optional)</label>
    <input type="text" id="w-goal" inputmode="decimal" value="${state.weightGoal[p] ? fmtKg(state.weightGoal[p]) : ""}" autocomplete="off">
    <div class="btn-stack"><button class="btn primary block" id="w-save">Speichern</button></div>
    ${list.length ? `<div class="section-title">Einträge</div>
      <div class="card list-group">${list.map((e) => `
        <div class="item"><label>${parseIso(e.date).toLocaleDateString("de-DE")}</label><span class="qty">${fmtKg(e.kg)} kg</span>
          <button class="icon-btn" data-wdel="${e.date}" aria-label="Eintrag löschen">${icon("x")}</button></div>`).join("")}
      </div>` : ""}`);
  const sheet = $("#sheet");
  const num = (v) => parseFloat(String(v).replace(",", "."));
  $("#w-save", sheet).addEventListener("click", () => {
    const date = $("#w-date", sheet).value || iso(new Date());
    const kgRaw = $("#w-kg", sheet).value.trim();
    const goalRaw = $("#w-goal", sheet).value.trim();
    if (kgRaw) {
      const kg = num(kgRaw);
      if (!(kg > 30 && kg < 300)) { toast("Bitte ein gültiges Gewicht eingeben"); return; }
      state.weights[p] = (state.weights[p] || []).filter((e) => e.date !== date).concat({ date, kg: Math.round(kg * 10) / 10 });
    }
    if (goalRaw) {
      const g = num(goalRaw);
      if (!(g > 30 && g < 300)) { toast("Bitte ein gültiges Zielgewicht eingeben"); return; }
      state.weightGoal[p] = Math.round(g * 10) / 10;
    } else state.weightGoal[p] = null;
    save(); closeSheet(); render(); toast("Gespeichert");
  });
  sheet.querySelectorAll("[data-wdel]").forEach((b) => b.addEventListener("click", () => {
    if (!confirm("Diesen Eintrag löschen?")) return;
    state.weights[p] = state.weights[p].filter((e) => e.date !== b.dataset.wdel);
    save(); render(); openWeightSheet();
  }));
}

// ---------- Apple Health ----------
const healthOf = (p) => state.health[p] || (state.health[p] = { days: {}, workouts: [], lastSync: null });
const weekdayOf = (d) => (parseIso(d).getDay() + 6) % 7;
const fmtInt = (n) => Math.round(n).toLocaleString("de-DE");

function weekWorkouts(p, c) {
  const start = addDays(parseIso(state.startDate), (c - 1) * 7);
  const from = iso(start), to = iso(addDays(start, 6));
  return healthOf(p).workouts.filter((w) => w.date >= from && w.date <= to);
}
function healthSuggestions(p, c) {
  const w = planSeq(p)[c - 1];
  const used = new Set(Object.values(state.done[p]).map((l) => l.healthKey).filter(Boolean));
  const ws = weekWorkouts(p, c).filter((x) => !used.has(x.key));
  if (!w || !ws.length) return {};
  return matchWorkouts(sessionsFor(p, w), ws, (id) => !isDone(p, c, id), weekdayOf);
}

function activityCard(p, c) {
  const h = healthOf(p);
  const hasData = h.lastSync || h.workouts.length || Object.keys(h.days).length;
  if (!hasData && p !== "rohat") return "";
  if (!hasData) {
    return `<div class="card activity">
      <div class="w-head"><b>Apple Health</b></div>
      <p class="hint mt-2">Gewicht, Workouts, Schritte und Kalorien automatisch übernehmen – einmalig den Kurzbefehl unter <b>Mehr</b> einrichten.</p>
      <button class="btn block" data-act="health-sync">${icon("repeat")}Health abgleichen</button>
    </div>`;
  }
  const start = addDays(parseIso(state.startDate), (c - 1) * 7);
  const dates = Array.from({ length: 7 }, (_, i) => iso(addDays(start, i))).filter((d) => d <= iso(new Date()));
  const days = dates.map((d) => h.days[d]).filter(Boolean);
  const avg = (f) => { const v = days.map((d) => d[f]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const steps = avg("steps"), active = avg("active"), basal = avg("basal");
  const total = active != null && basal != null ? active + basal : null;
  const ws = weekWorkouts(p, c);
  const runKm = ws.filter((w) => workoutCategory(w.type) === "lauf").reduce((a, w) => a + (w.km || 0), 0);
  return `<div class="card activity">
    <div class="w-head"><b>Aktivität (Apple Health)</b><button class="btn ghost small" data-act="health-sync">${icon("repeat", "sm")}Abgleichen</button></div>
    <div class="stats w-stats">
      <div class="stat"><b>${steps != null ? fmtInt(steps) : "–"}</b><span>Ø Schritte</span></div>
      <div class="stat"><b>${active != null ? fmtInt(active) : "–"}</b><span>Ø aktive kcal</span></div>
      <div class="stat"><b>${runKm ? runKm.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : "0"}</b><span>km gelaufen</span></div>
    </div>
    ${total != null ? `<p class="hint mt-4">Ø Verbrauch <b>${fmtInt(total)} kcal/Tag</b> (aktiv + Ruhe). Richtwert fürs Abnehmen: ca. <b>${fmtInt(Math.max(1500, total - 600))} kcal</b> essen (≈ 600 kcal Defizit).</p>` : ""}
    ${steps != null && steps < 8000 ? `<p class="hint">Schrittziel 8.000–10.000 – noch ${fmtInt(8000 - steps)} pro Tag bis zur Untergrenze.</p>` : ""}
    <p class="hint">${ws.length} Workout${ws.length === 1 ? "" : "s"} diese Woche · letzter Abgleich ${h.lastSync ? new Date(h.lastSync).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "–"}</p>
  </div>`;
}

function runHealthShortcut() {
  ui.awaitHealth = true;
  window.location.href = "shortcuts://run-shortcut?name=" + encodeURIComponent(state.healthShortcutName);
}

function importHealth(text) {
  const p = state.profile;
  const data = parseHealthText(text);
  const h = healthOf(p);
  // Gewicht: pro Tag die früheste Messung (morgens)
  const byDay = {};
  for (const w of data.weights.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))) byDay[w.date] ||= w;
  const wList = Object.values(byDay);
  state.weights[p] = (state.weights[p] || []).filter((e) => !byDay[e.date]).concat(wList.map((w) => ({ date: w.date, kg: w.kg, src: "health" })));
  for (const [d, v] of Object.entries(data.days)) h.days[d] = { ...h.days[d], ...v };
  const keys = new Set(h.workouts.map((w) => w.key));
  const newW = data.workouts.filter((w) => !keys.has(w.key));
  h.workouts = h.workouts.concat(newW).sort((a, b) => a.key.localeCompare(b.key));
  const found = wList.length + Object.keys(data.days).length + data.workouts.length;
  if (found) h.lastSync = Date.now();
  save(); render();
  return { weights: wList.length, days: Object.keys(data.days).length, workouts: data.workouts.length, newWorkouts: newW.length, skipped: data.skipped, found };
}

function openHealthImport() {
  openSheet("Health-Daten übernehmen", `
    <p class="hint tight">Der Kurzbefehl hat die Daten in die Zwischenablage gelegt. Ein Tippen genügt – iOS fragt dann einmal „Einsetzen“.</p>
    <button class="btn primary block" id="h-paste">${icon("list")}Aus Zwischenablage einsetzen</button>
    <div id="h-result"></div>
    <details class="mt-4"><summary class="hint">Falls das nicht klappt: Text manuell einfügen</summary>
      <textarea id="h-text" class="mt-2" placeholder="GEWICHT;2026-11-12;104,6"></textarea>
      <button class="btn block" id="h-manual">Übernehmen</button>
    </details>
    <div class="btn-stack"><button class="btn ghost" id="h-run">${icon("repeat", "sm")}Kurzbefehl erneut starten</button></div>`);
  const sheet = $("#sheet");
  const show = (text) => {
    const r = importHealth(text);
    $("#h-result", sheet).innerHTML = r.found
      ? `<div class="callout mt-4">${icon("check")}<div class="c-body"><b>Übernommen:</b> ${r.weights} Gewichtswert${r.weights === 1 ? "" : "e"}, ${r.days} ${r.days === 1 ? "Tag" : "Tage"} mit Schritten/kcal, ${r.workouts} Workout${r.workouts === 1 ? "" : "s"} (${r.newWorkouts} neu).${r.skipped ? ` ${r.skipped} Zeilen nicht erkannt.` : ""}<br>Passende Workouts erscheinen jetzt bei den Einheiten zum Übernehmen.</div></div>`
      : `<div class="callout danger mt-4">${icon("alert")}<div class="c-body">Keine Health-Daten erkannt. Ist der Kurzbefehl vollständig durchgelaufen?</div></div>`;
  };
  $("#h-paste", sheet).addEventListener("click", async () => {
    try { show(await navigator.clipboard.readText()); }
    catch (e) { toast("Zwischenablage nicht lesbar – Text unten einfügen"); sheet.querySelector("details").open = true; }
  });
  $("#h-manual", sheet).addEventListener("click", () => show($("#h-text", sheet).value));
  $("#h-run", sheet).addEventListener("click", () => { closeSheet(); runHealthShortcut(); });
}

// Nach dem Kurzbefehl zurück in der App → Übernehmen anbieten
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && ui.awaitHealth) { ui.awaitHealth = false; openHealthImport(); }
});

const TYPE_LABEL = { lauf: "Laufen", reif: "Pamela Reif", studio: "Studio", cardio: "Cardio", kraft: "Kraft" };
const KNEE = { ok: "Knie ok", light: "Knie leicht spürbar", pain: "Knie: Schmerz/Schwellung" };
const KNEE_ICON = { ok: '<span class="knee-dot ok"></span>', light: '<span class="knee-dot light"></span>', pain: '<span class="knee-dot pain"></span>' };

function exerciseList(exs) {
  return `<ul class="ex-list">${exs.map((e) => {
    if (typeof e === "string") return `<li class="plain">${esc(e)}</li>`;
    const ex = EXERCISES[e.id];
    return `<li><button class="ex-btn" data-act="exercise" data-id="${e.id}" data-dose="${esc(e.dose)}"><span>${esc(ex.name)}<small>${esc(e.dose)}</small></span>${icon("chevron-right")}</button></li>`;
  }).join("")}</ul>`;
}

function sessionCard(p, c, s, hw) {
  const log = isDone(p, c, s.id);
  const feelIcon = ["", "😫", "😕", "🙂", "😊", "💪"];
  return `
    <div class="card session ${log ? "done" : ""}">
      <button class="check" data-act="toggle-session" data-id="${s.id}" aria-label="${log ? "Bestätigung zurücknehmen" : "Einheit bestätigen"}">${log ? icon("check") : ""}</button>
      <div class="body">
        <div class="title">${esc(s.title)}</div>
        <div class="meta">
          <span class="tag">${TYPE_LABEL[s.type]}</span>
          ${s.together ? '<span class="tag accent">gemeinsam</span>' : ""}
          ${s.optional ? '<span class="tag">optional</span>' : ""}
          <span>Vorschlag: ${s.day}${s.minutes ? ` · ${s.minutes} Min` : ""}</span>
        </div>
        <div class="detail">${esc(s.detail)}</div>
        ${s.exercises ? exerciseList(s.exercises) : ""}
        ${log ? `<div class="logged">${icon("check", "sm")}<span>Erledigt am ${new Date(log.at).toLocaleDateString("de-DE")} ${feelIcon[log.feel] || ""}</span>${log.knee ? `<span class="${log.knee === "pain" ? "knee-pain" : ""}">${KNEE_ICON[log.knee]} ${KNEE[log.knee]}</span>` : ""}${log.note ? `<span>${esc(log.note)}</span>` : ""}</div>` : ""}
        ${!log && hw ? `<div class="health-hint">${icon("activity", "sm")}<span>Health: ${DAYS[weekdayOf(hw.date)]} ${fmtDate(parseIso(hw.date))} · ${esc(fmtWorkout(hw))}</span><button class="btn small" data-act="health-take" data-id="${s.id}">Übernehmen</button></div>` : ""}
        ${s.link ? `<div class="actions"><a class="btn small" href="${s.link}" target="_blank" rel="noopener">${icon("play", "sm fill")}Videos auf YouTube</a></div>` : ""}
      </div>
    </div>`;
}

function openExercise(id, dose) {
  const ex = EXERCISES[id];
  openSheet(ex.name, `
    ${illustration(ex)}
    ${dose ? `<div class="ex-dose">Diese Woche: ${esc(dose)}</div>` : ""}
    <p class="ex-goal">${esc(ex.goal)}</p>
    <div class="ex-sec">So geht's</div>
    <ol class="ex-steps">${ex.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
    <div class="callout">${icon("alert")}<div class="c-body">
      <div class="c-title">Achte auf dein Knie</div>
      <ul>${ex.knee.map((x) => `<li>${esc(x)}</li>`).join("")}
        <li>Sofort aufhören bei stechendem Schmerz, Schwellung oder Wegknick-Gefühl.</li></ul>
    </div></div>
    <div class="ex-sec">Typische Fehler</div>
    <ul class="ex-steps">${ex.mistakes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <div class="btn-stack">
      <a class="btn block" href="https://www.youtube.com/results?search_query=${encodeURIComponent(ex.video)}" target="_blank" rel="noopener">${icon("play", "sm fill")}Video-Beispiele auf YouTube</a>
      <p class="hint center">Blau = arbeitendes Bein. Die Zeichnungen sind schematisch.</p>
    </div>`);
}

function repeatWeek() {
  const p = state.profile;
  const c = todayCal();
  const w = planSeq(p)[c - 1];
  if (!w) return;
  const msg = p === "rohat"
    ? `Woche ${w} nächste Woche noch einmal machen? Das 20-km-Ziel verschiebt sich um eine Woche.`
    : `Woche ${w} nächste Woche noch einmal machen?`;
  if (!confirm(msg)) return;
  (state.repeats[p] ||= []).push(w);
  save(); closeSheet(); render();
  toast(`Woche ${w} wird wiederholt`);
}

function openConfirm(id, hw) {
  const p = state.profile;
  const c = ui.trainingCal;
  const s = sessionsFor(p, planSeq(p)[c - 1]).find((x) => x.id === id);
  const askKnee = p === "rohat" && s.knee;
  let feel = 0, knee = null;
  openSheet(`Einheit bestätigen`, `
    <p class="sheet-lead">${esc(s.title)}</p>
    <span class="field-label">Wie hat es sich angefühlt?</span>
    <div class="choice">${["😫", "😕", "🙂", "😊", "💪"].map((f, i) => `<button data-feel="${i + 1}" aria-pressed="false">${f}</button>`).join("")}</div>
    ${askKnee ? `
      <span class="field-label">Knie-Check (während und nach der Einheit)</span>
      <div class="choice three">${Object.keys(KNEE).map((k) => `<button data-knee="${k}" aria-pressed="false">${KNEE_ICON[k]}${{ ok: "ok", light: "leicht spürbar", pain: "Schmerz / Schwellung" }[k]}</button>`).join("")}</div>` : ""}
    <label class="field-label" for="c-note">Notiz (optional)</label>
    <textarea id="c-note" placeholder="${s.km ? `z. B. ${s.km} km in 45 Min` : "z. B. alles gut"}">${hw ? esc(fmtWorkout(hw) + " (Apple Health)") : ""}</textarea>
    <button class="btn primary block" id="c-save">Bestätigen</button>`);
  const sheet = $("#sheet");
  const pick = (attr, set) => sheet.querySelectorAll(`[data-${attr}]`).forEach((b) =>
    b.addEventListener("click", () => {
      set(b.dataset[attr]);
      sheet.querySelectorAll(`[data-${attr}]`).forEach((x) => x.setAttribute("aria-pressed", x === b));
    }));
  pick("feel", (v) => (feel = +v));
  pick("knee", (v) => (knee = v));
  $("#c-save", sheet).addEventListener("click", () => {
    state.done[p][doneKey(c, id)] = { at: hw ? new Date(hw.date + "T12:00").getTime() : Date.now(), feel, knee, note: $("#c-note", sheet).value.trim(), ...(hw ? { healthKey: hw.key } : {}) };
    save(); closeSheet(); render();
    if (knee === "pain") openKneeAdvice(c);
    else if (knee === "light") toast("Beobachten: wird es stärker → Pause machen");
    else toast(weekComplete(p, c) ? "Woche geschafft!" : "Einheit bestätigt");
  });
}

function openKneeAdvice(c) {
  const canRepeat = c === todayCal();
  openSheet("Dein Knie meldet sich", `
    <div class="callout danger">${icon("alert")}<div class="c-body">
      <ul>
        <li><b>Die nächsten 2–3 Tage nicht laufen.</b> Gehen, Radfahren und Knie-Kraft B ohne Schmerz sind okay.</li>
        <li>Bei Schwellung: hochlegen und kühlen (Kühlpack in ein Tuch, 15 Min).</li>
        <li>Danach mit einem kurzen, lockeren Lauf testen. Ist er schmerzfrei, geht es mit dem Plan weiter.</li>
        <li><b>Wenn die Schwellung bleibt, das Knie wegknickt oder blockiert: ärztlich abklären lassen.</b> Bei Knien ohne Kreuzband kann das ein Hinweis auf einen Meniskusschaden sein.</li>
      </ul>
    </div></div>
    ${canRepeat ? `<div class="btn-stack"><button class="btn primary block" data-act-sheet="repeat">${icon("repeat")}Diese Woche nächste Woche wiederholen</button></div>` : ""}
  `);
  $("#sheet [data-act-sheet='repeat']")?.addEventListener("click", repeatWeek);
}

// ---------- Essen ----------
function weekMeals(weekKey) {
  if (!state.meals[weekKey]) state.meals[weekKey] = Object.fromEntries(DAYS.map((d) => [d, []]));
  return state.meals[weekKey];
}

function renderEssen() {
  const wk = ui.mealWeek;
  const meals = weekMeals(wk);
  const mon = parseIso(wk);
  const planned = DAYS.reduce((n, d) => n + meals[d].length, 0);
  return `
    ${mealWeekNav(wk)}
    <div class="btn-row">
      <button class="btn" data-act="suggest">${icon("sparkle")}Vorschlagen</button>
      <button class="btn" data-act="browse">${icon("book")}Alle Rezepte</button>
    </div>
    <div class="spacer"></div>
    ${DAYS.map((d, i) => {
      const list = meals[d];
      const kcal = list.reduce((s, m) => s + (recipeById(m.rid)?.kcal || 0), 0);
      return `
        <div class="card day">
          <div class="day-head"><b>${d}, ${fmtDate(addDays(mon, i))}</b>
            <span>${kcal ? `≈ ${kcal} kcal/Person` : ""}</span></div>
          ${list.map((m, idx) => {
            const r = recipeById(m.rid);
            if (!r) return "";
            return `
              <div class="meal">
                <div class="m-body">
                  <button class="m-title" data-act="recipe" data-id="${r.id}">${esc(r.title)}</button>
                  <div class="m-meta">${r.source} · ${r.kcal ? r.kcal + " kcal/Port." : "kcal k. A."}${r.minutes ? " · " + r.minutes + " Min" : ""}</div>
                </div>
                <div class="stepper" aria-label="Portionen">
                  <button data-act="srv" data-day="${d}" data-idx="${idx}" data-d="-1" aria-label="Weniger Portionen">${icon("minus")}</button>
                  <span>${m.servings}</span>
                  <button data-act="srv" data-day="${d}" data-idx="${idx}" data-d="1" aria-label="Mehr Portionen">${icon("plus")}</button>
                </div>
                <button class="icon-btn" data-act="rm-meal" data-day="${d}" data-idx="${idx}" aria-label="Entfernen">${icon("x")}</button>
              </div>`;
          }).join("")}
          <button class="btn ghost" data-act="add-meal" data-day="${d}">${icon("plus", "sm")}Gericht</button>
        </div>`;
    }).join("")}
    ${planned ? `<div class="btn-stack"><button class="btn primary block" data-act="go-shop">${icon("cart")}Einkaufsliste für diese Woche</button></div>` : ""}
    <p class="hint mt-4">Zahlen neben dem Gericht = Portionen. Zubereitung jeweils im Original-Rezept (Link im Rezept).</p>`;
}

function mealWeekNav(wk) {
  const mon = parseIso(wk);
  const thisWeek = iso(mondayOf(new Date()));
  const label = wk === thisWeek ? "Diese Woche" : wk === iso(addDays(parseIso(thisWeek), 7)) ? "Nächste Woche" : "Woche";
  return `
    <div class="weeknav">
      <button data-act="mweek" data-d="-7" aria-label="Vorherige Woche">${icon("chevron-left")}</button>
      <div class="label"><strong>${label}</strong><span>${fmtDate(mon)} – ${fmtDate(addDays(mon, 6))}</span></div>
      <button data-act="mweek" data-d="7" aria-label="Nächste Woche">${icon("chevron-right")}</button>
    </div>`;
}

// Fisch höchstens 1× in 4 Wochen: zählt diese und die 3 vorherigen Planwochen
function fishPlannedRecently(wk) {
  for (let i = 0; i < 4; i++) {
    const m = state.meals[iso(addDays(parseIso(wk), -7 * i))];
    if (m && DAYS.some((d) => m[d].some((x) => recipeById(x.rid)?.diet === "fisch"))) return true;
  }
  return false;
}

function suggestWeek() {
  const meals = weekMeals(ui.mealWeek);
  const empty = DAYS.filter((d) => meals[d].length === 0);
  if (!empty.length) { toast("Alle Tage sind schon belegt"); return; }
  const used = new Set(DAYS.flatMap((d) => meals[d].map((m) => m.rid)));
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const pool = activeRecipes(parseIso(ui.mealWeek)).filter((r) => !used.has(r.id));
  let fishOk = !fishPlannedRecently(ui.mealWeek);
  const veg = shuffle(pool.filter(isVeg));
  let rest = shuffle(pool.filter((r) => !isVeg(r) && (fishOk || r.diet !== "fisch")));
  // ca. 2/3 vegetarisch/vegan, Fisch höchstens einmal
  empty.forEach((d, i) => {
    const pickVeg = i % 3 !== 2;
    const r = (pickVeg ? veg.shift() || rest.shift() : rest.shift() || veg.shift());
    if (!r) return;
    meals[d].push({ rid: r.id, servings: state.householdServings });
    if (r.diet === "fisch") { fishOk = false; rest = rest.filter((x) => x.diet !== "fisch"); }
  });
  save(); render(); toast(`${empty.length} Tage gefüllt – einzeln änderbar`);
}

function recipeFilterFn(f) {
  return {
    alle: () => true,
    veg: isVeg,
    schnell: (r) => r.minutes && r.minutes <= 20,
    kaia: (r) => r.kaia === "ja",
    saison: (r) => r.season !== "all",
    leicht: (r) => r.kcal && r.kcal <= 400,
    Alnatura: (r) => r.source === "Alnatura",
    Henssler: (r) => r.source === "Henssler",
  }[f];
}

function recipeListHtml(day) {
  const filters = [["alle", "Alle"], ["saison", SEASONS[quarterOf(parseIso(ui.mealWeek))]], ["veg", "Veggie/Vegan"], ["leicht", "≤ 400 kcal"], ["kaia", "Für Kaia"], ["schnell", "≤ 20 Min"], ["Alnatura", "Alnatura"], ["Henssler", "Henssler"]];
  const active = activeRecipes(parseIso(ui.mealWeek));
  const list = active.filter(recipeFilterFn(ui.recipeFilter));
  return `
    <p class="hint tight">${active.length} Gerichte im Angebot · ${SEASONS[quarterOf(parseIso(ui.mealWeek))]}-Auswahl für die ${mealWeekLabel()}</p>
    <div class="chips">${filters.map(([k, l]) => `<button data-filter="${k}" aria-pressed="${ui.recipeFilter === k}">${l}</button>`).join("")}</div>
    ${list.map((r) => `
      <button class="card recipe" data-pick="${r.id}">
        <div class="r-body">
          <div class="r-title">${esc(r.title)}</div>
          <div class="r-meta">
            <span class="tag">${r.source}</span>
            <span class="tag ${isVeg(r) ? "accent" : ""}">${DIET_LABEL[r.diet]}</span>
            ${r.season !== "all" ? `<span class="tag">${SEASONS[r.season]}</span>` : ""}
            ${r.kaia === "ja" ? '<span class="tag">Kaia ✓</span>' : ""}
            <span>${r.kcal ? r.kcal + " kcal" : "kcal k. A."}${r.minutes ? ` · ${r.minutes} Min` : ""}</span>
          </div>
        </div>
        ${icon(day ? "plus" : "chevron-right")}
      </button>`).join("") || '<p class="empty">Keine Treffer</p>'}`;
}

function openRecipePicker(day) {
  const draw = () => {
    openSheet(day ? `Gericht für ${day}` : "Rezepte", recipeListHtml(day));
    const sheet = $("#sheet");
    sheet.querySelectorAll("[data-filter]").forEach((b) =>
      b.addEventListener("click", () => { ui.recipeFilter = b.dataset.filter; draw(); }));
    sheet.querySelectorAll("[data-pick]").forEach((b) =>
      b.addEventListener("click", () => {
        if (day) {
          weekMeals(ui.mealWeek)[day].push({ rid: b.dataset.pick, servings: state.householdServings });
          save(); closeSheet(); render(); toast("Hinzugefügt");
        } else openRecipe(b.dataset.pick);
      }));
  };
  draw();
}

function openRecipe(id, servings) {
  const r = recipeById(id);
  const srv = servings || state.householdServings;
  const f = srv / r.servings;
  openSheet(r.title, `
    <div class="r-meta recipe-head">
      <span class="tag">${r.source}</span>
      <span class="tag ${isVeg(r) ? "accent" : ""}">${DIET_LABEL[r.diet]}</span>
      ${r.season !== "all" ? `<span class="tag">${SEASONS[r.season]}</span>` : ""}
      <span>${r.kcal ? r.kcal + " kcal/Portion" : "kcal nicht angegeben"}${r.minutes ? " · " + r.minutes + " Min" : ""}</span>
    </div>
    ${r.retired ? `<div class="callout">${icon("info")}<div class="c-body">Nicht mehr im Angebot: ${esc(r.retired)}.</div></div>` : ""}
    <div class="callout ${r.kaia === "nein" ? "danger" : ""}">${icon(r.kaia === "ja" ? "check" : "info")}<div class="c-body"><b>${KAIA_LABEL[r.kaia]}</b>${r.kaiaNote ? " – " + esc(r.kaiaNote) : ""}</div></div>
    ${r.kcalNote ? `<div class="callout">${icon("info")}<div class="c-body">kcal: ${esc(r.kcalNote)}</div></div>` : ""}
    ${r.note ? `<div class="callout">${icon("info")}<div class="c-body">${esc(r.note)}</div></div>` : ""}
    <div class="section-title">Zutaten für ${srv} Portionen <span class="sub">(Original: ${r.servings})</span></div>
    <div class="card list-group">
      ${r.ingredients.map((i) => `<div class="ing"><span>${esc(i.name)}</span><span class="q">${esc(fmtAmount(scaleQty(i.qty, i.unit, f), i.unit))}</span></div>`).join("")}
    </div>
    <a class="btn primary block" href="${r.url}" target="_blank" rel="noopener">Zubereitung bei ${r.source}${icon("external", "sm")}</a>
    <div class="section-title">Zum Plan hinzufügen (${mealWeekLabel()})</div>
    <div class="chips">${DAYS.map((d) => `<button data-addday="${d}">${d}</button>`).join("")}</div>`);
  $("#sheet").querySelectorAll("[data-addday]").forEach((b) =>
    b.addEventListener("click", () => {
      weekMeals(ui.mealWeek)[b.dataset.addday].push({ rid: id, servings: state.householdServings });
      save(); closeSheet(); render(); toast(`Für ${b.dataset.addday} eingeplant`);
    }));
}
const mealWeekLabel = () => `Woche ab ${fmtDate(parseIso(ui.mealWeek))}`;

// ---------- Einkauf ----------
function shopState(wk) {
  if (!state.shopping[wk]) state.shopping[wk] = { checked: {}, pantry: {}, sent: {}, extra: [] };
  return state.shopping[wk];
}

// Fasst alle Zutaten der Woche zusammen (gleicher Name + gleiche Einheit)
function buildList(wk) {
  const meals = weekMeals(wk);
  const map = new Map();
  for (const d of DAYS) {
    for (const m of meals[d]) {
      const r = recipeById(m.rid);
      if (!r) continue;
      const f = m.servings / r.servings;
      for (const ing of r.ingredients) {
        const key = (ing.name + "|" + ing.unit).toLowerCase();
        const e = map.get(key) || { key, name: ing.name, unit: ing.unit, cat: ing.cat, qty: 0, unknown: false, from: new Set() };
        const q = scaleQty(ing.qty, ing.unit, f);
        if (q == null) e.unknown = true; else e.qty += q;
        e.from.add(r.title);
        map.set(key, e);
      }
    }
  }
  // Gekauft wird ganz: ½ Paprika → 1 Paprika
  for (const e of map.values()) if (["Stk", "Bund", "Pck"].includes(e.unit)) e.qty = Math.ceil(e.qty - 1e-9);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}
function itemAmount(e) {
  const parts = [];
  if (e.qty) parts.push(`${fmtQty(e.qty)}${e.unit ? " " + e.unit : ""}`);
  if (e.unknown) parts.push(e.qty ? "+ lt. Rezept" : "Menge lt. Rezept");
  return parts.join(" ");
}

function renderEinkauf() {
  const wk = ui.mealWeek;
  const ss = shopState(wk);
  const items = buildList(wk);
  const pantry = items.filter((e) => e.cat === "gewuerz");
  const main = items.filter((e) => e.cat !== "gewuerz" || ss.pantry[e.key]);
  const cats = Object.keys(CATEGORIES);
  const open = main.filter((e) => !ss.checked[e.key]).length + ss.extra.filter((x) => !x.checked).length;

  const itemRow = (e) => `
    <div class="item ${ss.checked[e.key] ? "checked" : ""}">
      <input type="checkbox" id="i-${esc(e.key)}" data-check="${esc(e.key)}" ${ss.checked[e.key] ? "checked" : ""}>
      <label for="i-${esc(e.key)}">${esc(e.name)} ${ss.sent[e.key] ? '<span class="sent">${icon("check")}Erinnerungen</span>' : ""}
        <span class="from">${esc([...e.from].join(", "))}</span></label>
      <span class="qty">${esc(itemAmount(e))}</span>
    </div>`;

  if (!items.length && !ss.extra.length) {
    return `${mealWeekNav(wk)}
      <div class="empty">Für diese Woche sind noch keine Gerichte geplant.<br>
      <button class="btn primary" data-act="tab" data-tab="essen">Zum Essensplan</button></div>
      ${extraHtml(ss)}`;
  }

  return `
    ${mealWeekNav(wk)}
    <div class="card shop-summary">
      <div class="count">${open} offene Artikel</div>
      <p class="hint">Überträgt alle offenen, noch nicht gesendeten Artikel in die geteilte Erinnerungen-Liste.</p>
      <button class="btn primary block" data-act="send-reminders">${icon("list")}An Erinnerungen senden</button>
      <div class="btn-row mt-2">
        <button class="btn small" data-act="share">${icon("share", "sm")}Teilen</button>
        <button class="btn small" data-act="resend">${icon("repeat", "sm")}Erneut senden</button>
      </div>
    </div>
    ${cats.map((c) => {
      const list = main.filter((e) => e.cat === c);
      if (!list.length) return "";
      return `<div class="section-title">${CATEGORIES[c]}</div><div class="card list-group">${list.map(itemRow).join("")}</div>`;
    }).join("")}
    ${extraHtml(ss)}
    ${pantry.length ? `
      <div class="section-title">Vorrat prüfen</div>
      <div class="card list-group">
        <p class="hint">Gewürze, Öle, Saucen – meist vorhanden. Antippen, wenn es auf die Liste soll.</p>
        ${pantry.map((e) => `
          <div class="item">
            <input type="checkbox" id="p-${esc(e.key)}" data-pantry="${esc(e.key)}" ${ss.pantry[e.key] ? "checked" : ""}>
            <label for="p-${esc(e.key)}">${esc(e.name)}<span class="from">${esc([...e.from].join(", "))}</span></label>
            <span class="qty">${esc(itemAmount(e))}</span>
          </div>`).join("")}
      </div>` : ""}
    <div class="actions"><button class="btn small danger" data-act="clear-checked">Abgehakte zurücksetzen</button></div>`;
}

function extraHtml(ss) {
  return `
    <div class="section-title">Eigene Artikel</div>
    <div class="card list-group">
      ${ss.extra.map((x) => `
        <div class="item ${x.checked ? "checked" : ""}">
          <input type="checkbox" id="x-${x.id}" data-xcheck="${x.id}" ${x.checked ? "checked" : ""}>
          <label for="x-${x.id}">${esc(x.name)} ${x.sent ? '<span class="sent">${icon("check")}Erinnerungen</span>' : ""}</label>
          <button class="icon-btn" data-act="rm-extra" data-id="${x.id}" aria-label="Entfernen">${icon("x")}</button>
        </div>`).join("")}
      <form class="add-row" data-form="extra">
        <input type="text" name="artikel" placeholder="z. B. Haferflocken, Bananen" autocomplete="off" enterkeyhint="done" aria-label="Eigener Artikel">
        <button class="btn primary" type="submit" aria-label="Hinzufügen">${icon("plus")}</button>
      </form>
    </div>`;
}

function openItems(wk, includeSent) {
  const ss = shopState(wk);
  const items = buildList(wk).filter((e) => (e.cat !== "gewuerz" || ss.pantry[e.key]) && !ss.checked[e.key]);
  const lines = [];
  const keys = [];
  for (const e of items) {
    if (!includeSent && ss.sent[e.key]) continue;
    const amt = itemAmount(e);
    lines.push(amt ? `${e.name} – ${amt}` : e.name);
    keys.push(["i", e.key]);
  }
  for (const x of ss.extra) {
    if (x.checked || (!includeSent && x.sent)) continue;
    lines.push(x.name);
    keys.push(["x", x.id]);
  }
  return { lines, keys };
}

function sendToReminders(includeSent) {
  const wk = ui.mealWeek;
  const { lines, keys } = openItems(wk, includeSent);
  if (!lines.length) { toast(includeSent ? "Keine offenen Artikel" : "Alles schon gesendet"); return; }
  const ss = shopState(wk);
  for (const [t, k] of keys) {
    if (t === "i") ss.sent[k] = true;
    else { const x = ss.extra.find((y) => y.id === k); if (x) x.sent = true; }
  }
  save();
  const url = "shortcuts://run-shortcut?name=" + encodeURIComponent(state.shortcutName) +
    "&input=text&text=" + encodeURIComponent(lines.join("\n"));
  window.location.href = url;
  setTimeout(render, 500);
}

async function shareList() {
  const { lines } = openItems(ui.mealWeek, true);
  if (!lines.length) { toast("Keine offenen Artikel"); return; }
  const text = "Einkaufsliste " + mealWeekLabel() + "\n\n" + lines.map((l) => "• " + l).join("\n");
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(text); toast("In die Zwischenablage kopiert"); }
  catch (e) { toast("Teilen nicht möglich"); }
}

// ---------- Mehr ----------
function renderMehr() {
  return `
    <div class="section-title">Trainingsplan</div>
    <div class="card">
      <label class="field-label" for="s-start">Start (Montag der Woche 1)</label>
      <input type="date" id="s-start" value="${state.startDate}">
      <p class="hint mt-2">Gilt für Rohat und Steffi. Das Datum wird automatisch auf den Montag gesetzt.${todayCal() < 1 ? " Der Plan hat noch nicht begonnen." : ""}</p>
      ${(state.repeats.rohat.length || state.repeats.steffi.length) ? `<p class="hint">Wiederholte Wochen – Rohat: ${state.repeats.rohat.join(", ") || "keine"} · Steffi: ${state.repeats.steffi.join(", ") || "keine"}</p>
      <button class="btn small danger" data-act="reset-repeats">Wiederholungen zurücknehmen</button>` : ""}
    </div>

    <div class="section-title">Essen</div>
    <div class="card">
      <label class="field-label" for="s-srv">Standard-Portionen pro Gericht</label>
      <select id="s-srv">${[1, 2, 3, 4, 6].map((n) => `<option ${n === state.householdServings ? "selected" : ""}>${n}</option>`).join("")}</select>
    </div>

    <div class="section-title">Erinnerungen (iCloud) einrichten</div>
    <div class="card">
      <p class="hint">Einmalig auf dem iPhone, von dem aus gesendet wird. Die App übergibt die Liste an einen Kurzbefehl, der jeden Artikel als eigene Erinnerung anlegt.</p>
      <ol class="steps">
        <li>In <b>Erinnerungen</b> eine Liste <b>„Einkauf“</b> anlegen (Listentyp „Einkaufsliste“ sortiert automatisch nach Rubriken).</li>
        <li>Liste öffnen → <b>Teilen</b> → Steffi einladen. Ab dann synchronisiert iCloud die Liste.</li>
        <li>App <b>Kurzbefehle</b> → <b>+</b> → Name exakt: <b>${esc(state.shortcutName)}</b></li>
        <li><b>ⓘ</b> → <b>„Im Share-Sheet anzeigen“</b> einschalten. Im neuen Block oben „Wenn keine Eingabe vorhanden ist“ auf <b>„Fragen nach“</b> stellen.</li>
        <li>Aktion <b>„Text aufteilen“</b> hinzufügen → <b>Kurzbefehleingabe</b> durch <b>Neue Zeilen</b> aufteilen.</li>
        <li>Aktion <b>„Wiederholen mit jedem Objekt“</b> → in <b>Aufgeteilter Text</b>.</li>
        <li>Innerhalb der Schleife: <b>„Erinnerung hinzufügen“</b> → Text: <b>Wiederholungsobjekt</b>, Liste: <b>Einkauf</b>.</li>
        <li>Fertig. Beim ersten Senden fragt iOS einmal nach Erlaubnis.</li>
      </ol>
      <label class="field-label" for="s-sc">Name des Kurzbefehls</label>
      <input type="text" id="s-sc" value="${esc(state.shortcutName)}">
      <div class="btn-stack"><button class="btn block" data-act="test-shortcut">Test senden</button></div>
    </div>

    <div class="section-title">Apple Health einrichten</div>
    <div class="card">
      <p class="hint">Einmalig auf deinem iPhone. Der Kurzbefehl liest die letzten 14 Tage aus Health und legt sie in die Zwischenablage; „Health abgleichen“ im Training startet ihn.</p>
      <ol class="steps">
        <li>Kurzbefehle → <b>+</b> → Name exakt: <b>${esc(state.healthShortcutName)}</b></li>
        <li>Pro Datenart ein Block: <b>„Health-Samples suchen“</b> (letzte 14 Tage) → <b>„Wiederholen mit jedem Objekt“</b> → <b>„Text“</b> mit Kennung, Startdatum (ISO 8601) und Wert → <b>„Zu Variable hinzufügen“</b> (Name <b>Export</b>).</li>
        <li>Kennungen: <b>GEWICHT</b>, <b>SCHRITTE</b>, <b>AKTIV</b>, <b>RUHE</b>, <b>DISTANZ</b> (Tageswerte: „Gruppieren nach Tag“) und <b>WORKOUT</b> (Typ;Dauer;Distanz;Energie).</li>
        <li>Am Ende: <b>„Text kombinieren“</b> (Export, Neue Zeilen) → <b>„In Zwischenablage kopieren“</b>.</li>
        <li>Zurück in die App wechseln → <b>„Aus Zwischenablage einsetzen“</b>.</li>
      </ol>
      <label class="field-label" for="s-hsc">Name des Kurzbefehls</label>
      <input type="text" id="s-hsc" value="${esc(state.healthShortcutName)}">
      <div class="btn-stack">
        <button class="btn block" data-act="health-sync">${icon("repeat")}Health abgleichen</button>
        <button class="btn ghost" data-act="health-import">Daten manuell einfügen</button>
      </div>
    </div>

    <div class="section-title">Daten</div>
    <div class="card">
      <p class="hint">Alles wird nur auf diesem iPhone gespeichert. Sicherung als Datei, z. B. in iCloud Drive:</p>
      <div class="btn-row">
        <button class="btn small" data-act="export">Sicherung exportieren</button>
        <label class="btn small">Sicherung laden<input type="file" id="s-import" accept="application/json" hidden></label>
      </div>
    </div>

    <div class="section-title">Installation</div>
    <div class="card"><p class="hint">In Safari öffnen → Teilen-Symbol → <b>„Zum Home-Bildschirm“</b>. Danach startet die App im Vollbild und funktioniert offline.</p></div>

    <p class="hint mt-5">Rezepte: Alnatura (alnatura.de) und Steffen Henssler (henssler.shop). Zutaten und kcal laut Originalseite, Zubereitung bitte im Original. Workouts: Pamela Reif auf YouTube.</p>`;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `get-in-shape-${iso(new Date())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.done || !data.meals) throw new Error("Format");
      if (!confirm("Aktuelle Daten durch die Sicherung ersetzen?")) return;
      state = { ...defaultState(), ...data };
      save(); render(); toast("Sicherung geladen");
    } catch (e) { toast("Datei ist keine gültige Sicherung"); }
  };
  reader.readAsText(file);
}

// ---------- Sheet ----------
function openSheet(title, html) {
  const sheet = $("#sheet");
  sheet.innerHTML = `
    <div class="sheet-head"><h2>${esc(title)}</h2><button class="btn ghost" data-close>Fertig</button></div>
    <div class="sheet-body">${html}</div>`;
  $("[data-close]", sheet).addEventListener("click", closeSheet);
  if (!sheet.open) sheet.showModal();
}
function closeSheet() { const s = $("#sheet"); if (s.open) s.close(); }
$("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeSheet(); });

// ---------- Rendering & Events ----------
const TITLES = { training: "Training", essen: "Essen", einkauf: "Einkauf", mehr: "Mehr" };
function render() {
  $("#view-title").textContent = TITLES[ui.tab];
  document.querySelector(".profile-switch").hidden = ui.tab !== "training";
  document.querySelectorAll(".profile-switch button").forEach((b) =>
    b.setAttribute("aria-selected", b.dataset.profile === state.profile));
  document.querySelectorAll(".tabbar button").forEach((b) => {
    if (b.dataset.tab === ui.tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  const v = $("#view");
  v.innerHTML = { training: renderTraining, essen: renderEssen, einkauf: renderEinkauf, mehr: renderMehr }[ui.tab]();
}

function setTab(t) { ui.tab = t; render(); window.scrollTo(0, 0); }

document.querySelector(".tabbar").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab);
});
document.querySelector(".profile-switch").addEventListener("click", (e) => {
  const b = e.target.closest("[data-profile]"); if (!b) return;
  state.profile = b.dataset.profile; ui.trainingCal = null; save(); render();
});

const view = $("#view");
view.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act;
  const wk = ui.mealWeek;
  switch (act) {
    case "tweek": ui.trainingCal = clampCal(state.profile, ui.trainingCal + +b.dataset.d); render(); break;
    case "exercise": openExercise(b.dataset.id, b.dataset.dose); break;
    case "weight-add": openWeightSheet(); break;
    case "health-sync": runHealthShortcut(); break;
    case "health-import": openHealthImport(); break;
    case "health-take": openConfirm(b.dataset.id, healthSuggestions(state.profile, ui.trainingCal)[b.dataset.id]); break;
    case "repeat-week": repeatWeek(); break;
    case "reset-repeats":
      if (confirm("Alle Wochen-Wiederholungen zurücknehmen? Abgehakte Einheiten bleiben gespeichert.")) {
        state.repeats = { rohat: [], steffi: [] }; ui.trainingCal = null; save(); render();
      }
      break;
    case "toggle-session": {
      const id = b.dataset.id;
      const key = doneKey(ui.trainingCal, id);
      if (state.done[state.profile][key]) {
        if (confirm("Bestätigung dieser Einheit zurücknehmen?")) { delete state.done[state.profile][key]; save(); render(); }
      } else openConfirm(id);
      break;
    }
    case "mweek": ui.mealWeek = iso(addDays(parseIso(wk), +b.dataset.d)); render(); break;
    case "suggest": suggestWeek(); break;
    case "browse": openRecipePicker(null); break;
    case "add-meal": openRecipePicker(b.dataset.day); break;
    case "recipe": openRecipe(b.dataset.id); break;
    case "srv": {
      const m = weekMeals(wk)[b.dataset.day][+b.dataset.idx];
      m.servings = Math.max(1, Math.min(12, m.servings + +b.dataset.d)); save(); render(); break;
    }
    case "rm-meal": weekMeals(wk)[b.dataset.day].splice(+b.dataset.idx, 1); save(); render(); break;
    case "go-shop": setTab("einkauf"); break;
    case "tab": setTab(b.dataset.tab); break;
    case "send-reminders": sendToReminders(false); break;
    case "resend": sendToReminders(true); break;
    case "share": shareList(); break;
    case "clear-checked":
      if (confirm("Alle Haken dieser Woche zurücksetzen?")) {
        const ss = shopState(wk); ss.checked = {}; ss.extra.forEach((x) => (x.checked = false)); save(); render();
      }
      break;
    case "rm-extra": {
      const ss = shopState(wk); const x = ss.extra.find((y) => y.id === b.dataset.id);
      if (x && confirm(`„${x.name}“ entfernen?`)) { ss.extra = ss.extra.filter((y) => y !== x); save(); render(); }
      break;
    }
    case "test-shortcut":
      window.location.href = "shortcuts://run-shortcut?name=" + encodeURIComponent(state.shortcutName) +
        "&input=text&text=" + encodeURIComponent("Test aus Get in Shape");
      break;
    case "export": exportData(); break;
  }
});

view.addEventListener("change", (e) => {
  const t = e.target;
  const ss = shopState(ui.mealWeek);
  if (t.dataset.check) { ss.checked[t.dataset.check] = t.checked; if (!t.checked) delete ss.checked[t.dataset.check]; save(); render(); }
  else if (t.dataset.pantry) { if (t.checked) ss.pantry[t.dataset.pantry] = true; else delete ss.pantry[t.dataset.pantry]; save(); render(); }
  else if (t.dataset.xcheck) { const x = ss.extra.find((y) => y.id === t.dataset.xcheck); if (x) x.checked = t.checked; save(); render(); }
  else if (t.id === "s-start" && t.value) { state.startDate = iso(mondayOf(parseIso(t.value))); ui.trainingCal = null; save(); render(); toast("Startdatum gespeichert"); }
  else if (t.id === "s-srv") { state.householdServings = +t.value; save(); }
  else if (t.id === "s-hsc") { state.healthShortcutName = t.value.trim() || defaultState().healthShortcutName; save(); render(); }
  else if (t.id === "s-sc") { state.shortcutName = t.value.trim() || defaultState().shortcutName; save(); render(); }
  else if (t.id === "s-import" && t.files[0]) importData(t.files[0]);
});

view.addEventListener("submit", (e) => {
  const f = e.target.closest("[data-form='extra']"); if (!f) return;
  e.preventDefault();
  const name = f.elements.artikel.value.trim(); if (!name) return;
  shopState(ui.mealWeek).extra.push({ id: Date.now().toString(36), name, checked: false });
  save(); render();
  $("[data-form='extra'] input", view)?.focus();
});

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
