"use strict";

const STORAGE_KEYS = {
  preferences: "ttt-ai-preferences-v1",
  scores: "ttt-ai-scores-v1",
  matches: "ttt-ai-matches-v1",
};

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const defaultScores = {
  humanWins: 0,
  aiWins: 0,
  aiDraws: 0,
  xWins: 0,
  oWins: 0,
  pvpDraws: 0,
};

const state = {
  board: Array(9).fill(null),
  currentPlayer: "X",
  pendingConfig: {
    mode: "ai",
    difficulty: "hard",
    humanSymbol: "X",
    first: "human",
  },
  config: {
    mode: "ai",
    difficulty: "hard",
    humanSymbol: "X",
    first: "human",
  },
  moveHistory: [],
  matchHistory: loadJSON(STORAGE_KEYS.matches, []),
  scores: { ...defaultScores, ...loadJSON(STORAGE_KEYS.scores, {}) },
  gameOver: false,
  thinking: false,
  soundEnabled: true,
  turnStartedAt: Date.now(),
  roundId: 0,
};

const elements = {};
let audioContext = null;
let timerInterval = null;

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
  cacheElements();
  restorePreferences();
  createBoard();
  bindEvents();
  syncControls();
  resetBoard();
  renderScoreboard();
  renderStatistics();
  checkServerHealth();
  timerInterval = window.setInterval(updateTimer, 1000);
}

function cacheElements() {
  const ids = [
    "game-board",
    "turn-indicator",
    "turn-mark",
    "turn-label",
    "game-status",
    "move-timer",
    "thinking-banner",
    "new-round",
    "undo-move",
    "apply-settings",
    "reset-score",
    "player-score-label",
    "ai-score-label",
    "player-score",
    "ai-score",
    "draw-score",
    "nodes-metric",
    "pruned-metric",
    "score-metric",
    "time-metric",
    "algorithm-metric",
    "ai-explanation",
    "explanation-card",
    "explain-toggle",
    "move-history",
    "move-count",
    "sound-toggle",
    "theme-toggle",
    "server-status",
    "difficulty-help",
    "info-dialog",
    "toast-region",
    "stat-total-games",
    "stat-win-rate",
    "stat-draw-rate",
    "stat-moves",
    "outcome-donut",
    "donut-total",
    "legend-player",
    "legend-ai",
    "legend-draw",
    "legend-player-rate",
    "legend-ai-rate",
    "legend-draw-rate",
    "match-history-body",
    "clear-history",
  ];
  ids.forEach((id) => {
    elements[toCamelCase(id)] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-control]").forEach((control) => {
    control.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button) return;
      const controlName = control.dataset.control;
      const value = button.dataset.value;

      if (controlName === "symbol") {
        state.pendingConfig.humanSymbol = value;
      } else {
        state.pendingConfig[controlName] = value;
      }
      syncControls();
    });
  });

  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      switchView(button.dataset.viewLink);
    });
  });

  elements.applySettings.addEventListener("click", applySettings);
  elements.newRound.addEventListener("click", resetBoard);
  elements.undoMove.addEventListener("click", undoLastMove);
  elements.resetScore.addEventListener("click", resetScore);
  elements.soundToggle.addEventListener("click", toggleSound);
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.explainToggle.addEventListener("click", toggleExplanation);
  elements.difficultyHelp.addEventListener("click", () => elements.infoDialog.showModal());
  elements.infoDialog.querySelector(".dialog-close").addEventListener("click", () => elements.infoDialog.close());
  elements.infoDialog.addEventListener("click", (event) => {
    if (event.target === elements.infoDialog) elements.infoDialog.close();
  });
  elements.clearHistory.addEventListener("click", clearMatchHistory);
  window.addEventListener("keydown", handleKeyboardMove);
}

