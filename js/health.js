// Import von Apple-Health-Daten über einen Kurzbefehl.
// Eine Web-App hat keinen Zugriff auf HealthKit. Der Kurzbefehl
// „Health an Get in Shape“ liest die Daten und legt sie als Text in die
// Zwischenablage, eine Zeile pro Wert:
//
//   GEWICHT;2026-11-12T07:02:00+01:00;104,6
//   SCHRITTE;2026-11-12T00:00:00+01:00;8.432
//   AKTIV;2026-11-12T00:00:00+01:00;612        (aktive Energie, kcal)
//   RUHE;2026-11-12T00:00:00+01:00;2.050       (Ruheenergie, kcal)
//   DISTANZ;2026-11-12T00:00:00+01:00;7,4      (Gehen + Laufen, km)
//   TRAININGSMINUTEN;2026-11-12T00:00:00+01:00;42  (grüner Ring, Minuten)
//   WORKOUT;2026-11-12T18:30:00+01:00;Laufen;32 min;5,1 km;410 kcal
//
// Der Parser ist bewusst tolerant: Trenner ; | oder Tab, Komma oder Punkt,
// Tausenderpunkte, Einheiten im Wert und deutsche Datumsangaben.

export function parseNumber(raw) {
  let s = String(raw ?? "").replace(/[^\d.,:-]/g, "");
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

const MONTHS = ["jan", "feb", "m", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "dez"];
const MONTH_ALIASES = { "mär": 3, "mar": 3, "may": 5, "oct": 10, "dec": 12 };

function parseDate(raw) {
  const s = String(raw ?? "");
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  let date = m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
  if (!date && (m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/))) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    date = `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  // Standardformat von Kurzbefehle, z. B. „12. Nov. 2026“ oder „12. November 2026“
  if (!date && (m = s.match(/(\d{1,2})\.?\s*([A-Za-zÄäÖöÜü]{3,})\.?\s*(\d{4})/))) {
    const name = m[2].toLowerCase();
    const mon = MONTH_ALIASES[name.slice(0, 3)] || (name.startsWith("mai") ? 5 : MONTHS.findIndex((x) => x !== "m" && name.startsWith(x)) + 1);
    if (mon) date = `${m[3]}-${String(mon).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const t = s.match(/(\d{1,2}):(\d{2})/);
  return { date, time: t ? `${t[1].padStart(2, "0")}:${t[2]}` : "" };
}

// Dauer: "32 min", "1923" (Sekunden), "0:32:03" oder "1 h 5 min"
function parseMinutes(raw) {
  const s = String(raw ?? "").toLowerCase();
  if (!s.trim()) return null;
  const hms = s.match(/(\d+):(\d{2})(?::(\d{2}))?/);
  if (hms) return hms[3] != null ? +hms[1] * 60 + +hms[2] + +hms[3] / 60 : +hms[1] + +hms[2] / 60;
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*(h|std)/);
  const mi = s.match(/(\d+(?:[.,]\d+)?)\s*min/);
  if (h || mi) return (h ? parseNumber(h[1]) * 60 : 0) + (mi ? parseNumber(mi[1]) : 0);
  const n = parseNumber(s);
  if (n == null) return null;
  return n > 300 ? n / 60 : n; // große Zahlen sind Sekunden
}

function parseKm(raw) {
  const s = String(raw ?? "").toLowerCase();
  const n = parseNumber(s);
  if (n == null) return null;
  return /\bm\b/.test(s) && !/km/.test(s) ? n / 1000 : n;
}

const DAY_FIELD = {
  SCHRITTE: "steps", STEPS: "steps", AKTIV: "active", ACTIVE: "active", RUHE: "basal", BASAL: "basal",
  DISTANZ: "distance", DISTANCE: "distance",
  TRAININGSMINUTEN: "exercise", TRAINING: "exercise", TRAININGSZEIT: "exercise", EXERCISE: "exercise", EXERCISEMINUTES: "exercise",
};
const parseDayValue = (field, raw) => (field === "distance" ? parseKm(raw) : field === "exercise" ? parseMinutes(raw) : parseNumber(raw));

export function parseHealthText(text) {
  const out = { weights: [], days: {}, workouts: [], skipped: 0, samples: [] };
  const skip = (line) => { out.skipped++; if (out.samples.length < 3) out.samples.push(line); };
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/[;|\t]/).map((x) => x.trim());
    const kind = (parts[0] || "").toUpperCase().replace(/[^A-ZÄÖÜ]/g, "");
    const { date, time } = parseDate(parts[1]);
    if (!date) { skip(line); continue; }
    if (kind === "GEWICHT" || kind === "WEIGHT") {
      const kg = parseNumber(parts[2]);
      if (kg && kg > 30 && kg < 300) out.weights.push({ date, time, kg: Math.round(kg * 10) / 10 });
      else skip(line);
    } else if (DAY_FIELD[kind]) {
      const field = DAY_FIELD[kind];
      const v = parseDayValue(field, parts[2]);
      if (v == null) { skip(line); continue; }
      const d = (out.days[date] ||= {});
      d[field] = (d[field] || 0) + v; // mehrere Werte am Tag addieren
    } else if (kind === "WORKOUT") {
      const type = parts[2] || "Workout";
      out.workouts.push({
        key: `${date}T${time}|${type}`, date, time, type,
        min: parseMinutes(parts[3]), km: parseKm(parts[4]), kcal: parseNumber(parts[5]),
      });
    } else skip(line);
  }
  return out;
}

