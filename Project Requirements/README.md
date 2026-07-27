
 Project Title:

AI Tic-Tac-Toe Game Using Minimax Algorithm with Alpha-Beta Pruning

 Objective:

The objective of this project is to develop an intelligent Tic-Tac-Toe game where a human player competes against an AI opponent. The AI uses the 
Minimax Algorithm with Alpha-Beta Pruning to analyze all possible game states and choose the optimal move. The project demonstrates the practical implementation of game theory, adversarial search, and decision-making algorithms in Artificial Intelligence.

Features:

* Human vs AI gameplay
* Three difficulty levels (Easy, Medium, Hard)
* AI powered by Minimax Algorithm
* Alpha-Beta Pruning for faster decision making
* Interactive web-based user interface
* Game statistics and score tracking
* Win, loss, and draw detection
* Restart game functionality
* Responsive design

Technologies Used:

Frontend:

* HTML5
* CSS3
* JavaScript

 Backend:

* Python 3
* Flask

AI Concepts:

* Game Theory
* Minimax Algorithm
* Alpha-Beta Pruning
* Recursive Search
* Decision Making


 Required Libraries:

Install the following Python libraries before running the project.

Flask

You can install Flask using pip:

pip install flask

If a `requirements.txt` file is included in the project, install all dependencies using:

pip install -r requirements.txt


 Installation Steps:

Step 1:

Download or clone the project.

git clone <repository-link>


or extract the ZIP file.


 Step 2:

Open the project folder.

cd AI-TicTacToe

 Step 3:

Install the required libraries.

pip install flask

 Step 4:

Run the Flask server.

python app.py

 Step 5:

Open your web browser and visit:

http://127.0.0.1:8000

or

http://localhost:8000

depending on the configured port.

How the Project Works: 

The user opens the game in a web browser.
The player selects an empty square to place X.
The current board state is sent to the Flask backend.
The backend calls the AI engine.
The Minimax Algorithm evaluates all possible future moves.
Alpha-Beta Pruning removes unnecessary branches to improve efficiency.
The AI chooses the best possible move.
The selected move is returned to the frontend.
The board updates automatically.
The game continues until there is a winner or a draw.

Expected Output:

When the project runs successfully:

* The Tic-Tac-Toe game opens in the browser.
* The user can play against the AI.
* The AI responds immediately after each player move.
* The game correctly detects:

  * Player Win
  * AI Win
  * Draw
* Game statistics and scores are updated automatically.
* Users can restart the game at any time.

 AI Algorithm Used:

The AI opponent uses the **Minimax Algorithm** with **Alpha-Beta Pruning**.

 Minimax:

The Minimax algorithm explores every possible future game state and assumes that both players make the best possible moves. It selects the move that maximizes the AI's chances of winning while minimizing the opponent's chances.

Alpha-Beta Pruning:

Alpha-Beta Pruning improves the efficiency of Minimax by eliminating branches that cannot affect the final decision. This significantly reduces computation time while producing the same optimal result.