function syncControls() {
  document.querySelectorAll("[data-control]").forEach((control) => {
    const key = control.dataset.control;
    const currentValue =
      key === "symbol" ? state.pendingConfig.humanSymbol : state.pendingConfig[key];
    control.querySelectorAll("button[data-value]").forEach((button) => {
      const selected = button.dataset.value === currentValue;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  });

  document.querySelectorAll(".ai-setting").forEach((setting) => {
    setting.hidden = state.pendingConfig.mode !== "ai";
  });
}

function applySettings() {
  state.config = { ...state.pendingConfig };
  persistPreferences();
  resetBoard();
  renderScoreboard();
  showToast(
    state.config.mode === "ai"
      ? `${capitalize(state.config.difficulty)} AI match started.`
      : "Local two-player match started."
  );
}

// Board Functions -----------------------------------------------------------

function createBoard() {
  elements.gameBoard.innerHTML = "";
  for (let position = 0; position < 9; position += 1) {
    const cell = document.createElement("button");
    cell.className = "board-cell";
    cell.type = "button";
    cell.dataset.position = String(position);
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `Cell ${coordinate(position)}, empty`);
    cell.addEventListener("click", () => makeMove(position));
    elements.gameBoard.append(cell);
  }
}

function displayBoard() {
  const previewMark =
    state.config.mode === "ai" ? state.config.humanSymbol : state.currentPlayer;

  [...elements.gameBoard.children].forEach((cell, position) => {
    const symbol = state.board[position];
    cell.innerHTML = symbol
      ? `<span class="cell-mark ${symbol.toLowerCase()}">${symbol}</span>`
      : "";
    cell.dataset.preview = previewMark;
    cell.disabled =
      Boolean(symbol) ||
      state.gameOver ||
      state.thinking ||
      (state.config.mode === "ai" && state.currentPlayer !== state.config.humanSymbol);
    cell.setAttribute(
      "aria-label",
      `Cell ${coordinate(position)}, ${symbol || "empty"}`
    );
  });

  elements.gameBoard.setAttribute(
    "aria-label",
    state.board.every((cell) => !cell)
      ? "Empty Tic-Tac-Toe board"
      : `Tic-Tac-Toe board, ${state.moveHistory.length} moves played`
  );
}

function resetBoard() {
  state.roundId += 1;
  state.board = Array(9).fill(null);
  state.moveHistory = [];
  state.gameOver = false;
  state.thinking = false;
  state.currentPlayer =
    state.config.mode === "ai"
      ? state.config.first === "human"
        ? state.config.humanSymbol
        : opposite(state.config.humanSymbol)
      : "X";
  state.turnStartedAt = Date.now();

  elements.thinkingBanner.classList.remove("is-visible");
  [...elements.gameBoard.children].forEach((cell) =>
    cell.classList.remove("is-winning")
  );
  clearAIMetrics();
  displayBoard();
  renderMoveHistory();
  showCurrentTurn();
  updateUndoButton();
  updateTimer();

  if (
    state.config.mode === "ai" &&
    state.currentPlayer !== state.config.humanSymbol
  ) {
    window.setTimeout(requestAIMove, 350);
  }
}

// Game Logic ---------------------------------------------------------------

function makeMove(position, forcedSymbol = null) {
  const symbol = forcedSymbol || state.currentPlayer;
  if (!isValidMove(position)) return false;
  if (
    !forcedSymbol &&
    state.config.mode === "ai" &&
    state.currentPlayer !== state.config.humanSymbol
  ) {
    return false;
  }

  state.board[position] = symbol;
  state.moveHistory.push({
    symbol,
    position,
    player: getPlayerName(symbol),
    elapsed: Math.floor((Date.now() - state.turnStartedAt) / 1000),
  });
  playSound("click");
  displayBoard();
  renderMoveHistory();

  const result = checkWinner();
  if (result) {
    showWinner(result.symbol, result.line);
    return true;
  }
  if (checkDraw()) {
    showWinner(null, null);
    return true;
  }

  switchPlayer();
  showCurrentTurn();
  updateUndoButton();

  if (
    state.config.mode === "ai" &&
    state.currentPlayer !== state.config.humanSymbol
  ) {
    window.setTimeout(requestAIMove, 230);
  }
  return true;
}

function isValidMove(position) {
  return (
    Number.isInteger(position) &&
    position >= 0 &&
    position < 9 &&
    !state.board[position] &&
    !state.gameOver &&
    !state.thinking
  );
}

function switchPlayer() {
  state.currentPlayer = opposite(state.currentPlayer);
  state.turnStartedAt = Date.now();
  updateTimer();
}

function checkWinner(board = state.board) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { symbol: board[a], line };
    }
  }
  return null;
}

