// Übungsanleitungen mit schematischen Zeichnungen (Start → Ende).
// Posen als Gelenkpunkte im Rahmen 180 × 150, Boden bei y = 140.
// Gelenke: h Kopf, n Schulter, p Hüfte, k1/f1/t1 Arbeitsbein (Knie, Ferse,
// Zehen – hervorgehoben), k2/f2/t2 zweites Bein, e1/w1 und e2/w2 Arme.

const W = 180, H = 150, G = 140;

function line(pts, cls) {
  const d = pts.filter(Boolean).map((p) => p.join(",")).join(" ");
  return `<polyline points="${d}" class="${cls}"/>`;
}

function figure(pose) {
  const P = pose;
  let s = "";
  if (P.e2) s += line([P.n, P.e2, P.w2], "limb back");
  if (P.k2) s += line([P.p, P.k2, P.f2, P.t2], "limb back");
  s += line([P.n, P.p], "torso");
  s += line([P.p, P.k1, P.f1, P.t1], P.workArms ? "limb" : "limb work");
  if (P.e1) s += line([P.n, P.e1, P.w1], P.workArms ? "limb work" : "limb");
  s += `<circle cx="${P.h[0]}" cy="${P.h[1]}" r="8" class="head"/>`;
  return s;
}

// Bildausschnitt: gemeinsame Bounding-Box aller Frames einer Übung
function bbox(frames) {
  const xs = [], ys = [];
  const add = (x, y) => { xs.push(x); ys.push(y); };
  for (const f of frames) {
    for (const [k, pt] of Object.entries(f.pose)) {
      if (!Array.isArray(pt)) continue;
      const r = k === "h" ? 12 : 5;
      add(pt[0] - r, pt[1] - r); add(pt[0] + r, pt[1] + r);
    }
    for (const [name, ...a] of f.props || []) {
      if (name === "wallL") add(32, G);
      if (name === "wallR") add(156, G);
      if (name === "step") { add(86, 118); add(154, G); }
      if (name === "pad") { add(a[0] - 2, 134); add(a[0] + 32, G); }
      if (name === "towel") { add(a[0], 136); add(a[0] + 18, G); }
      if (name === "table") { add(114, 92); add(172, G); }
      if (name === "stool") { add(118, 96); add(150, G); }
      if (name === "bag") { add(a[0] - 2, a[1] - 2); add(a[0] + 16, a[1] + 18); }
    }
  }
  add(xs[0], G + 4);
  const pad = 6;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
  const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  // Mindesthöhe, damit liegende Übungen nicht zu flach werden
  const h = Math.max(y1 - y0, (x1 - x0) * 0.45);
  return { x: x0, y: y1 - h, w: x1 - x0, h };
}