// Workout-Art → Kategorie der Trainingseinheit
export function workoutCategory(type) {
  const t = String(type).toLowerCase();
  if (/lauf|run|jogg/.test(t)) return "lauf";
  if (/geh|walk|wander|hik|rad|cycl|bike|ellip|cross.?train|rudern|row/.test(t)) return "cardio";
  if (/hiit|tanz|danc|pilates|yoga|mobil|stretch|aerob|fitness.?gaming|gemischt|mixed/.test(t)) return "reif";
  if (/kraft|strength|core|funktion|functional/.test(t)) return "kraft";
  return null;
}

const COMPATIBLE = {
  lauf: ["lauf"],
  cardio: ["cardio"],
  kraft: ["kraft", "studio", "reif"],
  reif: ["reif", "kraft"],
  aktiv: ["kraft", "reif", "cardio"], // nur Trainingsminuten, Art unbekannt
};
const sessionCategory = (s) => (s.type === "studio" ? "kraft" : s.type);
const DAY_INDEX = { Mo: 0, Di: 1, Mi: 2, Do: 3, Fr: 4, Sa: 5, So: 6 };

// Ordnet die Workouts einer Kalenderwoche offenen Einheiten zu.
// sessions: Einheiten der Woche; isOpen(id) → noch nicht bestätigt;
// weekdayOf(date) → 0 (Mo) … 6 (So). Ergebnis: { sessionId: workout }
// Alle passenden Paare werden nach „Kosten“ (Abstand zum Vorschlagstag)
// sortiert und der Reihe nach vergeben.
export function matchWorkouts(sessions, workouts, isOpen, weekdayOf) {
  const pairs = [];
  for (const w of workouts) {
    const cat = w.cat || workoutCategory(w.type);
    if (!cat) continue;
    for (const s of sessions) {
      if (!isOpen(s.id) || !COMPATIBLE[cat].includes(sessionCategory(s))) continue;
      let cost = Math.abs((DAY_INDEX[s.day] ?? 3) - weekdayOf(w.date));
      if (cat === "lauf" && s.km && !(w.km >= s.km * 0.7)) cost += 10; // zu kurz für den langen Lauf
      if (cat === "kraft" && s.type === "reif") cost += 2;               // Kraft eher der Kraft-Einheit
      pairs.push({ w, s, cost });
    }
  }
  pairs.sort((a, b) => a.cost - b.cost || a.w.key.localeCompare(b.w.key));
  const result = {}, usedW = new Set();
  for (const { w, s } of pairs) {
    if (result[s.id] || usedW.has(w.key)) continue;
    result[s.id] = w;
    usedW.add(w.key);
  }
  return result;
}

// Kurzbefehle in iOS 27 liefern keine Workouts. Ersatz: Tage mit mindestens
// 15 Trainingsminuten werden zu geschätzten Einheiten. Liegt die Distanz zu
// Fuß an dem Tag deutlich über dem üblichen Wert (Median), war es ein Lauf
// oder ein Spaziergang – je nach Minuten pro Zusatz-Kilometer. Sonst bleibt
// es „Training“ (Kraft, Pamela Reif, Rad …). Nur Vorschläge, nie automatisch.
export const MIN_EXERCISE = 15;
export function estimateWorkouts(days, workouts = []) {
  const real = new Set(workouts.map((w) => w.date));
  const dists = Object.values(days).map((d) => d.distance).filter((x) => x > 0).sort((a, b) => a - b);
  const base = dists.length >= 5 ? dists[Math.floor(dists.length / 2)] : null;
  const out = [];
  for (const [date, d] of Object.entries(days)) {
    const min = d.exercise;
    if (!(min >= MIN_EXERCISE) || real.has(date)) continue;
    const extra = base != null && d.distance != null ? d.distance - base : 0;
    let type = "Training", cat = "aktiv", km = null;
    if (extra >= 2) {
      km = Math.round(extra * 2) / 2;
      [type, cat] = min / extra <= 11 ? ["Laufen", "lauf"] : ["Gehen", "cardio"]; // ≤ 11 Min/km → Laufen
    }
    out.push({ key: `est|${date}`, date, time: "", type, cat, min, km, kcal: null, estimated: true });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export const fmtWorkout = (w) => {
  const parts = [w.estimated ? `${w.type} (geschätzt)` : w.type];
  if (w.km) parts.push(`${w.estimated ? "ca. " : ""}${w.km.toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`);
  if (w.min) parts.push(`${Math.round(w.min)} ${w.estimated ? "Trainingsmin" : "Min"}`);
  if (w.kcal) parts.push(`${Math.round(w.kcal)} kcal`);
  return parts.join(" · ");
};