function checkDraw(board = state.board) {
  return !checkWinner(board) && board.every(Boolean);
}

function getAvailableMoves(board = state.board) {
  return board
    .map((cell, position) => (cell ? null : position))
    .filter((position) => position !== null);
}

// AI Functions -------------------------------------------------------------

async function requestAIMove() {
  if (state.gameOver || state.config.mode !== "ai") return;
  const requestRound = state.roundId;
  const aiSymbol = opposite(state.config.humanSymbol);
  state.thinking = true;
  elements.thinkingBanner.classList.add("is-visible");
  displayBoard();
  showCurrentTurn();
  const animationStarted = Date.now();

  try {
    const response = await fetch("/api/ai-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        board: state.board,
        aiSymbol,
        difficulty: state.config.difficulty,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "AI request failed.");

    const remainingDelay = Math.max(0, 620 - (Date.now() - animationStarted));
    await delay(remainingDelay);
    if (requestRound !== state.roundId || state.gameOver) return;

    renderAIMetrics(result);
    state.thinking = false;
    elements.thinkingBanner.classList.remove("is-visible");
    makeMove(result.move, aiSymbol);
  } catch (error) {
    if (requestRound !== state.roundId) return;
    state.thinking = false;
    elements.thinkingBanner.classList.remove("is-visible");
    displayBoard();
    showCurrentTurn();
    setServerStatus(false);
    showToast(error.message || "Could not contact the AI engine.", "error");
  }
}

function renderAIMetrics(result) {
  elements.nodesMetric.textContent = Number(result.nodes || 0).toLocaleString();
  elements.prunedMetric.textContent = Number(result.pruned || 0).toLocaleString();
  elements.scoreMetric.textContent =
    result.score === null || result.score === undefined
      ? "N/A"
      : formatScore(result.score);
  elements.timeMetric.textContent = `${Number(result.elapsed_ms || 0).toFixed(1)} ms`;
  elements.algorithmMetric.textContent = result.algorithm;
  elements.aiExplanation.textContent = result.explanation;
}

function clearAIMetrics() {
  elements.nodesMetric.textContent = "—";
  elements.prunedMetric.textContent = "—";
  elements.scoreMetric.textContent = "—";
  elements.timeMetric.textContent = "—";
  elements.algorithmMetric.textContent =
    state.config.difficulty === "easy"
      ? "Random selection"
      : "Minimax + Alpha–Beta";
  elements.aiExplanation.textContent =
    state.config.mode === "pvp"
      ? "AI analysis is paused in local two-player mode."
      : "Play a move to inspect the AI's reasoning.";
}

// Score and completion ------------------------------------------------------

function showWinner(winner, winningLine) {
  state.gameOver = true;
  state.thinking = false;
  displayBoard();

  if (winningLine) highlightWinningCells(winningLine);

  const isDraw = !winner;
  const humanWon =
    state.config.mode === "ai" && winner === state.config.humanSymbol;
  const aiWon =
    state.config.mode === "ai" && winner && !humanWon;

  if (isDraw) {
    elements.turnLabel.textContent = "ROUND COMPLETE";
    elements.gameStatus.textContent = "Perfectly balanced — it's a draw";
    elements.turnMark.textContent = "—";
    elements.turnMark.className = "turn-mark";
    playSound("draw");
  } else {
    elements.turnLabel.textContent = "WINNER";
    elements.gameStatus.textContent =
      state.config.mode === "ai"
        ? humanWon
          ? "Brilliant — you won this round"
          : "The AI found the winning line"
        : `Player ${winner} wins the round`;
    elements.turnMark.textContent = winner;
    elements.turnMark.className = `turn-mark mark-${winner.toLowerCase()}`;
    playSound("win");
  }

  updateScore(winner);
  saveMatch({
    winner,
    isDraw,
    category: isDraw ? "draw" : humanWon ? "player" : aiWon ? "ai" : winner === "X" ? "player" : "ai",
  });
  updateUndoButton();
}

function highlightWinningCells(line) {
  line.forEach((position) => {
    elements.gameBoard.children[position].classList.add("is-winning");
  });
}

