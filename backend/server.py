from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import string
import os

# =========================================================
# FLASK SETUP
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.dirname(BASE_DIR)

app = Flask(__name__)
app.config["SECRET_KEY"] = "royal-8-ball-secret"

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)

# =========================================================
# ROOM STORAGE
# =========================================================

rooms = {}


# =========================================================
# GENERATE ROOM CODE
# =========================================================

def generate_room_code():

    while True:

        code = "".join(
            random.choices(
                string.ascii_uppercase + string.digits,
                k=6
            )
        )

        if code not in rooms:

            return code


# =========================================================
# SERVE FRONTEND
# =========================================================

@app.route("/")
def index():

    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


@app.route("/<path:filename>")
def frontend_files(filename):

    return send_from_directory(
        FRONTEND_DIR,
        filename
    )


# =========================================================
# SOCKET CONNECT
# =========================================================

@socketio.on("connect")
def handle_connect():

    print(
        "Client connected:",
        request_id()
    )


def request_id():

    from flask import request

    return request.sid


# =========================================================
# SOCKET DISCONNECT
# =========================================================

@socketio.on("disconnect")
def handle_disconnect():

    from flask import request

    sid = request.sid

    print(
        "Client disconnected:",
        sid
    )

    room_to_remove = None

    for code, room in rooms.items():

        for player in room["players"]:

            if player["sid"] == sid:

                room_to_remove = code

                break

        if room_to_remove:
            break

    if room_to_remove:

        room = rooms[room_to_remove]

        room["players"] = [
            player
            for player in room["players"]
            if player["sid"] != sid
        ]

        emit(
            "player_left",
            {
                "message": "A player left the room."
            },
            to=room_to_remove
        )

        if len(room["players"]) == 0:

            del rooms[room_to_remove]

            print(
                "Room deleted:",
                room_to_remove
            )


# =========================================================
# CREATE ROOM
# =========================================================

@socketio.on("create_room")
def create_room(data):

    from flask import request

    sid = request.sid

    name = "Player 1"

    if data and data.get("name"):

        name = str(
            data["name"]
        ).strip()

        if not name:

            name = "Player 1"

    room_code = generate_room_code()

    rooms[room_code] = {

        "players": [
            {
                "sid": sid,
                "name": name,
                "player": 0
            }
        ],

        "state": None,

        "current_player": 0
    }

    join_room(room_code)

    print(
        f"Room created: {room_code} by {name}"
    )

    emit(
        "room_created",
        {
            "room": room_code,
            "player": 0,
            "name": name
        }
    )


# =========================================================
# JOIN ROOM
# =========================================================

@socketio.on("join_room")
def handle_join_room(data):

    from flask import request

    sid = request.sid

    if not data:

        emit(
            "error_message",
            {
                "message": "Invalid request."
            }
        )

        return

    room_code = str(
        data.get("room", "")
    ).strip().upper()

    name = str(
        data.get("name", "Player 2")
    ).strip()

    if not name:

        name = "Player 2"

    # -----------------------------------------------------
    # CHECK ROOM
    # -----------------------------------------------------

    if room_code not in rooms:

        emit(
            "error_message",
            {
                "message": "Room not found."
            }
        )

        return

    room = rooms[room_code]

    # -----------------------------------------------------
    # CHECK ROOM FULL
    # -----------------------------------------------------

    if len(room["players"]) >= 2:

        emit(
            "error_message",
            {
                "message": "Room is already full."
            }
        )

        return

    # -----------------------------------------------------
    # ADD PLAYER
    # -----------------------------------------------------

    player_number = 1

    room["players"].append(
        {
            "sid": sid,
            "name": name,
            "player": player_number
        }
    )

    join_room(room_code)

    print(
        f"{name} joined room {room_code}"
    )

    # -----------------------------------------------------
    # TELL JOINED PLAYER
    # -----------------------------------------------------

    emit(
        "room_joined",
        {
            "room": room_code,
            "player": player_number,
            "name": name
        }
    )

    # -----------------------------------------------------
    # PLAYER LIST
    # -----------------------------------------------------

    players_data = [

        {
            "name": player["name"],
            "player": player["player"]
        }

        for player in room["players"]

    ]

    # -----------------------------------------------------
    # TELL BOTH PLAYERS
    # -----------------------------------------------------

    emit(
        "player_joined",
        {
            "players": players_data,
            "state": room["state"]
        },
        to=room_code
    )

    # -----------------------------------------------------
    # START GAME
    # -----------------------------------------------------

    emit(
        "game_start",
        {
            "players": players_data,
            "state": room["state"],
            "current_player": room["current_player"]
        },
        to=room_code
    )


