// Trainingspläne ab Mo 09.11.2026.
//
// Rohat: 18 Wochen bis 20 km (So 14.03.2027), danach Erhaltung. Knieschonend
// wegen nicht operierter Kreuzbänder: Knie-Kraft ist Pflicht, Pamela Reif ohne
// Sprünge, in Woche 1–4 keine Intervalle. Entlastung in Woche 4, 8, 12, 15.
// Fürs Abnehmen (105 → 85 kg): Oberkörper-Kraft in Kraft A, optional Mo
// gelenkschonendes Cardio – bewusst kein zusätzlicher Lauf.
// Steffi: 8 Wochen Studio-Wiedereinstieg (Woche 4 Entlastung).

export const PLAN_START = "2026-11-09";
export const PLAN_VERSION = 2;
export const PEOPLE = { rohat: "Rohat", steffi: "Steffi" };
export const GOAL_WEEK = 18;
export const WEEKS = { rohat: 26, steffi: 8 }; // Rohat: 18 + 8 Wochen Erhaltung

const yt = (q) =>
  "https://www.youtube.com/results?search_query=" + encodeURIComponent("Pamela Reif " + q);

// Pamela-Reif-Einheiten ohne Sprünge – rotierend, gemeinsam
const REIF = [
  { title: "Pamela Reif – Full Body ohne Sprünge", q: "full body no jumping", min: 20 },
  { title: "Pamela Reif – Ab Workout", q: "ab workout", min: 15 },
  { title: "Pamela Reif – Low Impact Cardio", q: "low impact cardio no jumping", min: 20 },
  { title: "Pamela Reif – Stretching & Mobility", q: "stretching mobility", min: 15 },
];

// ---- Rohat: Laufplan (Index = Woche − 1) ----
const DELOAD = [4, 8, 12, 15];
const LONG_KM = [4, 5, 6, 4, 7, 8, 9, 7, 10, 11, 12, 9, 13, 14, 11, 16, 18, 20];
const LONG_NOTE = [
  "4 Min laufen / 1 Min gehen im Wechsel",
  "6 Min laufen / 1 Min gehen im Wechsel",
  "8 Min laufen / 1 Min gehen im Wechsel",
  "Entlastung – Gehpausen erlaubt",
  "Erstmals am Stück. Gehpausen sind trotzdem okay.",
  "", "", "Entlastung",
  "", "", "", "Entlastung",
  "Getränk mitnehmen.",
  "Getränk mitnehmen.",
  "Entlastung",
  "Getränk + Energie (Gel, Datteln) ab ca. km 10.",
  "Getränk + Energie ab ca. km 10. Generalprobe fürs Ziel.",
  "🎯 Ziel! Ganz ruhig angehen, Getränk + Energie ab km 10.",
];
const EASY_MIN = [25, 30, 30, 25, 35, 35, 40, 30, 40, 45, 45, 35, 45, 50, 40, 50, 50, 40];
const EASY_NOTE = ["4 Min laufen / 1 Min gehen im Wechsel", "Gehpausen nach Gefühl", "", ""];
const QUALITY = [
  ["Lockerer Lauf", "25 Min locker, 4 Min laufen / 1 Min gehen."],
  ["Lockerer Lauf", "25 Min locker. Noch keine Intervalle – Bänder und Sehnen gewöhnen sich."],
  ["Lockerer Lauf + Steigerungen", "30 Min locker, am Ende 4 × 15 Sek etwas schneller (nicht sprinten)."],
  ["Lockerer Lauf", "Entlastung: 25 Min locker."],
  ["Fahrtspiel", "10 Min einlaufen · 6 × 1 Min zügig / 2 Min locker · 5 Min auslaufen."],
  ["Fahrtspiel", "10 Min einlaufen · 6 × 2 Min zügig / 2 Min locker · 5 Min auslaufen."],
  ["Fahrtspiel", "10 Min einlaufen · 5 × 3 Min zügig / 2 Min locker · 5 Min auslaufen."],
  ["Lockerer Lauf", "Entlastung: 30 Min locker."],
  ["Intervalle", "10 Min einlaufen · 4 × 4 Min zügig / 2 Min locker · 10 Min auslaufen."],
  ["Intervalle", "10 Min einlaufen · 4 × 5 Min zügig / 2 Min locker · 10 Min auslaufen."],
  ["Intervalle", "10 Min einlaufen · 3 × 8 Min zügig / 3 Min locker · 10 Min auslaufen."],
  ["Lockerer Lauf", "Entlastung: 30 Min locker."],
  ["Tempodauerlauf", "10 Min einlaufen · 15 Min zügig am Stück · 10 Min auslaufen."],
  ["Tempodauerlauf", "10 Min einlaufen · 20 Min zügig am Stück · 10 Min auslaufen."],
  ["Lockerer Lauf", "Entlastung: 30 Min locker."],
  ["Tempodauerlauf", "10 Min einlaufen · 25 Min zügig am Stück · 10 Min auslaufen."],
  ["Tempodauerlauf", "10 Min einlaufen · 20 Min zügig am Stück · 10 Min auslaufen."],
  ["Lockerer Lauf", "30 Min locker – Kraft sparen für Sonntag."],
];
const RUN_PREP = "Vorher 5 Min zügig gehen + Mobilisation. Flacher, ebener Weg, bergab gehen.";

