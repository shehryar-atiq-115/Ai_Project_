"""Game engine for the Tic-Tac-Toe AI Lab.

The module deliberately keeps the search logic independent from the web UI so
it can be studied, tested, and reused from a command-line or desktop client.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from time import perf_counter
from typing import Optional


WINNING_LINES = (
    (0, 1, 2),
    (3, 4, 5),
    (6, 7, 8),
    (0, 3, 6),
    (1, 4, 7),
    (2, 5, 8),
    (0, 4, 8),
    (2, 4, 6),
)

# Searching promising squares first makes alpha-beta pruning more effective.
MOVE_ORDER = (4, 0, 2, 6, 8, 1, 3, 5, 7)


@dataclass
class SearchStats:
    """Mutable counters collected during one AI decision."""

    nodes: int = 0
    pruned: int = 0


def create_board() -> list[Optional[str]]:
    """Create a new empty 3x3 board represented as a flat list."""

    return [None] * 9


def get_available_moves(board: list[Optional[str]]) -> list[int]:
    """Return empty positions in a search-friendly order."""

    return [position for position in MOVE_ORDER if board[position] is None]


def check_winner(
    board: list[Optional[str]],
) -> tuple[Optional[str], Optional[tuple[int, int, int]]]:
    """Return the winning symbol and cells, or ``(None, None)``."""

    for line in WINNING_LINES:
        first, second, third = line
        if board[first] and board[first] == board[second] == board[third]:
            return board[first], line
    return None, None


def check_draw(board: list[Optional[str]]) -> bool:
    """Return True only when the board is full and nobody has won."""

    winner, _ = check_winner(board)
    return winner is None and all(cell is not None for cell in board)


def evaluate_board(
    board: list[Optional[str]], ai_symbol: str, depth: int = 0
) -> Optional[int]:
    """Score a terminal position from the AI's perspective.

    A quicker win scores more highly, while a delayed loss is preferred to an
    immediate one. ``None`` means the position is not terminal.
    """

    winner, _ = check_winner(board)
    if winner == ai_symbol:
        return 10 - depth
    if winner and winner != ai_symbol:
        return depth - 10
    if check_draw(board):
        return 0
    return None


def minimax(
    board: list[Optional[str]],
    depth: int,
    is_maximizing: bool,
    ai_symbol: str,
    alpha: float = float("-inf"),
    beta: float = float("inf"),
    stats: Optional[SearchStats] = None,
) -> int:
    """Evaluate a board using Minimax enhanced with alpha-beta pruning."""

    stats = stats or SearchStats()
    stats.nodes += 1

    terminal_score = evaluate_board(board, ai_symbol, depth)
    if terminal_score is not None:
        return terminal_score

    opponent = "O" if ai_symbol == "X" else "X"

    if is_maximizing:
        best_score = float("-inf")
        for move in get_available_moves(board):
            board[move] = ai_symbol
            score = minimax(board, depth + 1, False, ai_symbol, alpha, beta, stats)
            board[move] = None
            best_score = max(best_score, score)
            alpha = max(alpha, best_score)
            if beta <= alpha:
                stats.pruned += 1
                break
        return int(best_score)

    best_score = float("inf")
    for move in get_available_moves(board):
        board[move] = opponent
        score = minimax(board, depth + 1, True, ai_symbol, alpha, beta, stats)
        board[move] = None
        best_score = min(best_score, score)
        beta = min(beta, best_score)
        if beta <= alpha:
            stats.pruned += 1
            break
    return int(best_score)


def _winning_moves(board: list[Optional[str]], symbol: str) -> list[int]:
    winning_moves: list[int] = []
    for move in get_available_moves(board):
        board[move] = symbol
        winner, _ = check_winner(board)
        board[move] = None
        if winner == symbol:
            winning_moves.append(move)
    return winning_moves


def _creates_fork(board: list[Optional[str]], move: int, symbol: str) -> bool:
    board[move] = symbol
    future_wins = _winning_moves(board, symbol)
    board[move] = None
    return len(future_wins) >= 2


def explain_move(
    board_before: list[Optional[str]], move: int, ai_symbol: str, score: int
) -> str:
    """Create a short, human-readable reason for the selected move."""

    opponent = "O" if ai_symbol == "X" else "X"
    board_after = board_before.copy()
    board_after[move] = ai_symbol

    winner, _ = check_winner(board_after)
    if winner == ai_symbol:
        return "Completed a winning line to finish the game."
    if move in _winning_moves(board_before.copy(), opponent):
        return "Blocked the opponent's immediate winning move."
    if _creates_fork(board_before.copy(), move, ai_symbol):
        return "Created a fork with two possible winning threats."
    if move == 4:
        return "Controlled the center, the square involved in the most winning lines."
    if move in (0, 2, 6, 8):
        return "Selected a corner to maximize future winning combinations."
    if score > 0:
        return "Chose the path that forces the strongest winning outcome."
    if score == 0:
        return "Protected the best guaranteed outcome: at least a draw."
    return "Selected the move that delays the opponent's advantage the longest."


def _score_moves(
    board: list[Optional[str]], ai_symbol: str
) -> tuple[list[tuple[int, int]], SearchStats]:
    scored_moves: list[tuple[int, int]] = []
    stats = SearchStats()

    for move in get_available_moves(board):
        board[move] = ai_symbol
        score = minimax(
            board,
            depth=1,
            is_maximizing=False,
            ai_symbol=ai_symbol,
            stats=stats,
        )
        board[move] = None
        scored_moves.append((move, score))

    return scored_moves, stats


def easy_move(board: list[Optional[str]], ai_symbol: str) -> dict:
    """Choose a random legal move."""

    del ai_symbol  # Kept in the signature for a consistent public API.
    available = get_available_moves(board)
    move = random.choice(available)
    return {
        "move": move,
        "score": None,
        "nodes": 1,
        "pruned": 0,
        "explanation": "Easy mode explores one random legal move.",
    }


def medium_move(board: list[Optional[str]], ai_symbol: str) -> dict:
    """Mix tactical Minimax decisions with occasional random choices."""

    scored_moves, stats = _score_moves(board, ai_symbol)
    best_score = max(score for _, score in scored_moves)
    best_moves = [move for move, score in scored_moves if score == best_score]

    # Medium mode remains tactically aware, but is intentionally fallible.
    if random.random() < 0.7:
        move = random.choice(best_moves)
        explanation = explain_move(board.copy(), move, ai_symbol, best_score)
    else:
        move, chosen_score = random.choice(scored_moves)
        best_score = chosen_score
        explanation = "Medium mode introduced a random choice after evaluating the board."

    return {
        "move": move,
        "score": best_score,
        "nodes": stats.nodes,
        "pruned": stats.pruned,
        "explanation": explanation,
    }


def hard_move(board: list[Optional[str]], ai_symbol: str) -> dict:
    """Choose an optimal move; this difficulty cannot be defeated."""

    scored_moves, stats = _score_moves(board, ai_symbol)
    best_score = max(score for _, score in scored_moves)
    best_moves = [move for move, score in scored_moves if score == best_score]

    # Randomizing between equally optimal choices keeps repeat games interesting.
    move = random.choice(best_moves)
    return {
        "move": move,
        "score": best_score,
        "nodes": stats.nodes,
        "pruned": stats.pruned,
        "explanation": explain_move(board.copy(), move, ai_symbol, best_score),
    }


def find_best_move(
    board: list[Optional[str]], ai_symbol: str, difficulty: str = "hard"
) -> dict:
    """Public AI dispatcher used by the HTTP API."""

    if not get_available_moves(board):
        raise ValueError("No legal moves are available.")

    started_at = perf_counter()
    if difficulty == "easy":
        result = easy_move(board.copy(), ai_symbol)
    elif difficulty == "medium":
        result = medium_move(board.copy(), ai_symbol)
    elif difficulty == "hard":
        result = hard_move(board.copy(), ai_symbol)
    else:
        raise ValueError("Difficulty must be easy, medium, or hard.")

    result["elapsed_ms"] = round((perf_counter() - started_at) * 1000, 2)
    result["difficulty"] = difficulty
    result["algorithm"] = (
        "Random selection"
        if difficulty == "easy"
        else "Minimax + Alpha–Beta Pruning"
    )
    return result


def validate_board(board: object, ai_symbol: object) -> list[Optional[str]]:
    """Validate untrusted board data received from the browser."""

    if not isinstance(board, list) or len(board) != 9:
        raise ValueError("Board must contain exactly 9 cells.")
    if ai_symbol not in ("X", "O"):
        raise ValueError("AI symbol must be X or O.")

    normalized: list[Optional[str]] = []
    for cell in board:
        if cell in (None, "", "X", "O"):
            normalized.append(cell or None)
        else:
            raise ValueError("Each board cell must be X, O, or empty.")

    winner, _ = check_winner(normalized)
    if winner or check_draw(normalized):
        raise ValueError("The game is already over.")
    return normalized


# Course-specification aliases keep the textbook naming easy to recognize.
createBoard = create_board
getAvailableMoves = get_available_moves
checkWinner = check_winner
checkDraw = check_draw
evaluateBoard = evaluate_board
findBestMove = find_best_move
easyMove = easy_move
mediumMove = medium_move
hardMove = hard_move