function showCurrentTurn() {
  if (state.gameOver) return;
  const symbol = state.currentPlayer;
  const isAI =
    state.config.mode === "ai" && symbol !== state.config.humanSymbol;
  const playerName = getPlayerName(symbol);

  elements.turnMark.textContent = symbol;
  elements.turnMark.className = `turn-mark mark-${symbol.toLowerCase()}`;
  elements.turnLabel.textContent = isAI ? "AI TURN" : "CURRENT TURN";
  elements.gameStatus.textContent = state.thinking
    ? "Calculating the optimal move…"
    : state.config.mode === "ai"
      ? `${playerName}, choose a square`
      : `${playerName} is choosing`;
  displayBoard();
}

function updateScore(winner) {
  if (state.config.mode === "ai") {
    if (!winner) state.scores.aiDraws += 1;
    else if (winner === state.config.humanSymbol) state.scores.humanWins += 1;
    else state.scores.aiWins += 1;
  } else {
    if (!winner) state.scores.pvpDraws += 1;
    else if (winner === "X") state.scores.xWins += 1;
    else state.scores.oWins += 1;
  }
  saveJSON(STORAGE_KEYS.scores, state.scores);
  renderScoreboard();
}

function resetScore() {
  if (state.config.mode === "ai") {
    state.scores.humanWins = 0;
    state.scores.aiWins = 0;
    state.scores.aiDraws = 0;
  } else {
    state.scores.xWins = 0;
    state.scores.oWins = 0;
    state.scores.pvpDraws = 0;
  }
  saveJSON(STORAGE_KEYS.scores, state.scores);
  renderScoreboard();
  showToast("Scoreboard reset for this game mode.");
}

function renderScoreboard() {
  const scoreCards = document.querySelectorAll(".score-card .score-symbol");
  if (state.config.mode === "ai") {
    const aiSymbol = opposite(state.config.humanSymbol);
    elements.playerScoreLabel.textContent = "YOU";
    elements.aiScoreLabel.textContent = "AI";
    elements.playerScore.textContent = state.scores.humanWins;
    elements.aiScore.textContent = state.scores.aiWins;
    elements.drawScore.textContent = state.scores.aiDraws;
    scoreCards[0].textContent = state.config.humanSymbol;
    scoreCards[2].textContent = aiSymbol;
  } else {
    elements.playerScoreLabel.textContent = "PLAYER X";
    elements.aiScoreLabel.textContent = "PLAYER O";
    elements.playerScore.textContent = state.scores.xWins;
    elements.aiScore.textContent = state.scores.oWins;
    elements.drawScore.textContent = state.scores.pvpDraws;
    scoreCards[0].textContent = "X";
    scoreCards[2].textContent = "O";
  }
}

function saveMatch(result) {
  const resultLabel = result.isDraw
    ? "Draw"
    : state.config.mode === "ai"
      ? result.category === "player"
        ? "Player win"
        : "AI win"
      : `Player ${result.winner} win`;

  state.matchHistory.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    result: resultLabel,
    category: result.category,
    mode: state.config.mode,
    difficulty: state.config.mode === "ai" ? state.config.difficulty : "Local",
    moves: state.moveHistory.length,
    playedAt: new Date().toISOString(),
  });
  state.matchHistory = state.matchHistory.slice(0, 50);
  saveJSON(STORAGE_KEYS.matches, state.matchHistory);
  renderStatistics();
}

// History and undo ----------------------------------------------------------

function renderMoveHistory() {
  elements.moveCount.textContent = `${state.moveHistory.length} ${
    state.moveHistory.length === 1 ? "MOVE" : "MOVES"
  }`;
  if (!state.moveHistory.length) {
    elements.moveHistory.innerHTML =
      '<li class="empty-history">No moves yet. The opening square is waiting.</li>';
    return;
  }

  elements.moveHistory.innerHTML = state.moveHistory
    .map(
      (move, index) => `
        <li>
          <span class="history-index">${String(index + 1).padStart(2, "0")}</span>
          <strong class="history-mark mark-${move.symbol.toLowerCase()}">${move.symbol}</strong>
          <span class="history-player">${escapeHTML(move.player)}</span>
          <span class="history-cell">${coordinate(move.position)} • ${move.elapsed}s</span>
        </li>`
    )
    .join("");
  elements.moveHistory.scrollTop = elements.moveHistory.scrollHeight;
}

