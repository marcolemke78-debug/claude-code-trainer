/* ============================================================
   CLAUDE CODE TRAINER — Game Engine
   Vanilla JS. Extensible via JSON missions.
   ============================================================ */

// ---- Mission Index (extensible) -----------------------------
// Metadaten hier zentral pflegen, damit die Grid-Anzeige nicht von einem
// JSON-Fetch abhängt (war Auslöser für den iPad-Render-Bug in v0.1).
const MISSIONS_INDEX = [
  {
    id: "blechntakt-landing",
    file: "missions/blechntakt-landing.json",
    title: "Landing Page für Blech'N'Takt",
    subtitle: "Sommerkonzert 15.07.2026",
    icon: "🎺",
    difficulty: 1,
    tagline: "Lerne, wann du welches Trigger-Wort einsetzt – am Beispiel einer Band-Landing-Page.",
    levelCount: 6,
    locked: false
  },
  {
    id: "lernprogramm",
    file: "missions/lernprogramm.json",
    title: "Lernprogramm für Leonie",
    subtitle: "Mathe Klasse 8 – Quadratische Funktionen",
    icon: "📚",
    difficulty: 2,
    tagline: "Wie startest du eine Schul-Lern-App ohne Brainstorming-Marathon?",
    levelCount: 6,
    locked: false
  },
  {
    id: "gowin-analyse",
    file: "missions/gowin-analyse.json",
    title: "GoWin Spieltag-Analyse",
    subtitle: "Skill, Memory & API",
    icon: "📊",
    difficulty: 3,
    tagline: "Skill-Trigger, CSV-Erkennung, Wettzettel-Pflicht und Manager-Modus richtig orchestrieren.",
    levelCount: 6,
    locked: false
  },
  {
    id: "webapp-from-scratch",
    file: "missions/webapp-from-scratch.json",
    title: "Web-App von Null",
    subtitle: "Allgemeine Best Practices",
    icon: "🚀",
    difficulty: 2,
    tagline: "Worktree, Tests, Deploy – wann lohnt was bei einem brandneuen Projekt?",
    levelCount: 6,
    locked: false
  }
];

// ---- State --------------------------------------------------
const state = {
  mission: null,
  levelIdx: 0,
  score: 0,
  answers: [],
  muted: false,
  audioCtx: null
};

// ---- Storage ------------------------------------------------
const STORAGE_KEY = "ccTrainer.v1";

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { bests: {}, plays: 0, totalPoints: 0, muted: false };
  } catch {
    return { bests: {}, plays: 0, totalPoints: 0, muted: false };
  }
}

function saveStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage nicht verfügbar", e);
  }
}

// ---- Screens ------------------------------------------------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const screen = document.getElementById(id);
  if (screen) screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---- Sounds (Web Audio API) ---------------------------------
function ensureAudioCtx() {
  if (!state.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) state.audioCtx = new Ctx();
  }
  return state.audioCtx;
}

function tone(freq, duration, type = "sine", gain = 0.08) {
  if (state.muted) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(ctx.destination);
  const now = ctx.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

function sound(type) {
  switch (type) {
    case "tick":     return tone(880, 0.04, "square", 0.04);
    case "click":    return tone(440, 0.05, "triangle", 0.06);
    case "correct":  tone(523.25, 0.1, "triangle", 0.1); setTimeout(() => tone(783.99, 0.18, "triangle", 0.1), 90); break;
    case "suboptimal": tone(440, 0.15, "sawtooth", 0.07); break;
    case "wrong":    tone(220, 0.12, "sawtooth", 0.1); setTimeout(() => tone(165, 0.18, "sawtooth", 0.1), 100); break;
    case "win":      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.09), i * 90)); break;
  }
}

// ---- Boot Animation -----------------------------------------
const BOOT_LINES = [
  "$ claude-code --trainer",
  "[BOOT] loading missions ......... ok",
  "[BOOT] reading MEMORY.md ........ ok",
  "[BOOT] skill registry ........... 47 skills",
  "[BOOT] hooks active ............. 3",
  "[OK]   system ready. mission select ▸"
];