// ---- Rohat: Knie-Kraft. Dosierung je Phase: [Woche 1–4, 5–12, ab 13] ----
const phase = (w) => (w <= 4 ? 0 : w <= 12 ? 1 : 2);
const KRAFT_A = [
  ["bridge", ["beidbeinig 3 × 12", "einbeinig 3 × 8 pro Bein", "einbeinig 3 × 12 pro Bein, oben 2 Sek halten"]],
  ["slide", ["beidbeinig 2 × 6", "beidbeinig 3 × 8", "beidbeinig 3 × 10"]],
  ["wallsit", ["3 × 20 Sek", "3 × 30–45 Sek", "3 × 60 Sek"]],
  ["stepup", ["niedrige Stufe, 2 × 8 pro Bein", "3 × 10 pro Bein", "3 × 12 pro Bein, 3 Sek absenken"]],
  ["balance", ["3 × 30 Sek pro Bein", "3 × 30 Sek pro Bein, Augen zu", "3 × 45 Sek pro Bein auf Kissen"]],
  ["sideplank", ["auf den Knien, 3 × 20 Sek pro Seite", "3 × 30 Sek pro Seite", "3 × 45 Sek pro Seite"]],
  ["calf", ["beidbeinig 3 × 15", "einbeinig 3 × 12", "einbeinig auf Stufenkante 3 × 15"]],
  // Oberkörper: erhält Muskeln im Kaloriendefizit
  ["pushup", ["an der Wand 2 × 10", "am Tisch 3 × 8", "am Tisch 3 × 12 (oder auf den Knien)"]],
  ["row", ["Rucksack 4–5 kg, 2 × 10 pro Arm", "Rucksack 6–8 kg, 3 × 10 pro Arm", "Rucksack 8–10 kg, 3 × 12 pro Arm"]],
  ["superman", ["2 × 8, oben 2 Sek halten", "3 × 10, oben 2 Sek halten", "3 × 12, oben 3 Sek halten"]],
];
// Gelenkschonendes Cardio für die Fettverbrennung (Minuten je Phase)
const LOW_CARDIO = [30, 40, 45];
const KRAFT_B = [
  ["clam", ["2 × 15 pro Seite", "3 × 15 pro Seite", "3 × 20 pro Seite"]],
  ["balancepad", ["auf dem Boden, 3 × 30 Sek pro Bein", "auf Kissen, 3 × 30 Sek pro Bein", "auf Kissen, 3 × 45 Sek, Kopf drehen"]],
  ["hipflexor", ["2 × 30 Sek pro Seite", "2 × 30 Sek pro Seite", "2 × 45 Sek pro Seite"]],
  ["calfstretch", ["2 × 30 Sek pro Bein", "2 × 30 Sek pro Bein", "2 × 45 Sek pro Bein"]],
  ["hamstretch", ["2 × 30 Sek pro Bein", "2 × 30 Sek pro Bein", "2 × 45 Sek pro Bein"]],
];
const dose = (list, w) => list.map(([id, d]) => ({ id, dose: d[phase(w)] }));

function rohatWeek(week) {
  if (week <= GOAL_WEEK) {
    const i = week - 1;
    return { long: LONG_KM[i], longNote: LONG_NOTE[i], easy: EASY_MIN[i], easyNote: EASY_NOTE[i] || "", quality: QUALITY[i] };
  }
  // Erhaltung: im Wechsel 20 km und 13 km, jede 4. Woche Entlastung
  const m = week - GOAL_WEEK;
  if (m % 4 === 0) return { long: 10, longNote: "Entlastung", easy: 35, easyNote: "", quality: ["Lockerer Lauf", "Entlastung: 30 Min locker."] };
  return m % 2
    ? { long: 13, longNote: "", easy: 45, easyNote: "", quality: ["Tempodauerlauf", "10 Min einlaufen · 20 Min zügig am Stück · 10 Min auslaufen."] }
    : { long: 20, longNote: "Getränk + Energie ab km 10.", easy: 45, easyNote: "", quality: ["Fahrtspiel", "10 Min einlaufen · 6 × 2 Min zügig / 2 Min locker · 5 Min auslaufen."] };
}

export function isDeload(person, week) {
  if (person === "steffi") return week === 4;
  return week <= GOAL_WEEK ? DELOAD.includes(week) : (week - GOAL_WEEK) % 4 === 0;
}