function undoLastMove() {
  if (
    state.config.mode !== "pvp" ||
    !state.moveHistory.length ||
    state.gameOver ||
    state.thinking
  ) {
    return;
  }
  const move = state.moveHistory.pop();
  state.board[move.position] = null;
  state.currentPlayer = move.symbol;
  state.turnStartedAt = Date.now();
  displayBoard();
  renderMoveHistory();
  showCurrentTurn();
  updateUndoButton();
  playSound("click");
}

function updateUndoButton() {
  elements.undoMove.disabled =
    state.config.mode !== "pvp" ||
    !state.moveHistory.length ||
    state.gameOver ||
    state.thinking;
}

// Statistics ---------------------------------------------------------------

function renderStatistics() {
  const matches = state.matchHistory;
  const total = matches.length;
  const playerWins = matches.filter((match) => match.category === "player").length;
  const aiWins = matches.filter((match) => match.category === "ai").length;
  const draws = matches.filter((match) => match.category === "draw").length;
  const aiMatches = matches.filter((match) => match.mode === "ai");
  const playerAIWins = aiMatches.filter((match) => match.category === "player").length;
  const totalMoves = matches.reduce((sum, match) => sum + Number(match.moves || 0), 0);
  const percentage = (value, denominator = total) =>
    denominator ? Math.round((value / denominator) * 100) : 0;

  elements.statTotalGames.textContent = total;
  elements.statWinRate.textContent = `${percentage(playerAIWins, aiMatches.length)}%`;
  elements.statDrawRate.textContent = `${percentage(draws)}%`;
  elements.statMoves.textContent = totalMoves.toLocaleString();
  elements.donutTotal.textContent = total;
  elements.legendPlayer.textContent = `${playerWins} ${playerWins === 1 ? "match" : "matches"}`;
  elements.legendAi.textContent = `${aiWins} ${aiWins === 1 ? "match" : "matches"}`;
  elements.legendDraw.textContent = `${draws} ${draws === 1 ? "match" : "matches"}`;
  elements.legendPlayerRate.textContent = `${percentage(playerWins)}%`;
  elements.legendAiRate.textContent = `${percentage(aiWins)}%`;
  elements.legendDrawRate.textContent = `${percentage(draws)}%`;

  const playerEnd = percentage(playerWins);
  const aiEnd = playerEnd + percentage(aiWins);
  elements.outcomeDonut.style.background = total
    ? `conic-gradient(
        var(--coral) 0 ${playerEnd}%,
        var(--teal) ${playerEnd}% ${aiEnd}%,
        var(--amber) ${aiEnd}% 100%
      )`
    : "conic-gradient(var(--border) 0 100%)";

  if (!matches.length) {
    elements.matchHistoryBody.innerHTML =
      '<tr><td class="empty-table" colspan="5">Complete a round to populate your match history.</td></tr>';
    return;
  }

  elements.matchHistoryBody.innerHTML = matches
    .slice(0, 10)
    .map((match) => {
      const resultClass =
        match.category === "draw" ? "draw" : match.category === "player" ? "win" : "ai";
      return `
        <tr>
          <td><span class="result-chip ${resultClass}">${escapeHTML(match.result)}</span></td>
          <td>${match.mode === "ai" ? "Player vs AI" : "Two players"}</td>
          <td>${capitalize(match.difficulty)}</td>
          <td>${match.moves}</td>
          <td>${formatDate(match.playedAt)}</td>
        </tr>`;
    })
    .join("");
}

function clearMatchHistory() {
  if (!state.matchHistory.length) {
    showToast("Match history is already empty.");
    return;
  }
  state.matchHistory = [];
  saveJSON(STORAGE_KEYS.matches, state.matchHistory);
  renderStatistics();
  showToast("Saved match history cleared.");
}

// Interface utilities ------------------------------------------------------