async function typewriter(el, lines, charDelay = 14, lineDelay = 180) {
  el.textContent = "";
  for (const line of lines) {
    for (const ch of line) {
      el.textContent += ch;
      if (ch !== " ") sound("tick");
      await sleep(charDelay);
    }
    el.textContent += "\n";
    await sleep(lineDelay);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- Stats Strip --------------------------------------------
function renderStats() {
  const data = loadStorage();
  const bests = Object.values(data.bests || {});
  const best = bests.length ? Math.max(...bests) : null;
  document.getElementById("stat-best").textContent = best !== null ? best : "—";
  document.getElementById("stat-plays").textContent = data.plays || 0;
  document.getElementById("stat-total").textContent = data.totalPoints || 0;

  state.muted = !!data.muted;
  const muteBtn = document.getElementById("btn-mute");
  muteBtn.textContent = state.muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-pressed", state.muted);
}

// ---- Mission Grid -------------------------------------------
function renderMissionGrid() {
  const grid = document.getElementById("mission-grid");
  grid.textContent = "";
  const data = loadStorage();

  for (const meta of MISSIONS_INDEX) {
    const card = document.createElement("button");
    card.className = "mission-card" + (meta.locked ? " locked" : "");
    card.disabled = !!meta.locked;

    const best = data.bests[meta.id];
    const diffDots = Array.from({ length: 3 }, (_, i) =>
      `<span class="${i < (meta.difficulty || 1) ? "on" : ""}"></span>`
    ).join("");

    let footRight;
    if (meta.locked) {
      footRight = "🔒 LOCKED";
    } else if (best != null) {
      footRight = `BEST <span class="mission-best">${best}</span>`;
    } else {
      footRight = `${meta.levelCount || ""} Level`;
    }

    card.innerHTML = `
      <span class="mission-icon">${meta.icon || "🎯"}</span>
      <div class="mission-card-title">${escapeHtml(meta.title || meta.id)}</div>
      <div class="mission-card-subtitle">${escapeHtml(meta.subtitle || "")}</div>
      <div class="mission-card-tag">${escapeHtml(meta.tagline || "")}</div>
      <div class="mission-card-foot">
        <span class="difficulty" aria-label="Schwierigkeit">${diffDots}</span>
        <span>${footRight}</span>
      </div>
    `;

    if (!meta.locked) {
      card.addEventListener("click", () => {
        sound("click");
        startMission(meta.id);
      });
    }

    grid.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---- Mission Loading ----------------------------------------
const APP_VERSION = "0.5";
const _missionCache = {};
async function loadMission(file) {
  if (_missionCache[file]) return _missionCache[file];
  const url = file + "?v=" + APP_VERSION;
  // Bewusst KEIN cache:"no-cache" – das löst in Safari "Load failed" aus.
  // Cache-Busting läuft über die Query-String-Versionierung.
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error("Netzwerk: " + (e && e.message ? e.message : e) + " (URL: " + url + ")");
  }
  if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText + " bei " + url);
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error("JSON-Parse: " + (e && e.message ? e.message : e) + " (URL: " + url + ")");
  }
  _missionCache[file] = json;
  return json;
}

// ---- Game Loop ----------------------------------------------
async function startMission(missionId) {
  const meta = MISSIONS_INDEX.find(m => m.id === missionId);
  if (!meta) return;

  try {
    state.mission = await loadMission(meta.file);
  } catch (e) {
    console.error("Mission load failed:", e);
    alert("Mission konnte nicht geladen werden.\n\n" +
      "Fehler: " + (e && e.message ? e.message : String(e)) + "\n\n" +
      "Tipp: Browser-Cache leeren (auf Mac ⌘+⇧+R, auf iPad: Adresse antippen + Enter).");
    return;
  }

  state.levelIdx = 0;
  state.score = 0;
  state.answers = [];

  document.getElementById("lvl-total").textContent = state.mission.levels.length;
  showScreen("screen-game");
  renderLevel();
}

function renderLevel() {
  const lvl = state.mission.levels[state.levelIdx];
  document.getElementById("lvl-current").textContent = state.levelIdx + 1;
  document.getElementById("score-current").textContent = state.score;
  document.getElementById("level-title").textContent = lvl.title;
  document.getElementById("level-scenario").textContent = lvl.scenario;

  const tipBox = document.getElementById("level-tip-box");
  if (lvl.tip) {
    document.getElementById("level-tip").textContent = lvl.tip;
    tipBox.style.display = "";
  } else {
    tipBox.style.display = "none";
  }

  const progress = ((state.levelIdx) / state.mission.levels.length) * 100;
  document.getElementById("progress-fill").style.width = progress + "%";

  const optionsEl = document.getElementById("options");
  optionsEl.textContent = "";
  lvl.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerHTML = `
      <span class="option-letter">${opt.letter}</span>
      <span class="option-text">${escapeHtml(opt.text)}</span>
    `;
    btn.addEventListener("click", () => handleAnswer(opt));
    optionsEl.appendChild(btn);
  });
}

