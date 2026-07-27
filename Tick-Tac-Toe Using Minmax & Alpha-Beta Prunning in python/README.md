# Tic-Tac-Toe AI Lab

A polished fifth-semester Artificial Intelligence project demonstrating game
theory, adversarial search, Minimax, alpha-beta pruning, and explainable
decision-making.

## Run the project

No third-party package is required. Python 3.9 or newer is recommended.

```powershell
cd ayan
python app.py
```

Open **http://127.0.0.1:8000** in a browser.

To use another port:

```powershell
python app.py --port 8080
```

## Test the AI

```powershell
python -m unittest -v
```

The test suite checks winner/draw rules, tactical winning and blocking moves,
and exhaustively confirms that Hard AI cannot lose when the player starts.

## Features

- Player vs AI and local Player vs Player modes
- Easy (random), Medium (mixed), and Hard (perfect Minimax) difficulty
- Alpha-beta pruning with explored-node and pruned-branch metrics
- Move explanations and evaluation scores
- First-turn and X/O selection
- Scoreboard, persistent match history, and statistics dashboard
- Winning-line animation, move timer, undo in Player vs Player
- Synthesized click/win/draw sounds with no external assets
- Responsive dark/light interface with keyboard-accessible controls

## Project structure

```text
ayan/
├── app.py              # Dependency-free HTTP server and AI API
├── game_engine.py      # Rules, Minimax, alpha-beta pruning, explanations
├── index.html          # Accessible single-page interface
├── static/
│   ├── app.js          # UI state, game flow, storage, statistics
│   └── styles.css      # Responsive visual design
└── test_game_engine.py # Automated rules and AI tests
```

## Algorithm summary

Minimax models Tic-Tac-Toe as a two-player zero-sum game. The AI maximizes its
score while assuming the opponent always chooses the response that minimizes
it. Terminal positions receive depth-aware scores, so the AI prefers a faster
win and delays an unavoidable loss. Alpha-beta bounds discard branches that
cannot influence the final choice without changing Minimax's answer.

For a submission-ready explanation, architecture, complexity analysis, test
strategy, and viva questions, see
[`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md).