export function weekLabel(person, week) {
  if (person === "rohat" && week === GOAL_WEEK) return "Zielwoche 20 km";
  return isDeload(person, week) ? "Entlastung" : "";
}

// ---- Steffi: Studio Ganzkörper A/B ----
const STUDIO_A = ["Beinpresse", "Latzug", "Brustpresse", "Rudern sitzend (Maschine)", "Plank"];
const STUDIO_B = ["Goblet Squat (Kurzhantel)", "Rumänisches Kreuzheben (Kurzhantel)", "Schulterdrücken (Kurzhantel)", "Kabelrudern", "Ausfallschritte", "Seitstütz"];
const SETS = [
  "2 × 12–15, leichtes Gewicht – Technik lernen",
  "3 × 12–15, leichtes Gewicht",
  "3 × 12, etwas mehr Gewicht",
  "Entlastung: 2 × 12, Gewicht wie Woche 2",
  "3 × 10, Gewicht steigern",
  "3 × 10, Gewicht steigern",
  "3 × 8–10, fordernd, 2 Wdh. Reserve",
  "3 × 8–10, Bestwerte notieren",
];
const CARDIO = [20, 25, 25, 20, 30, 30, 30, 35];

export function sessionsFor(person, week) {
  const reif = REIF[(week - 1) % REIF.length];
  const reifSession = {
    id: "reif", type: "reif", day: "Sa", together: true,
    title: reif.title, minutes: reif.min,
    detail: "Gemeinsam mit " + (person === "rohat" ? "Steffi" : "Rohat") + " · Video ohne Sprünge auf YouTube aussuchen",
    link: yt(reif.q),
  };

  if (person === "rohat") {
    const r = rohatWeek(week);
    return [
      {
        id: "cardio-low", type: "cardio", day: "Mo", optional: true, knee: true, minutes: LOW_CARDIO[phase(week)],
        title: "Gelenkschonendes Cardio",
        detail: `${LOW_CARDIO[phase(week)]} Min zügig gehen oder Rad fahren – Puls etwas erhöht, Unterhaltung noch möglich. Empfohlen fürs Abnehmen, schont das Knie.`,
      },
      {
        id: "easy", type: "lauf", day: "Di", knee: true, minutes: r.easy,
        title: "Lockerer Lauf",
        detail: `${r.easy} Min im Plauder-Tempo.${r.easyNote ? " " + r.easyNote + "." : ""} ${RUN_PREP}`,
        exercises: [{ id: "legswing", dose: "vor dem Lauf, 10 × pro Bein" }],
      },
      {
        id: "kraft-a", type: "kraft", day: "Mi", knee: true, minutes: 35,
        title: "Knie-Kraft A + Oberkörper",
        detail: "Langsam und kontrolliert. Kein Schmerz über 2 von 10. Übung antippen für die Anleitung.",
        exercises: dose(KRAFT_A, week),
      },
      {
        id: "quality", type: "lauf", day: "Do", knee: true, minutes: null,
        title: r.quality[0],
        detail: `${r.quality[1]} ${RUN_PREP}`,
        exercises: [{ id: "legswing", dose: "vor dem Lauf, 10 × pro Bein" }],
      },
      {
        id: "kraft-b", type: "kraft", day: "Fr", optional: true, knee: true, minutes: 15,
        title: "Knie-Kraft B · Balance & Dehnen",
        detail: "Optional, ideal am Tag nach dem Qualitätslauf.",
        exercises: dose(KRAFT_B, week),
      },
      reifSession,
      {
        id: "long", type: "lauf", day: "So", knee: true, minutes: null, km: r.long,
        title: `Langer Lauf · ${r.long} km`,
        detail: `${r.long} km sehr locker – Tempo egal, ankommen zählt.${r.longNote ? " " + r.longNote.replace(/([^.!])$/, "$1.") : ""} ${RUN_PREP}`,
        exercises: [{ id: "legswing", dose: "vor dem Lauf, 10 × pro Bein" }],
      },
    ];
  }

  const w = week - 1;
  return [
    {
      id: "studio-a", type: "studio", day: "Mo", minutes: 50,
      title: "Studio · Ganzkörper A",
      detail: "10 Min Aufwärmen (Rad/Crosstrainer) · " + SETS[w],
      exercises: STUDIO_A,
    },
    {
      id: "studio-b", type: "studio", day: "Mi", minutes: 50,
      title: "Studio · Ganzkörper B",
      detail: "10 Min Aufwärmen (Rad/Crosstrainer) · " + SETS[w],
      exercises: STUDIO_B,
    },
    reifSession,
    {
      id: "cardio", type: "cardio", day: "Fr", optional: true, minutes: CARDIO[w],
      title: "Cardio oder Lauf mit Rohat",
      detail: `${CARDIO[w]} Min locker – Crosstrainer, Rad, Laufband oder draußen zusammen.`,
    },
  ];
}