function handleAnswer(option) {
  // Buttons sperren
  document.querySelectorAll("#options .option").forEach(b => b.disabled = true);

  state.score += option.score;
  state.answers.push({ levelId: state.mission.levels[state.levelIdx].id, letter: option.letter, verdict: option.verdict, score: option.score });
  document.getElementById("score-current").textContent = state.score;

  sound(option.verdict === "correct" ? "correct" : option.verdict === "suboptimal" ? "suboptimal" : "wrong");

  showFeedback(option);
}

function showFeedback(option) {
  const lvl = state.mission.levels[state.levelIdx];
  const card = document.querySelector(".feedback-card");
  card.classList.remove("correct", "suboptimal", "wrong");
  card.classList.add(option.verdict);

  const verdictMap = {
    correct:    { icon: "✅", label: "RICHTIG" },
    suboptimal: { icon: "⚠️", label: "SUBOPTIMAL" },
    wrong:      { icon: "❌", label: "FALSCH" }
  };
  const v = verdictMap[option.verdict] || verdictMap.wrong;
  document.getElementById("verdict-icon").textContent = v.icon;
  document.getElementById("verdict-label").textContent = v.label;
  document.getElementById("verdict-points").textContent = option.score;

  document.getElementById("feedback-text").textContent = option.feedback;
  document.getElementById("insight-text").textContent = lvl.insight || "";

  // Console-Log nur bei korrekter Antwort animieren
  const consoleBlock = document.getElementById("console-block");
  const consoleOut = document.getElementById("console-output");
  consoleOut.textContent = "";
  if (option.consoleLog && option.consoleLog.length) {
    consoleBlock.hidden = false;
    animateConsole(consoleOut, option.consoleLog);
  } else {
    consoleBlock.hidden = true;
  }

  document.getElementById("overlay").classList.add("active");
}

async function animateConsole(el, lines) {
  for (const line of lines) {
    el.textContent += line + "\n";
    sound("tick");
    await sleep(140);
  }
}

function nextLevel() {
  document.getElementById("overlay").classList.remove("active");
  state.levelIdx++;
  if (state.levelIdx >= state.mission.levels.length) {
    finishMission();
  } else {
    renderLevel();
  }
}