# =========================================================
# GAME READY
# =========================================================

@socketio.on("game_ready")
def game_ready(data):

    from flask import request

    sid = request.sid

    room_code = str(
        data.get("room", "")
    ).strip().upper()

    if room_code not in rooms:

        return

    room = rooms[room_code]

    if len(room["players"]) < 2:

        return

    emit(
        "game_start",
        {
            "players": [
                {
                    "name": player["name"],
                    "player": player["player"]
                }

                for player in room["players"]
            ],

            "state": room["state"],

            "current_player":
                room["current_player"]
        },

        to=room_code
    )


# =========================================================
# SHOT
# =========================================================

@socketio.on("shot")
def handle_shot(data):

    from flask import request

    sid = request.sid

    if not data:

        return

    room_code = str(
        data.get("room", "")
    ).strip().upper()

    if room_code not in rooms:

        return

    room = rooms[room_code]

    player = data.get(
        "player",
        -1
    )

    # -----------------------------------------------------
    # VERIFY PLAYER
    # -----------------------------------------------------

    valid_player = False

    for p in room["players"]:

        if (
            p["sid"] == sid
            and p["player"] == player
        ):

            valid_player = True

            break

    if not valid_player:

        return

    # -----------------------------------------------------
    # SEND SHOT TO OTHER PLAYER
    # -----------------------------------------------------

    emit(
        "shot",
        data,
        to=room_code,
        include_self=False
    )


# =========================================================
# STATE UPDATE
# =========================================================

@socketio.on("state_update")
def handle_state_update(data):

    from flask import request

    sid = request.sid

    if not data:

        return

    room_code = str(
        data.get("room", "")
    ).strip().upper()

    if room_code not in rooms:

        return

    room = rooms[room_code]

    # -----------------------------------------------------
    # SAVE STATE
    # -----------------------------------------------------

    if "state" in data:

        room["state"] = data["state"]

    # -----------------------------------------------------
    # SEND TO OTHER PLAYER
    # -----------------------------------------------------

    emit(
        "state_update",
        {
            "state": room["state"]
        },
        to=room_code,
        include_self=False
    )


# =========================================================
# TURN CHANGE
# =========================================================

@socketio.on("turn_changed")
def handle_turn_changed(data):

    if not data:

        return

    room_code = str(
        data.get("room", "")
    ).strip().upper()

    player = data.get(
        "player",
        0
    )

    if room_code not in rooms:

        return

    rooms[room_code][
        "current_player"
    ] = player

    emit(
        "turn_changed",
        {
            "player": player
        },
        to=room_code
    )


# =========================================================
# GAME OVER
# =========================================================

@socketio.on("game_over")
def handle_game_over(data):

    if not data:

        return

    room_code = str(
        data.get("room", "")
    ).strip().upper()

    if room_code not in rooms:

        return

    emit(
        "game_over",
        {
            "winner":
                data.get("winner"),

            "message":
                data.get(
                    "message",
                    "Game over."
                )
        },
        to=room_code
    )


# =========================================================
# RESTART GAME
# =========================================================

@socketio.on("restart_game")
def handle_restart_game(data):

    if not data:

        return

    room_code = str(
        data.get("room", "")
    ).strip().upper()

    if room_code not in rooms:

        return

    rooms[room_code][
        "state"
    ] = None

    rooms[room_code][
        "current_player"
    ] = 0

    emit(
        "restart_game",
        {
            "current_player": 0
        },
        to=room_code
    )


# =========================================================
# LEAVE ROOM
# =========================================================

@socketio.on("leave_room")
def handle_leave_room(data):

    from flask import request

    sid = request.sid

    if not data:

        return

    room_code = str(
        data.get("room", "")
    ).strip().upper()

    if room_code not in rooms:

        return

    room = rooms[room_code]

    leave_room(room_code)

    room["players"] = [

        player

        for player in room["players"]

        if player["sid"] != sid

    ]

    emit(
        "player_left",
        {
            "message": "Player left the room."
        },
        to=room_code
    )

    if len(room["players"]) == 0:

        del rooms[room_code]

        print(
            "Room deleted:",
            room_code
        )


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    print("=" * 55)
    print("ROYAL 8 BALL SERVER")
    print("=" * 55)
    print("Server running at:")
    print("http://127.0.0.1:5000")
    print("=" * 55)

    socketio.run(
        app,
        host="127.0.0.1",
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )