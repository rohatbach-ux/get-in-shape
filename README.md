# Get in Shape

Web-App (PWA) für das iPhone: 8-Wochen-Trainingsplan für Rohat und Steffi, Essensplan mit Rezepten von Alnatura und Steffen Henssler sowie eine Einkaufsliste, die sich an die geteilte iCloud-Liste in **Erinnerungen** senden lässt.

## Funktionen

- **Training:** Je ein Plan für Rohat (Laufen im Freien und Pamela Reif ohne Geräte) und für Steffi (Studio Ganzkörper A/B, Pamela Reif und Cardio). Pro Woche 3 feste und 1 optionale Einheit. Woche 4 dient der Entlastung, Woche 8 schließt mit einem 5-km-Test ab.
  - Einheiten werden mit Gefühl (1–5) und optionaler Notiz bestätigt.
  - Die App zeigt den Wochenfortschritt, eine Wochen-Serie und die Zahl der Einheiten gesamt.
- **Essen:** 19 Rezepte, 12 davon vegetarisch oder vegan. Die App zeigt kcal pro Portion und die Zubereitungszeit. Rezepte lassen sich pro Tag einplanen und die Portionen anpassen. „Woche vorschlagen“ füllt freie Tage mit etwa ⅔ Veggie-Gerichten.
- **Einkauf:** Die Zutaten der Woche werden zusammengefasst und nach Rubriken sortiert. Gewürze und Öle stehen unter „Vorrat prüfen“. Eigene Artikel lassen sich ergänzen, alles kann abgehakt werden.
  - **„An Erinnerungen senden“** überträgt jeden offenen Artikel einzeln in die geteilte Liste. Schon gesendete Artikel werden beim nächsten Mal übersprungen.
  - **„Teilen / Kopieren“** schickt die Liste als Text, z. B. per WhatsApp.

## Rezeptdaten

Zutaten, Mengen und kcal stammen von den Originalseiten (alnatura.de, henssler.shop), Stand Oktober 2026. Die Zubereitung steht bewusst nur im verlinkten Original. Wo die Quelle eine Menge oder den kcal-Bezug nicht eindeutig angibt, zeigt die App „Menge lt. Rezept“ oder einen gelben Hinweis. Erweitern lässt sich die Sammlung in `js/recipes.js`.

## Einrichtung

### 1. Hosting

Die App besteht nur aus statischen Dateien und braucht keinen Build-Schritt. Möglichkeiten:

- **GitHub Pages:** *Settings → Pages → Source: Deploy from a branch*, Branch wählen, Ordner `/ (root)`. Bei einem **privaten** Repo setzt das GitHub Pro voraus.
- Alternativ den Ordner bei Netlify Drop oder Cloudflare Pages hochladen.

### 2. Auf dem iPhone installieren (beide)

URL in **Safari** öffnen, dann *Teilen → „Zum Home-Bildschirm“*.

### 3. Erinnerungen-Liste teilen (einmalig)

1. In der App *Erinnerungen* eine Liste **„Einkauf“** anlegen. Mit dem Listentyp *Einkaufsliste* (ab iOS 17) sortiert iOS die Artikel automatisch nach Rubriken.
2. Liste → *Teilen* → Steffi einladen.

### 4. Kurzbefehl anlegen (auf jedem iPhone, das senden soll)

App *Kurzbefehle* öffnen, dann **+** tippen. Name: **Einkauf an Erinnerungen** (lässt sich unter *Mehr* in der App ändern).

1. Aktion **Text teilen**: Eingabe *Kurzbefehleingabe*, Trennen bei *Neue Zeilen*
2. Aktion **Wiederholen mit jedem Objekt** in *Geteilter Text*
3. In der Schleife die Aktion **Erinnerung hinzufügen**: Text *Wiederholungsobjekt*, Liste *Einkauf*

In der App unter *Mehr → Test senden* lässt sich der Kurzbefehl prüfen.

## Daten

Alle Daten liegen lokal auf dem jeweiligen iPhone (`localStorage`), es gibt keinen Server. Unter *Mehr* kann man eine Sicherung als JSON exportieren und wieder laden.

## Technik

`index.html`, `css/styles.css`, `js/app.js` (UI), `js/training.js` (Plan), `js/recipes.js` (Rezepte), `sw.js` (Offline-Cache, bei Updates `VERSION` erhöhen), `manifest.webmanifest`.
