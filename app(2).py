from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, emit
import random
import string

app = Flask(__name__)
app.config["SECRET_KEY"] = "checkers-secret"

socketio = SocketIO(app, cors_allowed_origins="*")

games = {}


# -----------------------------
# CREATE BOARD
# -----------------------------

def create_board():
    board = [[None for _ in range(8)] for _ in range(8)]

    # Black pieces
    for row in range(3):
        for col in range(8):
            if (row + col) % 2 == 1:
                board[row][col] = {
                    "color": "black",
                    "king": False
                }

    # Red pieces
    for row in range(5, 8):
        for col in range(8):
            if (row + col) % 2 == 1:
                board[row][col] = {
                    "color": "red",
                    "king": False
                }

    return board


def create_game_id():
    while True:
        game_id = "".join(
            random.choices(
                string.ascii_uppercase + string.digits,
                k=6
            )
        )

        if game_id not in games:
            return game_id


def inside(row, col):
    return 0 <= row < 8 and 0 <= col < 8


def opponent(color):
    return "black" if color == "red" else "red"


# -----------------------------
# DIRECTIONS
# -----------------------------

def get_directions(piece):

    if piece["king"]:
        return [
            (-1, -1),
            (-1, 1),
            (1, -1),
            (1, 1)
        ]

    if piece["color"] == "red":
        return [
            (-1, -1),
            (-1, 1)
        ]

    return [
        (1, -1),
        (1, 1)
    ]


# -----------------------------
# CAPTURES
# -----------------------------

def get_captures(board, color):

    captures = []

    for row in range(8):
        for col in range(8):

            piece = board[row][col]

            if piece is None:
                continue

            if piece["color"] != color:
                continue

            for dr, dc in get_directions(piece):

                middle_row = row + dr
                middle_col = col + dc

                target_row = row + 2 * dr
                target_col = col + 2 * dc

                if not inside(target_row, target_col):
                    continue

                middle = board[middle_row][middle_col]
                target = board[target_row][target_col]

                if (
                    middle is not None
                    and middle["color"] == opponent(color)
                    and target is None
                ):
                    captures.append({
                        "from": [row, col],
                        "to": [target_row, target_col],
                        "capture": [middle_row, middle_col]
                    })

    return captures


# -----------------------------
# NORMAL MOVES
# -----------------------------

def get_normal_moves(board, color):

    moves = []

    for row in range(8):
        for col in range(8):

            piece = board[row][col]

            if piece is None:
                continue

            if piece["color"] != color:
                continue

            for dr, dc in get_directions(piece):

                new_row = row + dr
                new_col = col + dc

                if not inside(new_row, new_col):
                    continue

                if board[new_row][new_col] is None:

                    moves.append({
                        "from": [row, col],
                        "to": [new_row, new_col],
                        "capture": None
                    })

    return moves


# -----------------------------
# ALL LEGAL MOVES
# -----------------------------

def get_moves(board, color):

    captures = get_captures(board, color)

    # Capture is mandatory
    if captures:
        return captures

    return get_normal_moves(board, color)


# -----------------------------
# CAPTURES FOR ONE PIECE
# -----------------------------

def get_piece_captures(board, row, col):

    piece = board[row][col]

    if piece is None:
        return []

    captures = []

    for dr, dc in get_directions(piece):

        middle_row = row + dr
        middle_col = col + dc

        target_row = row + 2 * dr
        target_col = col + 2 * dc

        if not inside(target_row, target_col):
            continue

        middle = board[middle_row][middle_col]
        target = board[target_row][target_col]

        if (
            middle is not None
            and middle["color"] != piece["color"]
            and target is None
        ):
            captures.append({
                "from": [row, col],
                "to": [target_row, target_col],
                "capture": [middle_row, middle_col]
            })

    return captures


# -----------------------------
# APPLY MOVE
# -----------------------------

def apply_move(game, move):

    board = game["board"]

    start_row, start_col = move["from"]
    end_row, end_col = move["to"]

    piece = board[start_row][start_col]

    board[start_row][start_col] = None
    board[end_row][end_col] = piece

    # Remove captured piece
    if move["capture"]:

        cap_row, cap_col = move["capture"]

        board[cap_row][cap_col] = None

    # Red promotion
    if piece["color"] == "red" and end_row == 0:
        piece["king"] = True

    # Black promotion
    if piece["color"] == "black" and end_row == 7:
        piece["king"] = True


# -----------------------------
# COUNT PIECES
# -----------------------------

def count_pieces(board, color):

    count = 0

    for row in board:
        for piece in row:

            if piece and piece["color"] == color:
                count += 1

    return count


# -----------------------------
# CHECK WINNER
# -----------------------------

def check_winner(game):

    board = game["board"]

    red_count = count_pieces(board, "red")
    black_count = count_pieces(board, "black")

    if red_count == 0:
        return "black"

    if black_count == 0:
        return "red"

    current_turn = game["turn"]

    if not get_moves(board, current_turn):
        return opponent(current_turn)

    return None


# -----------------------------
# HOME
# -----------------------------

