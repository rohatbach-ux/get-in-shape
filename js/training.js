// 8-Wochen-Plan für den Wiedereinstieg (3–4 Einheiten/Woche).
// Woche 4 ist eine Entlastungswoche, Woche 8 die Abschlusswoche.
// Für Steffi liegen die Studio-Einheiten bewusst nicht auf denselben Tagen
// wie Rohats Läufe, sodass die gemeinsame Pamela-Reif-Einheit frei planbar ist.

export const WEEKS = 8;

const yt = (q) =>
  "https://www.youtube.com/results?search_query=" + encodeURIComponent("Pamela Reif " + q);

// Pamela-Reif-Einheiten (ohne Geräte) – rotierend, gemeinsam
const REIF = [
  { title: "Pamela Reif – Full Body (ohne Geräte)", q: "full body workout no equipment", min: 20 },
  { title: "Pamela Reif – Ab Workout + Booty", q: "ab workout booty workout", min: 25 },
  { title: "Pamela Reif – Dance Workout", q: "dance workout", min: 20 },
  { title: "Pamela Reif – Full Body Intense", q: "full body intense", min: 30 },
];

// Rohat: Lauf A (locker), Lauf B (Intervalle/Tempo), Lauf C (lang, optional)
const RUN_EASY = [25, 28, 30, 25, 32, 35, 38, 40];
const RUN_LONG = [35, 40, 45, 35, 50, 55, 45, 60];
const RUN_INTERVAL = [
  "Einlaufen 10 Min · 6 × 1 Min zügig / 2 Min locker · Auslaufen 5 Min",
  "Einlaufen 10 Min · 6 × 2 Min zügig / 2 Min locker · Auslaufen 5 Min",
  "Einlaufen 10 Min · 5 × 3 Min zügig / 2 Min locker · Auslaufen 5 Min",
  "Entlastung: 25 Min locker, am Ende 4 × 20 Sek Steigerungsläufe",
  "Einlaufen 10 Min · 4 × 4 Min zügig / 2 Min locker · Auslaufen 5 Min",
  "Einlaufen 10 Min · 15 Min Tempodauerlauf · Auslaufen 10 Min",
  "Einlaufen 10 Min · 3 × 6 Min zügig / 2 Min locker · Auslaufen 5 Min",
  "Abschluss: 5 km auf Zeit (vorher 10 Min einlaufen)",
];

// Steffi: Studio Ganzkörper A/B
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
  const w = week - 1;
  const reif = REIF[w % REIF.length];
  const reifSession = {
    id: `reif-w${week}`,
    type: "reif",
    title: reif.title,
    minutes: reif.min,
    detail: "Gemeinsam mit " + (person === "rohat" ? "Steffi" : "Rohat") + " · Video auf YouTube aussuchen",
    link: yt(reif.q),
    together: true,
    day: "Sa",
  };

  if (person === "rohat") {
    return [
      {
        id: `run-easy-w${week}`, type: "lauf", day: "Di",
        title: "Lockerer Dauerlauf", minutes: RUN_EASY[w],
        detail: `${RUN_EASY[w]} Min im Plauder-Tempo (du kannst dabei reden).`,
      },
      {
        id: `run-int-w${week}`, type: "lauf", day: "Do",
        title: week === 8 ? "Abschlusstest 5 km" : "Intervall-Lauf", minutes: null,
        detail: RUN_INTERVAL[w],
      },
      reifSession,
      {
        id: `run-long-w${week}`, type: "lauf", day: "So", optional: true,
        title: "Langer, lockerer Lauf", minutes: RUN_LONG[w],
        detail: `${RUN_LONG[w]} Min sehr locker. Optional – lieber auslassen als überziehen.`,
      },
    ];
  }

  return [
    {
      id: `studio-a-w${week}`, type: "studio", day: "Mo",
      title: "Studio · Ganzkörper A", minutes: 50,
      detail: "10 Min Aufwärmen (Rad/Crosstrainer) · " + SETS[w],
      exercises: STUDIO_A,
    },
    {
      id: `studio-b-w${week}`, type: "studio", day: "Mi",
      title: "Studio · Ganzkörper B", minutes: 50,
      detail: "10 Min Aufwärmen (Rad/Crosstrainer) · " + SETS[w],
      exercises: STUDIO_B,
    },
    reifSession,
    {
      id: `cardio-w${week}`, type: "cardio", day: "Fr", optional: true,
      title: "Cardio oder Lauf mit Rohat", minutes: CARDIO[w],
      detail: `${CARDIO[w]} Min locker – Crosstrainer, Rad, Laufband oder draußen zusammen.`,
    },
  ];
}

export const PEOPLE = { rohat: "Rohat", steffi: "Steffi" };
