# Claude Code Trainer – Ideen & Roadmap

Stand: 2026-05-05 · Version 0.5

## Was schon drin ist

- 4 Missionen: `blechntakt-landing`, `gowin-analyse`, `lernprogramm`, `webapp-from-scratch`
- Engine: Mission laden → Levels → 4 Optionen → Feedback-Overlay mit Hintergrund-Log + Insight → Result-Screen
- Persistenz: LocalStorage (Best, Gespielt, ∑ Punkte)
- Style: dunkel/neon/monospace, Boot-Screen, Scanlines
- Deployment: GitHub Pages (statisch, kein Build)

## Schnelle Anleitung: Neue Mission anlegen

1. Datei kopieren: `missions/blechntakt-landing.json` → `missions/<neue-mission>.json`
2. Felder anpassen: `id`, `title`, `subtitle`, `icon`, `difficulty` (1–3), `tagline`, `intro`
3. 6 Levels schreiben – pro Level:
   - **scenario**: Konkrete Situation (was tippt der User gerade?)
   - **4 options**: 1× `correct`, 1–2× `suboptimal`, Rest `wrong`
   - **score** pro Option (0–20, Summe = `totalScore` durch 6 Levels)
   - **consoleLog** bei `correct`: simulierter Hintergrund (Trigger-Scan, Memory-Lookup, Skill-Aktivierung)
   - **insight**: 1–2 Sätze "Warum war das richtig?"
4. In `game.js` → `MISSIONS_INDEX`: neuen Eintrag mit `locked: false`
5. Lokal testen: `python3 -m http.server 8000` → `http://localhost:8000`
6. Commit + Push → GitHub Pages aktualisiert sich von selbst

## Mission-Ideen (Inhalt)

Die stärksten Kandidaten – jede passt thematisch zu Marcos Alltag:

- **`arbeitsblatt-erstellen`** – Schul-AB für Klasse 8 Technik. Trigger: Skill-Aufruf vs. freier Prompt, Brand-Guidelines, Lösungs-PDF
- **`pruefung-vorbereiten`** – Realschulprüfung Technik 2026. Trigger: 2026-Themen-Filter (Memory!), Schulbuch-Urheberrecht
- **`koin-rechnerarchitektur`** – Marcos eigenes Kontaktstudium. Trigger: examRelevant-Symbol, JS-Konventionen für Lessons
- **`gowin-spieltag`** – `/gowin`-Workflow. Trigger: 3 CSVs erkennen, richtigen Sub-Skill (9-Ligen vs. Daily Scout vs. Kontra) wählen
- **`debugging-bug`** – Test schlägt fehl. Trigger: `superpowers:systematic-debugging` aktivieren statt sofort raten
- **`code-review`** – PR liegt vor. Trigger: `/review` vs. `superpowers:code-reviewer` parallel vs. selbst lesen
- **`memory-management`** – Wann saven, wann nicht? Trigger: feedback vs. project vs. reference, Was NICHT gespeichert wird
- **`pluspunkt-ki`** – Schüler:innen sollen mit KI arbeiten, was sagst du? Trigger: pädagogische statt technische Antwort

## Engine-Erweiterungen (Code)

Geordnet nach Aufwand:

**Klein (1–2 h)**

- Mission-Filter: "Nur ungespielte" / "Schwierigkeit" auf Auswahl-Screen
- Streak-Anzeige: X Levels in Folge richtig
- "Warum nicht D?"-Button im Feedback – zeigt Feedback aller Optionen, nicht nur der gewählten
- Tastatur-Shortcuts: A/B/C/D zur Auswahl, Enter = Weiter

**Mittel (halber Tag)**

- Level-Reihenfolge zufällig + Optionen mischen → kein Auswendiglernen
- Hint-System: 1× pro Mission "Tipp aufdecken" (kostet 5 Punkte)
- Mission-Editor im Browser: JSON in einem Textarea bearbeiten + Live-Preview, Export als Datei
- Story-Mode: Missionen bauen aufeinander auf (Landing-Page → Deployment → Bug-Fix → SEO)

**Größer (1–2 Tage)**

- Multiplayer / Klassenraum-Modus: Lehrer-Code, Schüler:innen tippen ihn ein, gemeinsamer Highscore – wäre für Digital-AG perfekt
- Adaptiver Schwierigkeitsgrad: Bei 100% Score → schwerere Variante derselben Mission entsperrt
- "Eigene Situation"-Modus: User tippt sein echtes Problem, Trainer schlägt 4 Prompt-Formulierungen vor und lässt bewerten
- Achievements/Badges: "Brainstorming-Profi", "Skill-Sammler", "Memory-Master"

## UX & Look

- Sound an/aus ist da – aber **welche Sounds**? Aktuell wahrscheinlich keine. Tipp- und Erfolgs-Sounds (8-bit) würden zum Style passen
- Mobile: Boot-Screen kürzen auf kleinen Geräten, Optionen größer (touch ≥ 44px)
- Dark/Light umschaltbar? Aktuell nur dark – passt zum Konzept, aber Klassenraum-Beamer ist oft hell
- Print-Modus: Mission als PDF zum Verteilen für Vertretungsstunden

## Content-Pflege

- **Versionierung der Missions**: Wenn sich ein Skill umbenennt (z. B. `superpowers:brainstorming`), brechen alte Missionen still. → `claudeCodeVersion`-Feld pro Mission, Warnung bei Mismatch
- **Quellen-Feld**: Pro Insight ein optionaler Link auf die echte Doku/Memory-Datei – damit der User nach dem Spiel weiterlesen kann
- **Mission-Stats**: Welches Level hat die niedrigste Lösungsquote? Wenn alle Spieler bei Level 4 scheitern, ist das Level zu schwer formuliert (bräuchte Backend, also nicht mit Pages allein)

## Bemerkung

Der Trainer hat einen seltenen Vorteil: **Die Zielgruppe (du selbst, Lehrkräfte, KOIN-Mitstreiter) ist klein und klar**. Damit kannst du Missionen sehr spezifisch und persönlich halten – eine Mission `koin-rechnerarchitektur` hat bei Hugo Generic null Reichweite, aber bei dir und deinen Studienkolleg:innen ist sie genau richtig. Das ist die Stärke, nicht das Limit.

Die Boot-/Neon-Optik ist mehr als Deko – sie suggeriert "hier passiert was Technisches", das senkt die Hemmschwelle gegenüber dem Inhalt (Skills, Trigger, Memory). Diesen Vibe nicht verwässern, wenn du erweiterst.
