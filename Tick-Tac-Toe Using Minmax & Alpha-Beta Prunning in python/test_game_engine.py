"""Automated tests for the AI and core game rules."""

import unittest

from game_engine import (
    check_draw,
    check_winner,
    find_best_move,
    get_available_moves,
    minimax,
    validate_board,
)


class GameRulesTests(unittest.TestCase):
    def test_detects_row_column_and_diagonal_wins(self):
        examples = [
            (["X", "X", "X", None, "O", None, "O", None, None], (0, 1, 2)),
            (["O", "X", None, "O", "X", None, "O", None, "X"], (0, 3, 6)),
            (["X", "O", None, "O", "X", None, None, None, "X"], (0, 4, 8)),
        ]
        for board, expected_line in examples:
            with self.subTest(board=board):
                winner, line = check_winner(board)
                self.assertIsNotNone(winner)
                self.assertEqual(line, expected_line)

    def test_detects_draw(self):
        board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"]
        self.assertTrue(check_draw(board))

    def test_available_moves_prefer_center(self):
        board = [None] * 9
        self.assertEqual(get_available_moves(board)[0], 4)

    def test_rejects_invalid_board(self):
        with self.assertRaises(ValueError):
            validate_board(["X"], "O")


class ArtificialIntelligenceTests(unittest.TestCase):
    def test_hard_ai_takes_winning_move(self):
        board = ["O", "O", None, "X", "X", None, None, None, None]
        result = find_best_move(board, "O", "hard")
        self.assertEqual(result["move"], 2)

    def test_hard_ai_blocks_immediate_loss(self):
        board = ["X", "X", None, None, "O", None, None, None, None]
        result = find_best_move(board, "O", "hard")
        self.assertEqual(result["move"], 2)
        self.assertIn("Blocked", result["explanation"])

    def test_empty_board_is_a_draw_with_perfect_play(self):
        score = minimax([None] * 9, 0, True, "X")
        self.assertEqual(score, 0)

    def test_hard_ai_never_loses_against_any_player_path(self):
        def explore(board, turn):
            winner, _ = check_winner(board)
            if winner:
                self.assertNotEqual(winner, "X")
                return
            if check_draw(board):
                return

            if turn == "O":
                move = find_best_move(board, "O", "hard")["move"]
                board[move] = "O"
                explore(board, "X")
                board[move] = None
                return

            for move in get_available_moves(board):
                board[move] = "X"
                explore(board, "O")
                board[move] = None

        explore([None] * 9, "X")

    def test_hard_ai_never_loses_when_ai_starts(self):
        def explore(board, turn):
            winner, _ = check_winner(board)
            if winner:
                self.assertNotEqual(winner, "O")
                return
            if check_draw(board):
                return

            if turn == "X":
                move = find_best_move(board, "X", "hard")["move"]
                board[move] = "X"
                explore(board, "O")
                board[move] = None
                return

            for move in get_available_moves(board):
                board[move] = "O"
                explore(board, "X")
                board[move] = None

        explore([None] * 9, "X")


if __name__ == "__main__":
    unittest.main(verbosity=2)