function finishMission() {
  // Storage updaten
  const data = loadStorage();
  const prevBest = data.bests[state.mission.id] || 0;
  if (state.score > prevBest) data.bests[state.mission.id] = state.score;
  data.plays = (data.plays || 0) + 1;
  data.totalPoints = (data.totalPoints || 0) + state.score;
  saveStorage(data);

  sound("win");

  // Ending bestimmen
  const endings = state.mission.endings || {};
  const sortedEndings = Object.entries(endings).sort((a, b) => b[1].minScore - a[1].minScore);
  let ending = { title: "Fertig", text: "" };
  for (const [, e] of sortedEndings) {
    if (state.score >= e.minScore) { ending = e; break; }
  }

  document.getElementById("result-icon").textContent = ending.title.match(/^(\p{Emoji}+)/u)?.[1] || "🎯";
  document.getElementById("result-title").textContent = ending.title.replace(/^(\p{Emoji}+\s*)/u, "");
  document.getElementById("result-score").textContent = state.score;
  document.querySelector(".result-score-max").textContent = "/ " + (state.mission.totalScore || 100);
  document.getElementById("result-text").textContent = ending.text || "";

  // Antworten-Übersicht
  const summary = document.getElementById("answer-summary");
  summary.textContent = "";
  state.answers.forEach((a, i) => {
    const chip = document.createElement("span");
    chip.className = "answer-chip " + a.verdict;
    chip.textContent = `L${i + 1}: ${a.letter} · ${a.score}P`;
    summary.appendChild(chip);
  });

  showScreen("screen-result");
}

// ---- Reset --------------------------------------------------
function resetStats() {
  if (!confirm("Alle Highscores und Statistiken löschen?")) return;
  localStorage.removeItem(STORAGE_KEY);
  renderStats();
  renderMissionGrid();
}

// ---- file:// Protocol Warning ------------------------------
function checkFileProtocol() {
  if (location.protocol !== "file:") return false;
  const banner = document.createElement("div");
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:200;" +
    "background:#3a1a1a;border-bottom:2px solid #ff3860;color:#ffe0e0;" +
    "padding:14px 18px;font-family:var(--font-mono);font-size:13px;" +
    "line-height:1.6;text-align:center;backdrop-filter:blur(6px);";
  banner.innerHTML =
    '<strong style="color:#ff3860;">⚠ file://-Protokoll erkannt</strong><br>' +
    'Beim direkten Öffnen aus dem Finder blockiert Safari den Mission-Load. ' +
    'Bitte über die Live-URL aufrufen:<br>' +
    '<a href="https://marcolemke78-debug.github.io/claude-code-trainer/" ' +
    'style="color:#00ffea;font-weight:700;">' +
    'marcolemke78-debug.github.io/claude-code-trainer/</a>';
  document.body.appendChild(banner);
  document.querySelector("main").style.paddingTop = "120px";
  return true;
}

// ---- Init ---------------------------------------------------
async function init() {
  checkFileProtocol();
  renderStats();
  renderMissionGrid();

  // Boot-Animation
  const bootEl = document.getElementById("boot-typing");
  typewriter(bootEl, BOOT_LINES);

  // Event-Listener
  document.getElementById("btn-start").addEventListener("click", () => {
    sound("click");
    showScreen("screen-missions");
  });

  document.getElementById("btn-reset").addEventListener("click", resetStats);

  document.querySelectorAll(".btn-back").forEach(btn => {
    btn.addEventListener("click", () => {
      sound("click");
      showScreen(btn.dataset.target);
    });
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    sound("click");
    nextLevel();
  });

  document.getElementById("btn-replay").addEventListener("click", () => {
    sound("click");
    if (state.mission) startMission(state.mission.id);
  });

  document.getElementById("btn-back-menu").addEventListener("click", () => {
    sound("click");
    showScreen("screen-missions");
    renderMissionGrid();
  });

  document.getElementById("btn-mute").addEventListener("click", () => {
    state.muted = !state.muted;
    const data = loadStorage();
    data.muted = state.muted;
    saveStorage(data);
    const btn = document.getElementById("btn-mute");
    btn.textContent = state.muted ? "🔇" : "🔊";
    btn.setAttribute("aria-pressed", state.muted);
    if (!state.muted) sound("click");
  });

  // Audio-Context bei erster User-Interaktion entsperren (iOS-Anforderung)
  document.addEventListener("click", () => ensureAudioCtx(), { once: true });
}

// Start
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
