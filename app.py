from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, emit
import random
import string

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

games = {}


@app.route("/")
def home():
    return render_template("index.html")


# CREATE GAME
@socketio.on("create_game")
def create_game(name):

    game_id = ''.join(
        random.choices(
            string.ascii_uppercase + string.digits,
            k=6
        )
    )

    games[game_id] = {
        "players": 1,
        "white": name,
        "black": None
    }

    join_room(game_id)

    emit("game_created", {
        "game_id": game_id,
        "color": "white",
        "name": name
    })


# JOIN GAME
@socketio.on("join_game")
def join_game(data):

    game_id = data["game_id"]
    name = data["name"]

    if game_id not in games:
        emit("error_message", "Game not found")
        return

    if games[game_id]["players"] >= 2:
        emit("error_message", "Game is full")
        return

    games[game_id]["players"] = 2
    games[game_id]["black"] = name

    join_room(game_id)

    emit("game_joined", {
        "color": "black",
        "name": name
    })

    emit(
        "players_ready",
        {
            "white": games[game_id]["white"],
            "black": games[game_id]["black"]
        },
        room=game_id
    )


# MOVE
@socketio.on("move")
def make_move(data):

    game_id = data["game_id"]
    move = data["move"]

    emit(
        "opponent_move",
        move,
        room=game_id,
        include_self=False
    )


# RESIGN
@socketio.on("resign")
def resign(data):

    game_id = data["game_id"]
    color = data["color"]

    if color == "white":
        winner = "Black"
    else:
        winner = "White"

    emit(
        "game_resigned",
        winner,
        room=game_id
    )


# DRAW OFFER
@socketio.on("offer_draw")
def offer_draw(data):

    game_id = data["game_id"]

    emit(
        "draw_offer",
        room=game_id,
        include_self=False
    )


# DRAW RESPONSE
@socketio.on("draw_response")
def draw_response(data):

    game_id = data["game_id"]
    accepted = data["accepted"]

    if accepted:

        emit(
            "draw_accepted",
            room=game_id
        )

    else:

        emit(
            "draw_rejected",
            room=game_id,
            include_self=False
        )


if __name__ == "__main__":
    socketio.run(app, debug=True)