# Claude Code Trainer

Spielerisch lernen, **wann** man **welches** Trigger-Wort, welchen Skill und welches Tool in Claude Code einsetzt.

## Aufbau

- `index.html` – Single-Page-App
- `style.css` – Game-Style (dunkel, neon, monospace)
- `game.js` – Engine: Mission laden, Levels durchgehen, Score, LocalStorage
- `missions/` – Eine JSON-Datei pro Mission (erweiterbar)

## Mission hinzufügen

1. Neue Datei in `missions/` (z.B. `missions/mein-szenario.json`) – Schema siehe `missions/blechntakt-landing.json`.
2. In `game.js` den Eintrag in `MISSIONS_INDEX` ergänzen, `locked: false`.

## Lokal starten

```bash
cd ~/Desktop/claude-code-trainer
python3 -m http.server 8000
# → http://localhost:8000
```

## Deployment

GitHub Pages (statisch, kein Build).