let B = { x: 0, y: 0, w: W, h: H };
const PROPS = {
  floor: () => `<line x1="${B.x}" y1="${G}" x2="${B.x + B.w}" y2="${G}" class="floor"/>`,
  wallL: () => `<line x1="38" y1="${B.y}" x2="38" y2="${G}" class="wall"/>`,
  wallR: () => `<line x1="150" y1="${B.y}" x2="150" y2="${G}" class="wall"/>`,
  step: () => `<rect x="90" y="118" width="60" height="22" rx="2" class="prop"/>`,
  pad: (x = 70) => `<rect x="${x}" y="134" width="30" height="6" rx="3" class="prop"/>`,
  towel: (x) => `<rect x="${x}" y="136" width="18" height="4" rx="1" class="towel"/>`,
  table: () => `<rect x="116" y="92" width="56" height="5" rx="2" class="prop"/><line x1="166" y1="97" x2="166" y2="${G}" class="wall"/>`,
  stool: () => `<rect x="118" y="96" width="32" height="6" rx="2" class="prop"/><line x1="122" y1="102" x2="122" y2="${G}" class="wall"/><line x1="146" y1="102" x2="146" y2="${G}" class="wall"/>`,
  bag: (x, y) => `<rect x="${x}" y="${y}" width="14" height="16" rx="3" class="towel"/>`,
  strap: (a, b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="strap"/>`,
};

function arrow(a, b) {
  return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="arrow" marker-end="url(#ah)"/>`;
}

function frame(f) {
  const props = (f.props || []).map(([name, ...args]) => PROPS[name](...args)).join("");
  const arrows = (f.arrows || []).map(([a, b]) => arrow(a, b)).join("");
  return `
    <figure class="frame">
      <svg viewBox="${B.x} ${B.y} ${B.w} ${B.h}" role="img" aria-label="${f.label}">
        <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrowhead"/></marker></defs>
        ${PROPS.floor()}${props}${figure(f.pose)}${arrows}
      </svg>
      <figcaption>${f.label}</figcaption>
    </figure>`;
}

export function illustration(ex) {
  B = bbox(ex.frames);
  const cls = ex.frames.length === 1 ? "frames single" : "frames";
  return `<div class="${cls}">${ex.frames.map(frame).join('<span class="frame-arrow" aria-hidden="true">→</span>')}</div>`;
}

// Liegend auf dem Rücken, Kopf links
const SUP = { h: [20, 131], n: [34, 134] };

export const EXERCISES = {
  bridge: {
    name: "Hüftbrücke (einbeinig)",
    goal: "Gesäß und hinterer Oberschenkel – entlastet das Knie beim Laufen.",
    frames: [
      { label: "Start: Rücken, Füße aufgestellt", pose: { ...SUP, p: [74, 137], k1: [96, 112], f1: [116, 138], t1: [126, 139], k2: [93, 114], f2: [113, 138], e1: [54, 138], w1: [72, 139] } },
      { label: "Ende: Hüfte hoch, ein Bein gestreckt", pose: { ...SUP, p: [72, 112], k1: [100, 108], f1: [116, 138], t1: [126, 139], k2: [96, 97], f2: [120, 83], e1: [54, 138], w1: [72, 139] }, arrows: [[[72, 132], [72, 118]]] },
    ],
    steps: [
      "Auf den Rücken legen, Arme neben dem Körper, Füße hüftbreit nah am Po aufstellen.",
      "Woche 1–4: beide Füße bleiben unten. Ab Woche 5: ein Bein in Verlängerung des Oberschenkels strecken.",
      "Über die Ferse des Standbeins drücken und die Hüfte heben, bis Schulter, Hüfte und Knie eine Linie bilden.",
      "Oben kurz halten, langsam absenken.",
    ],
    knee: [
      "Das Knie des Standbeins zeigt gerade nach oben – nicht nach innen oder außen kippen lassen.",
      "Druck über die Ferse, nicht über die Zehen.",
    ],
    mistakes: ["Hohlkreuz: Hüfte nur so hoch wie die Linie Schulter–Knie.", "Becken kippt zur Seite – lieber zurück zur beidbeinigen Version."],
    video: "einbeinige Hüftbrücke Anleitung",
  },
  slide: {
    name: "Hamstring Slides",
    goal: "Hinterer Oberschenkel – der wichtigste „Ersatz-Stabilisator“ ohne Kreuzband.",
    frames: [
      { label: "Start: Brücke, Fersen auf Handtuch", pose: { ...SUP, p: [70, 117], k1: [96, 104], f1: [112, 136], k2: [94, 106], f2: [110, 136], e1: [54, 138], w1: [70, 139] }, props: [["towel", 104]] },
      { label: "Ende: Fersen gleiten nach vorn", pose: { ...SUP, p: [70, 123], k1: [102, 117], f1: [134, 136], k2: [100, 119], f2: [132, 136], e1: [54, 138], w1: [70, 139] }, props: [["towel", 126]], arrows: [[[112, 130], [132, 130]]] },
    ],
    steps: [
      "Auf den Rücken legen, Fersen auf ein Handtuch (glatter Boden) oder in Socken auf Laminat/Fliesen.",
      "Hüfte leicht anheben (wie Hüftbrücke).",
      "Fersen langsam (3 Sek) nach vorn gleiten lassen, bis die Beine fast gestreckt sind – Hüfte bleibt oben.",
      "Mit Kraft aus dem hinteren Oberschenkel die Fersen wieder heranziehen.",
    ],
    knee: ["Nur so weit strecken, wie du die Hüfte oben halten kannst.", "Krampf im hinteren Oberschenkel = Pause, kurz dehnen, weniger Weg."],
    mistakes: ["Hüfte sackt beim Rausgleiten auf den Boden.", "Zu schnell – die Absenkphase ist der wirksame Teil."],
    video: "Hamstring Slides Handtuch Anleitung",
  },
  wallsit: {
    name: "Wandsitzen",
    goal: "Vorderer Oberschenkel, haltend statt bewegt – knieschonend.",
    frames: [
      { label: "Start: Rücken an der Wand", props: [["wallL"]], pose: { h: [52, 34], n: [52, 46], p: [52, 84], k1: [56, 112], f1: [60, 140], t1: [72, 140], e1: [56, 64], w1: [58, 82] } },
      { label: "Ende: Sitzhaltung halten", props: [["wallL"]], pose: { h: [50, 56], n: [50, 68], p: [50, 106], k1: [80, 106], f1: [80, 140], t1: [92, 140], e1: [60, 86], w1: [74, 98] }, arrows: [[[64, 72], [64, 96]]] },
    ],
    steps: [
      "Mit dem Rücken an eine Wand lehnen, Füße ca. 40 cm vor der Wand, hüftbreit.",
      "Am Rücken nach unten gleiten, bis die Knie etwa im rechten Winkel sind (Anfang: weniger tief ist okay).",
      "Position halten, ruhig weiteratmen.",
      "Zum Aufstehen an der Wand hochschieben.",
    ],
    knee: [
      "Knie genau über den Knöcheln – nicht weiter vor als die Zehen.",
      "Knie zeigen in Richtung 2.–3. Zeh, nicht nach innen.",
      "Ziehen vorne unter der Kniescheibe: weniger tief gehen.",
    ],
    mistakes: ["Füße zu nah an der Wand → Knie schieben über die Zehen.", "Luft anhalten."],
    video: "Wandsitzen richtig Anleitung",
  },
  stepup: {
    name: "Step-ups",
    goal: "Beinkraft einbeinig – entspricht der Belastung beim Laufen.",
    frames: [
      { label: "Start: ein Fuß auf der Stufe", props: [["step"]], pose: { h: [68, 34], n: [68, 46], p: [66, 84], k1: [90, 94], f1: [102, 118], t1: [114, 118], k2: [66, 112], f2: [66, 140], t2: [78, 140], e1: [70, 64], w1: [74, 82] } },
      { label: "Ende: oben aufrecht stehen", props: [["step"]], pose: { h: [110, 14], n: [110, 26], p: [108, 62], k1: [108, 90], f1: [106, 118], t1: [118, 118], k2: [102, 88], f2: [94, 110], e1: [112, 44], w1: [116, 62] }, arrows: [[[84, 70], [100, 52]]] },
    ],
    steps: [
      "Vor eine Treppenstufe stellen (Woche 1–4: unterste Stufe, später gern höher).",
      "Einen Fuß komplett auf die Stufe setzen.",
      "Über die Ferse des oberen Beins hochdrücken, bis du aufrecht stehst – das untere Bein hilft nicht mit.",
      "Langsam (3 Sek) wieder absenken, Fuß bleibt oben. Alle Wiederholungen, dann Seite wechseln.",
    ],
    knee: [
      "Das Knie des oberen Beins bleibt über dem Fuß – auf keinen Fall nach innen fallen lassen.",
      "Am Geländer festhalten ist erlaubt, wenn sich das Knie unsicher anfühlt.",
    ],
    mistakes: ["Mit dem unteren Bein abstoßen.", "Oberkörper weit nach vorn werfen."],
    video: "Step ups Treppe Anleitung Knie",
  },
  balance: {
    name: "Einbeinstand",
    goal: "Gleichgewicht und Reaktion der Muskeln rund ums Knie (Propriozeption).",
    frames: [
      { label: "Start: hüftbreit stehen", pose: { h: [80, 34], n: [80, 46], p: [80, 84], k1: [80, 112], f1: [80, 140], t1: [92, 140], k2: [86, 112], f2: [88, 140], t2: [100, 140], e1: [72, 64], w1: [68, 82] } },
      { label: "Ende: auf einem Bein halten", pose: { h: [80, 34], n: [80, 46], p: [80, 84], k1: [81, 112], f1: [80, 140], t1: [92, 140], k2: [104, 92], f2: [100, 118], e1: [64, 54], w1: [48, 58], e2: [96, 54], w2: [112, 58] }, arrows: [[[110, 112], [110, 96]]] },
    ],
    steps: [
      "Barfuß hüftbreit hinstellen, neben einer Wand oder Stuhllehne zum Festhalten.",
      "Ein Bein anheben, Standbein ganz leicht gebeugt (nicht durchgedrückt).",
      "Halten. Steigerung laut Plan: Augen zu, später auf einem Sofakissen.",
    ],
    knee: ["Standbein-Knie minimal gebeugt und über dem Fuß.", "Wackeln ist gewollt – das trainiert. Festhalten, bevor du kippst."],
    mistakes: ["Knie komplett durchgedrückt.", "Hüfte sackt auf der Seite des angehobenen Beins ab."],
    video: "Einbeinstand Übung Knie Stabilität",
  },
  sideplank: {
    name: "Seitstütz",
    goal: "Seitliche Rumpf- und Hüftmuskeln – halten das Becken beim Laufen stabil.",
    frames: [
      { label: "Start: Seitlage, Ellbogen unter Schulter", pose: { h: [32, 110], n: [42, 120], p: [80, 136], k1: [110, 139], f1: [140, 139], e1: [42, 140], w1: [64, 140] } },
      { label: "Ende: Hüfte hoch, Körper gerade", pose: { h: [32, 110], n: [42, 120], p: [82, 126], k1: [116, 133], f1: [150, 139], e1: [42, 140], w1: [64, 140] }, arrows: [[[82, 140], [82, 132]]] },
    ],
    steps: [
      "Auf die Seite legen, Ellbogen genau unter der Schulter, Unterarm nach vorn.",
      "Woche 1–4: Knie angewinkelt, Stütz auf Unterarm und Knie. Ab Woche 5: Beine gestreckt, Stütz auf Unterarm und Fußkante.",
      "Hüfte anheben, bis Kopf, Hüfte und Füße eine Linie bilden. Halten.",
    ],
    knee: ["Knievariante (Woche 1–4) belastet das Innenband weniger.", "Ziehen an der Knie-Innenseite des unteren Beins: auf die Knievariante zurück."],
    mistakes: ["Hüfte hängt durch oder schiebt nach hinten.", "Schulter rutscht zum Ohr."],
    video: "Seitstütz richtig Anleitung",
  },
  calf: {
    name: "Wadenheben (einbeinig)",
    goal: "Wade und Achillessehne – fangen jeden Laufschritt ab.",
    frames: [
      { label: "Start: auf einem Bein, Ferse unten", props: [["wallR"]], pose: { h: [92, 34], n: [92, 46], p: [92, 84], k1: [92, 112], f1: [90, 140], t1: [104, 140], k2: [96, 112], f2: [80, 120], e1: [112, 58], w1: [148, 60] } },
      { label: "Ende: auf die Zehenspitzen", props: [["wallR"]], pose: { h: [94, 22], n: [94, 34], p: [94, 72], k1: [94, 100], f1: [94, 128], t1: [104, 140], k2: [98, 100], f2: [82, 108], e1: [114, 48], w1: [148, 50] }, arrows: [[[78, 134], [78, 116]]] },
    ],
    steps: [
      "Neben eine Wand stellen, eine Hand an der Wand für die Balance.",
      "Woche 1–4: beidbeinig. Ab Woche 5: auf einem Bein, das andere leicht angewinkelt.",
      "Langsam auf die Zehenspitzen hoch, oben 1 Sek halten, langsam (3 Sek) absenken.",
      "Ab Woche 13 auf einer Stufenkante: Ferse unter Stufenniveau absenken.",
    ],
    knee: ["Standbein-Knie gerade, nicht nach innen.", "Druck über den großen Zeh, nicht über die Außenkante."],
    mistakes: ["Wippen mit Schwung.", "Nur halber Weg nach oben."],
    video: "einbeiniges Wadenheben Anleitung",
  },
  clam: {
    name: "Muschel (Clamshell)",
    goal: "Seitlicher Gesäßmuskel – verhindert, dass das Knie beim Laufen nach innen fällt.",
    frames: [
      { label: "Start: Seitlage, Knie gebeugt, zusammen", pose: { h: [24, 120], n: [38, 126], p: [78, 131], k1: [112, 127], f1: [94, 134], k2: [112, 136], f2: [94, 140], e1: [24, 138], w1: [12, 134], e2: [58, 120], w2: [74, 124] } },
      { label: "Ende: oberes Knie öffnen", pose: { h: [24, 120], n: [38, 126], p: [78, 131], k1: [106, 104], f1: [94, 134], k2: [112, 136], f2: [94, 140], e1: [24, 138], w1: [12, 134], e2: [58, 120], w2: [74, 124] }, arrows: [[[118, 124], [114, 106]]] },
    ],
    steps: [
      "Auf die Seite legen, Kopf auf dem Arm, Hüfte und Knie ca. 45° gebeugt, Füße auf einer Linie mit dem Rücken.",
      "Füße bleiben zusammen. Das obere Knie öffnen wie eine Muschel.",
      "Oben 1 Sek halten, langsam schließen.",
    ],
    knee: ["Kleine, saubere Bewegung reicht. Das Brennen sitzt seitlich am Po, nicht im Knie."],
    mistakes: ["Becken kippt nach hinten mit – oberes Becken bleibt senkrecht über dem unteren.", "Füße lösen sich voneinander."],
    video: "Clamshell Übung Anleitung",
  },
  balancepad: {
    name: "Einbeinstand auf Kissen",
    goal: "Schwierigere Balance – das Knie lernt, auf unebenem Boden stabil zu bleiben.",
    frames: [
      { label: "Start: beide Füße auf dem Kissen", props: [["pad", 66]], pose: { h: [80, 28], n: [80, 40], p: [80, 78], k1: [80, 106], f1: [78, 134], t1: [90, 134], k2: [86, 106], f2: [86, 134], t2: [98, 134], e1: [72, 58], w1: [68, 76] } },
      { label: "Ende: auf einem Bein halten", props: [["pad", 66]], pose: { h: [80, 28], n: [80, 40], p: [80, 78], k1: [81, 106], f1: [80, 134], t1: [92, 134], k2: [104, 86], f2: [100, 112], e1: [64, 48], w1: [48, 52], e2: [96, 48], w2: [112, 52] } },
    ],
    steps: [
      "Woche 1–4 noch auf dem Boden. Danach ein festes Sofakissen oder ein gefaltetes Handtuch nehmen.",
      "Auf ein Bein stellen, Knie leicht gebeugt, halten.",
      "Ab Woche 13: dabei langsam den Kopf nach links und rechts drehen.",
    ],
    knee: ["Wand oder Stuhl in Griffweite. Bei Wegknick-Gefühl sofort festhalten und eine Stufe leichter machen."],
    mistakes: ["Zu weiches Kissen – lieber fest und flach."],
    video: "Einbeinstand Kissen Balance Knie",
  },
  hipflexor: {
    name: "Hüftbeuger-Dehnung",
    goal: "Lockert die Hüftvorderseite – vom Sitzen und Laufen oft verkürzt.",
    frames: [
      { label: "Start: Halbkniestand", props: [["pad", 56]], pose: { h: [82, 60], n: [82, 72], p: [82, 110], k1: [68, 134], f1: [42, 136], k2: [110, 108], f2: [110, 140], t2: [122, 140], e1: [92, 90], w1: [104, 104] } },
      { label: "Ende: Hüfte sanft nach vorn", props: [["pad", 56]], pose: { h: [90, 60], n: [90, 72], p: [90, 110], k1: [68, 134], f1: [42, 136], k2: [114, 110], f2: [112, 140], t2: [124, 140], e1: [98, 92], w1: [110, 106] }, arrows: [[[76, 96], [92, 96]]] },
    ],
    steps: [
      "Ein Knie auf ein Kissen, das andere Bein vorn aufgestellt (Knie über dem Fuß).",
      "Oberkörper aufrecht, Po leicht anspannen.",
      "Hüfte langsam nach vorn schieben, bis es vorne an der Hüfte des hinteren Beins zieht. Halten.",
    ],
    knee: ["Immer ein Kissen unter das hintere Knie.", "Vorderes Knie nicht über die Zehen schieben."],
    mistakes: ["Hohlkreuz statt Hüfte nach vorn."],
    video: "Hüftbeuger dehnen Halbkniestand",
  },
  calfstretch: {
    name: "Wadendehnung an der Wand",
    goal: "Dehnt Wade und Achillessehne nach dem Laufen.",
    frames: [
      { label: "Halteposition", props: [["wallR"]], pose: { h: [124, 46], n: [116, 56], p: [92, 88], k1: [72, 114], f1: [52, 140], t1: [64, 140], k2: [112, 110], f2: [116, 140], t2: [128, 140], e1: [132, 58], w1: [148, 56] } },
    ],
    steps: [
      "Hände an die Wand, ein Bein nach hinten stellen.",
      "Hinteres Bein gestreckt, Ferse bleibt am Boden, Fußspitze zeigt nach vorn.",
      "Hüfte Richtung Wand schieben, bis es in der Wade zieht. Halten.",
    ],
    knee: ["Hinteres Knie gestreckt, aber nicht durchgedrückt."],
    mistakes: ["Ferse hebt ab.", "Fuß zeigt nach außen."],
    video: "Wade dehnen Wand Anleitung",
  },
  hamstretch: {
    name: "Dehnung hinterer Oberschenkel",
    goal: "Dehnt den hinteren Oberschenkel ohne Druck aufs Knie.",
    frames: [
      { label: "Halteposition mit Handtuch", props: [["strap", [86, 100], [104, 90]]], pose: { ...SUP, p: [76, 137], k1: [91, 114], f1: [106, 90], t1: [110, 82], k2: [104, 138], f2: [132, 138], t2: [134, 130], e1: [60, 118], w1: [86, 100] } },
    ],
    steps: [
      "Auf den Rücken legen, ein Handtuch um die Fußsohle legen.",
      "Bein langsam nach oben ziehen, bis es hinten im Oberschenkel zieht. Das andere Bein bleibt am Boden.",
      "Halten, ruhig atmen.",
    ],
    knee: ["Knie des oberen Beins darf leicht gebeugt bleiben – Ziehen in der Kniekehle ist zu viel."],
    mistakes: ["Mit Schwung ziehen.", "Unteres Bein hebt mit ab."],
    video: "hinteren Oberschenkel dehnen liegend Handtuch",
  },
  pushup: {
    name: "Liegestütz am Tisch",
    goal: "Brust, Schultern, Arme – erhält Muskeln beim Abnehmen. Ohne Belastung fürs Knie.",
    frames: [
      { label: "Start: Hände auf der Tischkante, Körper gerade", props: [["table"]], pose: { workArms: true, h: [100, 70], n: [92, 78], p: [64, 106], k1: [46, 123], f1: [30, 138], t1: [24, 140], e1: [108, 86], w1: [122, 94] } },
      { label: "Ende: Brust zur Tischkante senken", props: [["table"]], pose: { workArms: true, h: [116, 82], n: [106, 90], p: [70, 114], k1: [48, 127], f1: [30, 138], t1: [24, 140], e1: [100, 104], w1: [122, 94] }, arrows: [[[90, 72], [100, 84]]] },
    ],
    steps: [
      "Hände schulterbreit auf eine stabile Tischkante (Woche 1–4: an die Wand).",
      "Füße nach hinten, bis der Körper eine gerade Linie von Kopf bis Ferse bildet.",
      "Langsam (2–3 Sek) die Brust zur Kante senken, Ellbogen ca. 45° vom Körper.",
      "Kräftig zurückdrücken. Leichter: näher an den Tisch. Schwerer: später auf den Knien am Boden.",
    ],
    knee: ["Beine bleiben gestreckt und ruhig – das Knie wird nicht belastet.", "Der Tisch muss sicher stehen (gegen die Wand schieben)."],
    mistakes: ["Hüfte hängt durch oder knickt nach oben.", "Ellbogen weit nach außen."],
    video: "Liegestütz erhöht am Tisch Anfänger",
  },
  row: {
    name: "Rucksack-Rudern (einarmig)",
    goal: "Oberer Rücken und Arme – Gegenspieler zum Liegestütz, gut für die Haltung beim Laufen.",
    frames: [
      { label: "Start: abgestützt, Arm hängt mit Rucksack", props: [["stool"], ["bag", 98, 108]], pose: { workArms: true, h: [114, 62], n: [104, 70], p: [72, 92], k1: [66, 116], f1: [62, 140], t1: [72, 140], k2: [86, 116], f2: [90, 140], t2: [100, 140], e1: [104, 89], w1: [105, 108], e2: [118, 82], w2: [128, 96] } },
      { label: "Ende: Ellbogen nach hinten-oben ziehen", props: [["stool"], ["bag", 88, 92]], pose: { workArms: true, h: [114, 62], n: [104, 70], p: [72, 92], k1: [66, 116], f1: [62, 140], t1: [72, 140], k2: [86, 116], f2: [90, 140], t2: [100, 140], e1: [86, 78], w1: [95, 93], e2: [118, 82], w2: [128, 96] }, arrows: [[[110, 104], [100, 92]]] },
    ],
    steps: [
      "Rucksack mit Wasserflaschen packen (Woche 1–4 ca. 4–5 kg, später 6–10 kg).",
      "Eine Hand auf Stuhl oder Hocker stützen, Rücken gerade, Knie leicht gebeugt.",
      "Rucksack mit dem freien Arm zur Hüfte ziehen, Ellbogen dicht am Körper, Schulterblatt nach hinten.",
      "Langsam ablassen. Alle Wiederholungen, dann Seite wechseln.",
    ],
    knee: ["Füße hüftbreit und fest, Knie leicht gebeugt und ruhig – kein Verdrehen.", "Auf stabilen Stuhl oder Hocker stützen, nicht auf etwas mit Rollen."],
    mistakes: ["Rundrücken.", "Mit Schwung aus dem Oberkörper reißen."],
    video: "einarmiges Rudern Rucksack Anleitung",
  },
  superman: {
    name: "Superman (Rückenstrecker)",
    goal: "Rücken, Po und Schultern – stabilisiert den Rumpf beim Laufen.",
    frames: [
      { label: "Start: Bauchlage, Arme lang nach vorn", pose: { workArms: true, h: [30, 131], n: [44, 134], p: [82, 136], k1: [110, 137], f1: [138, 138], e1: [26, 137], w1: [8, 137] } },
      { label: "Ende: Arme und Beine leicht anheben", pose: { workArms: true, h: [32, 125], n: [46, 130], p: [82, 136], k1: [110, 133], f1: [136, 126], e1: [28, 126], w1: [10, 120] }, arrows: [[[16, 136], [14, 124]], [[140, 138], [140, 128]]] },
    ],
    steps: [
      "Auf den Bauch legen (Matte), Arme lang nach vorn, Blick zum Boden.",
      "Arme, Brust und Beine gleichzeitig wenige Zentimeter anheben.",
      "2 Sek halten (später 3 Sek), langsam ablegen.",
    ],
    knee: ["Beine gestreckt, nur leicht anheben – kein Hohlkreuz erzwingen.", "Kissen unter die Knie, falls die Kniescheibe drückt."],
    mistakes: ["Kopf in den Nacken legen.", "Zu hoch heben – wenige Zentimeter reichen."],
    video: "Superman Übung Rücken Anleitung",
  },
  legswing: {
    name: "Beinpendeln (Mobilisation)",
    goal: "Wärmt Hüfte und Beine auf und hilft gegen das „Unrunde“ am Anfang des Laufs.",
    frames: [
      { label: "Bein nach vorn pendeln", props: [["wallL"]], pose: { h: [80, 34], n: [80, 46], p: [80, 84], k1: [102, 101], f1: [124, 118], t1: [130, 110], k2: [80, 112], f2: [80, 140], t2: [92, 140], e1: [62, 60], w1: [40, 64] } },
      { label: "… und locker nach hinten", props: [["wallL"]], pose: { h: [80, 34], n: [80, 46], p: [80, 84], k1: [66, 108], f1: [52, 132], t1: [60, 136], k2: [80, 112], f2: [80, 140], t2: [92, 140], e1: [62, 60], w1: [40, 64] } },
    ],
    steps: [
      "Vor dem Lauf, nach 5 Min zügigem Gehen.",
      "Mit einer Hand an Baum, Laterne oder Wand festhalten.",
      "Das äußere Bein locker vor und zurück pendeln, 10 × pro Bein. Danach 10 × seitlich vor dem Körper.",
      "Zum Abschluss je 10 Fußkreise und 10 Hüftkreise.",
    ],
    knee: ["Locker pendeln, nicht kicken. Die Höhe kommt von allein."],
    mistakes: ["Oberkörper schwingt mit."],
    video: "Beinpendeln Aufwärmen Laufen",
  },
};
