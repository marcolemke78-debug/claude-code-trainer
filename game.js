/* ============================================================
   CLAUDE CODE TRAINER — Game Engine
   Vanilla JS. Extensible via JSON missions.
   ============================================================ */

// ---- Mission Index (extensible) -----------------------------
const MISSIONS_INDEX = [
  {
    id: "blechntakt-landing",
    file: "missions/blechntakt-landing.json",
    locked: false
  },
  {
    id: "lernprogramm",
    title: "Lernprogramm für Leonie",
    subtitle: "Bald verfügbar",
    icon: "📚",
    difficulty: 2,
    tagline: "Wie startest du eine Schul-Lern-App ohne Brainstorming-Marathon?",
    locked: true
  },
  {
    id: "gowin-analyse",
    title: "GoWin Analyse-Session",
    subtitle: "Bald verfügbar",
    icon: "📊",
    difficulty: 3,
    tagline: "Skills, Memory und Subagents im Kontra-System richtig orchestrieren.",
    locked: true
  },
  {
    id: "webapp-from-scratch",
    title: "Web-App von Null",
    subtitle: "Bald verfügbar",
    icon: "🚀",
    difficulty: 2,
    tagline: "Worktree, Tests, Deploy – wann lohnt was bei einem neuen Projekt?",
    locked: true
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
async function renderMissionGrid() {
  const grid = document.getElementById("mission-grid");
  grid.textContent = "";
  const data = loadStorage();

  for (const meta of MISSIONS_INDEX) {
    const card = document.createElement("button");
    card.className = "mission-card" + (meta.locked ? " locked" : "");
    card.disabled = !!meta.locked;

    let displayMeta = meta;

    // Bei freigeschalteten Missionen lade JSON für Titel/Anzahl-Levels
    if (!meta.locked) {
      try {
        const m = await loadMission(meta.file);
        displayMeta = {
          ...meta,
          title: m.title,
          subtitle: m.subtitle,
          icon: m.icon,
          difficulty: m.difficulty,
          tagline: m.tagline,
          levelCount: m.levels.length,
          totalScore: m.totalScore
        };
      } catch (e) {
        console.error("Mission konnte nicht geladen werden:", meta.file, e);
        continue;
      }
    }

    const best = data.bests[meta.id];
    const diffDots = Array.from({ length: 3 }, (_, i) =>
      `<span class="${i < (displayMeta.difficulty || 1) ? "on" : ""}"></span>`
    ).join("");

    card.innerHTML = `
      <span class="mission-icon">${displayMeta.icon || "🎯"}</span>
      <div class="mission-card-title">${escapeHtml(displayMeta.title || meta.id)}</div>
      <div class="mission-card-subtitle">${escapeHtml(displayMeta.subtitle || "")}</div>
      <div class="mission-card-tag">${escapeHtml(displayMeta.tagline || "")}</div>
      <div class="mission-card-foot">
        <span class="difficulty" aria-label="Schwierigkeit">${diffDots}</span>
        <span>${meta.locked ? "🔒 LOCKED" : (best != null ? `BEST <span class="mission-best">${best}</span>` : `${displayMeta.levelCount || ""} Level`)}</span>
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
const _missionCache = {};
async function loadMission(file) {
  if (_missionCache[file]) return _missionCache[file];
  const res = await fetch(file);
  if (!res.ok) throw new Error("Mission-Datei nicht gefunden: " + file);
  const json = await res.json();
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
    alert("Mission konnte nicht geladen werden.");
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

// ---- Init ---------------------------------------------------
async function init() {
  renderStats();
  await renderMissionGrid();

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