@app.route("/")
def home():
    return render_template("index.html")


# -----------------------------
# CREATE GAME
# -----------------------------

@socketio.on("create_game")
def create_game(name):

    game_id = create_game_id()

    games[game_id] = {
        "board": create_board(),

        "players": {
            "red": {
                "sid": request.sid,
                "name": name
            },

            "black": None
        },

        "turn": "red",

        "history": [],

        "started": False,

        "game_over": False
    }

    join_room(game_id)

    emit(
        "game_created",
        {
            "game_id": game_id,
            "color": "red",
            "name": name
        }
    )


# -----------------------------
# JOIN GAME
# -----------------------------

@socketio.on("join_game")
def join_game(data):

    game_id = data.get("game_id", "").upper()
    name = data.get("name", "").strip()

    if game_id not in games:

        emit(
            "error_message",
            "Game ID not found."
        )

        return

    game = games[game_id]

    if game["players"]["black"] is not None:

        emit(
            "error_message",
            "Game room is full."
        )

        return

    game["players"]["black"] = {
        "sid": request.sid,
        "name": name
    }

    game["started"] = True

    join_room(game_id)

    emit(
        "game_joined",
        {
            "game_id": game_id,
            "color": "black",
            "name": name
        }
    )

    emit(
        "players_ready",
        {
            "red": game["players"]["red"]["name"],
            "black": name,
            "board": game["board"],
            "turn": game["turn"]
        },
        room=game_id
    )


# -----------------------------
# GET LEGAL MOVES
# -----------------------------

@socketio.on("get_moves")
def get_player_moves(data):

    game_id = data.get("game_id")
    row = data.get("row")
    col = data.get("col")
    color = data.get("color")

    if game_id not in games:
        return

    game = games[game_id]

    if game["game_over"]:
        return

    if color != game["turn"]:
        return

    piece = game["board"][row][col]

    if piece is None:
        return

    if piece["color"] != color:
        return

    all_moves = get_moves(
        game["board"],
        color
    )

    selected_moves = []

    for move in all_moves:

        if (
            move["from"][0] == row
            and move["from"][1] == col
        ):
            selected_moves.append(move)

    emit(
        "legal_moves",
        selected_moves
    )


# -----------------------------
# MAKE MOVE
# -----------------------------

@socketio.on("make_move")
def make_move(data):

    game_id = data.get("game_id")
    color = data.get("color")
    move = data.get("move")

    if game_id not in games:
        return

    game = games[game_id]

    if game["game_over"]:
        return

    if not game["started"]:
        return

    if color != game["turn"]:

        emit(
            "error_message",
            "It is not your turn."
        )

        return

    legal_moves = get_moves(
        game["board"],
        color
    )

    valid_move = None

    for legal in legal_moves:

        if (
            legal["from"] == move["from"]
            and legal["to"] == move["to"]
        ):
            valid_move = legal
            break

    if valid_move is None:

        emit(
            "error_message",
            "Invalid move."
        )

        return

    apply_move(
        game,
        valid_move
    )

    game["history"].append(valid_move)

    # Check if another capture is possible
    another_capture = False

    if valid_move["capture"]:

        row, col = valid_move["to"]

        extra_captures = get_piece_captures(
            game["board"],
            row,
            col
        )

        if extra_captures:
            another_capture = True

    # Change turn only if there is no multiple jump
    if not another_capture:
        game["turn"] = opponent(color)

    winner = check_winner(game)

    if winner:

        game["game_over"] = True

        emit(
            "move_made",
            {
                "move": valid_move,
                "board": game["board"],
                "turn": game["turn"],
                "another_capture": False
            },
            room=game_id
        )

        emit(
            "game_over",
            {
                "winner": winner,
                "reason": "No legal moves or pieces remaining"
            },
            room=game_id
        )

        return

    emit(
        "move_made",
        {
            "move": valid_move,
            "board": game["board"],
            "turn": game["turn"],
            "another_capture": another_capture
        },
        room=game_id
    )


# -----------------------------
# RESIGN
# -----------------------------

@socketio.on("resign")
def resign(data):

    game_id = data.get("game_id")
    color = data.get("color")

    if game_id not in games:
        return

    game = games[game_id]

    if game["game_over"]:
        return

    winner = opponent(color)

    game["game_over"] = True

    emit(
        "game_over",
        {
            "winner": winner,
            "reason": color.capitalize() + " resigned"
        },
        room=game_id
    )


# -----------------------------
# DISCONNECT
# -----------------------------

@socketio.on("disconnect")
def disconnect():

    for game_id, game in games.items():

        for color in ["red", "black"]:

            player = game["players"][color]

            if player and player["sid"] == request.sid:

                if (
                    game["started"]
                    and not game["game_over"]
                ):

                    emit(
                        "opponent_left",
                        {
                            "message":
                            color.capitalize()
                            + " player left the game."
                        },
                        room=game_id
                    )

                return


# -----------------------------
# RUN SERVER
# -----------------------------

if __name__ == "__main__":
    socketio.run(
        app,
        debug=True
    )