function switchView(viewName) {
  document.querySelectorAll("[data-view]").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  });
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewLink === viewName);
  });
  if (viewName === "statistics") renderStatistics();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateTimer() {
  if (!elements.moveTimer) return;
  const elapsed = state.gameOver
    ? state.moveHistory.at(-1)?.elapsed || 0
    : Math.floor((Date.now() - state.turnStartedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  elements.moveTimer.textContent = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
}

function toggleExplanation() {
  const collapsed = elements.explanationCard.classList.toggle("is-collapsed");
  elements.explainToggle.setAttribute("aria-expanded", String(!collapsed));
}

function toggleTheme() {
  const nextTheme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  elements.themeToggle.setAttribute(
    "aria-label",
    nextTheme === "dark" ? "Use light theme" : "Use dark theme"
  );
  persistPreferences();
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  elements.soundToggle.classList.toggle("sound-muted", !state.soundEnabled);
  elements.soundToggle.setAttribute(
    "aria-label",
    state.soundEnabled ? "Turn sounds off" : "Turn sounds on"
  );
  if (state.soundEnabled) playSound("click");
  persistPreferences();
}

function playSound(type) {
  if (!state.soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const notes =
      type === "win"
        ? [
            [392, 0],
            [523, 0.11],
            [659, 0.22],
          ]
        : type === "draw"
          ? [
              [260, 0],
              [230, 0.14],
            ]
          : [[type === "click" ? 300 : 440, 0]];

    notes.forEach(([frequency, offset]) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type === "click" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, now + offset);
      gain.gain.setValueAtTime(type === "click" ? 0.035 : 0.055, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.17);
    });
  } catch {
    // Audio is optional; browsers may block it until the first user gesture.
  }
}

function handleKeyboardMove(event) {
  if (
    event.repeat ||
    elements.infoDialog.open ||
    !document.getElementById("game-view").classList.contains("is-active")
  ) {
    return;
  }
  const position = Number(event.key) - 1;
  if (position >= 0 && position <= 8) makeMove(position);
}

async function checkServerHealth() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    setServerStatus(response.ok);
  } catch {
    setServerStatus(false);
  }
}

function setServerStatus(online) {
  elements.serverStatus.classList.toggle("is-online", online);
  elements.serverStatus.classList.toggle("is-offline", !online);
  elements.serverStatus.querySelector("strong").textContent = online
    ? "AI engine online"
    : "Engine unavailable";
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3300);
}

function getPlayerName(symbol) {
  if (state.config.mode === "pvp") return `Player ${symbol}`;
  return symbol === state.config.humanSymbol ? "You" : "AI";
}

function coordinate(position) {
  return `${["A", "B", "C"][position % 3]}${Math.floor(position / 3) + 1}`;
}

function opposite(symbol) {
  return symbol === "X" ? "O" : "X";
}

function formatScore(score) {
  const numeric = Number(score);
  return numeric > 0 ? `+${numeric}` : String(numeric);
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function capitalize(value) {
  const stringValue = String(value || "");
  return stringValue.charAt(0).toUpperCase() + stringValue.slice(1);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The game still works if storage is disabled.
  }
}

function restorePreferences() {
  const preferences = loadJSON(STORAGE_KEYS.preferences, {});
  const preferredTheme =
    preferences.theme ||
    (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = preferredTheme;
  state.soundEnabled = preferences.soundEnabled ?? true;
  state.pendingConfig = {
    ...state.pendingConfig,
    ...(preferences.config || {}),
  };
  state.config = { ...state.pendingConfig };
  elements.soundToggle.classList.toggle("sound-muted", !state.soundEnabled);
  elements.soundToggle.setAttribute(
    "aria-label",
    state.soundEnabled ? "Turn sounds off" : "Turn sounds on"
  );
  elements.themeToggle.setAttribute(
    "aria-label",
    preferredTheme === "dark" ? "Use light theme" : "Use dark theme"
  );
}

function persistPreferences() {
  saveJSON(STORAGE_KEYS.preferences, {
    theme: document.documentElement.dataset.theme,
    soundEnabled: state.soundEnabled,
    config: state.pendingConfig,
  });
}

function escapeHTML(value) {
  const element = document.createElement("span");
  element.textContent = String(value);
  return element.innerHTML;
}

