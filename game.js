/* =========================================================
   ROYAL 8 BALL
   CLEAN GAME.JS
   SINGLE PLAYER + TWO PLAYER + ONLINE MULTIPLAYER
========================================================= */


/* =========================================================
   DOM
========================================================= */

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");

const singleModeButton = document.getElementById("singleModeButton");
const twoModeButton = document.getElementById("twoModeButton");
const onlineModeButton = document.getElementById("onlineModeButton");

const startButton = document.getElementById("startButton");

const backButton = document.getElementById("backButton");
const restartButton = document.getElementById("restartButton");

const playAgainButton = document.getElementById("playAgainButton");
const menuButton = document.getElementById("menuButton");

const player1Input = document.getElementById("player1Input");
const player2Input = document.getElementById("player2Input");
const player2Box = document.getElementById("player2Box");

const onlinePanel = document.getElementById("onlinePanel");
const createRoomButton = document.getElementById("createRoomButton");
const joinRoomButton = document.getElementById("joinRoomButton");

const roomCodeInput = document.getElementById("roomCodeInput");
const createdRoom = document.getElementById("createdRoom");
const roomCodeText = document.getElementById("roomCodeText");
const onlineStatus = document.getElementById("onlineStatus");

const canvas = document.getElementById("poolCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const turnText = document.getElementById("turnText");
const statusText = document.getElementById("statusText");

const powerFill = document.getElementById("powerFill");
const powerText = document.getElementById("powerText");

const playerName1 = document.getElementById("playerName1");
const playerName2 = document.getElementById("playerName2");

const playerGroup1 = document.getElementById("playerGroup1");
const playerGroup2 = document.getElementById("playerGroup2");

const playerScore1 = document.getElementById("playerScore1");
const playerScore2 = document.getElementById("playerScore2");

const playerCard1 = document.getElementById("playerCard1");
const playerCard2 = document.getElementById("playerCard2");

const modeLabel = document.getElementById("modeLabel");

const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");


/* =========================================================
   SOCKET.IO
========================================================= */

let socket = null;

if (typeof io !== "undefined") {

    socket = io("http://127.0.0.1:5000", {
        autoConnect: false
    });

}


/* =========================================================
   ONLINE STATE
========================================================= */

let onlineRoom = null;
let onlinePlayer = null;
let onlineConnected = false;
let onlineReady = false;


/* =========================================================
   GAME STATE
========================================================= */

let gameMode = "single";

let players = [
    {
        name: "Player 1",
        group: null,
        score: 0
    },
    {
        name: "Royal AI",
        group: null,
        score: 0
    }
];

let currentPlayer = 0;

let balls = [];
let pockets = [];

let gameRunning = false;
let shotInProgress = false;

let aiming = false;

let pointerX = 0;
let pointerY = 0;

let aimStartX = 0;
let aimStartY = 0;

let power = 0;

let animationFrame = 0;
let lastTime = 0;

let aiTimer = null;

let shotPocketed = [];
let shotCueBallPocketed = false;
let shotHadContact = false;
let firstContactBall = null;
let eightBallPocketed = false;
let scratch = false;

let winner = null;


/* =========================================================
   TABLE
========================================================= */

const TABLE = {

    width: 1000,
    height: 520,

    cushion: 42,

    ballRadius: 12,

    pocketRadius: 27

};


/* =========================================================
   PHYSICS
========================================================= */

const PHYSICS = {

    friction: 0.992,

    cushionRestitution: 0.86,

    ballRestitution: 0.96,

    maxSpeed: 16,

    stopSpeed: 0.025

};


/* =========================================================
   BALL COLORS
========================================================= */

const solidColors = {

    1: "#f5c542",
    2: "#285dcc",
    3: "#df3434",
    4: "#7943b8",
    5: "#ef8925",
    6: "#168a50",
    7: "#852323"

};


const stripeColors = {

    9: "#f5c542",
    10: "#285dcc",
    11: "#df3434",
    12: "#7943b8",
    13: "#ef8925",
    14: "#168a50",
    15: "#852323"

};


/* =========================================================
   CANVAS
========================================================= */

function setupCanvas() {

    if (!canvas || !ctx) return;

    const dpr =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );

    canvas.width =
        TABLE.width * dpr;

    canvas.height =
        TABLE.height * dpr;

    canvas.style.aspectRatio =
        `${TABLE.width}/${TABLE.height}`;

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

}

window.addEventListener(
    "resize",
    setupCanvas
);


/* =========================================================
   MODE SELECTION
========================================================= */

function selectMode(mode) {

    gameMode = mode;

    if (singleModeButton) {

        singleModeButton.classList.toggle(
            "selected",
            mode === "single"
        );

    }

    if (twoModeButton) {

        twoModeButton.classList.toggle(
            "selected",
            mode === "two"
        );

    }

    if (onlineModeButton) {

        onlineModeButton.classList.toggle(
            "selected",
            mode === "online"
        );

    }


    if (mode === "single") {

        if (player2Box) {
            player2Box.classList.add("hidden");
        }

        if (onlinePanel) {
            onlinePanel.classList.add("hidden");
        }

        if (startButton) {
            startButton.classList.remove("hidden");
        }

    }


    if (mode === "two") {

        if (player2Box) {
            player2Box.classList.remove("hidden");
        }

        if (onlinePanel) {
            onlinePanel.classList.add("hidden");
        }

        if (startButton) {
            startButton.classList.remove("hidden");
        }

    }


    if (mode === "online") {

        if (player2Box) {
            player2Box.classList.add("hidden");
        }

        if (onlinePanel) {
            onlinePanel.classList.remove("hidden");
        }

        if (startButton) {
            startButton.classList.add("hidden");
        }

        connectSocket();

    }

}


if (singleModeButton) {

    singleModeButton.addEventListener(
        "click",
        () => selectMode("single")
    );

}


if (twoModeButton) {

    twoModeButton.addEventListener(
        "click",
        () => selectMode("two")
    );

}


if (onlineModeButton) {

    onlineModeButton.addEventListener(
        "click",
        () => selectMode("online")
    );

}


/* =========================================================
   SOCKET CONNECTION
========================================================= */

function connectSocket() {

    if (!socket) {

        if (onlineStatus) {

            onlineStatus.textContent =
                "● SOCKET.IO NOT LOADED";

        }

        return;

    }


    if (socket.connected) {

        onlineConnected = true;

        if (onlineStatus) {

            onlineStatus.textContent =
                "● SERVER CONNECTED";

        }

        return;

    }


    if (onlineStatus) {

        onlineStatus.textContent =
            "● CONNECTING...";

    }

    socket.connect();

}


/* =========================================================
   SOCKET EVENTS
========================================================= */

if (socket) {


    socket.on(
        "connect",
        () => {

            onlineConnected = true;

            console.log(
                "Connected:",
                socket.id
            );

            if (onlineStatus) {

                onlineStatus.textContent =
                    "● SERVER CONNECTED";

            }

        }
    );


    socket.on(
        "disconnect",
        () => {

            onlineConnected = false;
            onlineReady = false;

            if (onlineStatus) {

                onlineStatus.textContent =
                    "● SERVER DISCONNECTED";

            }

        }
    );


    socket.on(
        "connect_error",
        error => {

            console.error(
                "Socket connection error:",
                error
            );

            onlineConnected = false;

            if (onlineStatus) {

                onlineStatus.textContent =
                    "● SERVER CONNECTION FAILED";

            }

        }
    );


    /* =============================================
       ROOM CREATED
    ============================================= */

    socket.on(
        "room_created",
        data => {

            console.log(
                "ROOM CREATED:",
                data
            );


            onlineRoom =
                data.room;

            onlinePlayer = 0;


            if (roomCodeText) {

                roomCodeText.textContent =
                    data.room;

            }


            if (createdRoom) {

                createdRoom.classList.remove(
                    "hidden"
                );

            }


            if (onlineStatus) {

                onlineStatus.textContent =
                    "● WAITING FOR PLAYER 2";

            }


            if (statusText) {

                statusText.textContent =
                    `Room ${data.room} created. Share this code with your friend.`;

            }

        }
    );


    /* =============================================
       ROOM JOINED
    ============================================= */

    socket.on(
        "room_joined",
        data => {

            console.log(
                "ROOM JOINED:",
                data
            );


            onlineRoom =
                data.room;

            onlinePlayer = 1;


            if (onlineStatus) {

                onlineStatus.textContent =
                    "● ROOM JOINED — WAITING FOR GAME";

            }

        }
    );


    /* =============================================
       PLAYER JOINED
    ============================================= */

    socket.on(
        "player_joined",
        data => {

            console.log(
                "PLAYER JOINED:",
                data
            );


            onlineReady = true;


            if (onlineStatus) {

                onlineStatus.textContent =
                    "● PLAYER 2 CONNECTED";

            }


            if (data.players) {

                updateOnlinePlayers(
                    data.players
                );

            }


            if (data.state) {

                loadRemoteState(
                    data.state
                );

            }


            startOnlineGameIfNeeded();

        }
    );


    /* =============================================
       GAME START
    ============================================= */

    socket.on(
        "game_start",
        data => {

            console.log(
                "GAME START:",
                data
            );


            onlineReady = true;


            if (data.players) {

                updateOnlinePlayers(
                    data.players
                );

            }


            if (data.state) {

                loadRemoteState(
                    data.state
                );

            }


            startOnlineGameIfNeeded();

        }
    );


    /* =============================================
       REMOTE SHOT
    ============================================= */

    socket.on(
        "shot",
        data => {

            if (gameMode !== "online") {
                return;
            }


            if (
                data.player ===
                onlinePlayer
            ) {

                return;

            }


            if (shotInProgress) {
                return;
            }


            currentPlayer =
                data.player;


            shoot(
                data.dx,
                data.dy,
                data.power,
                true
            );

        }
    );


    /* =============================================
       STATE UPDATE
    ============================================= */

    socket.on(
        "state_update",
        data => {

            if (gameMode !== "online") {
                return;
            }


            if (!data.state) {
                return;
            }


            loadRemoteState(
                data.state
            );

        }
    );


    /* =============================================
       TURN CHANGE
    ============================================= */

    socket.on(
        "turn_changed",
        data => {

            currentPlayer =
                data.player;

            updatePlayerUI();

        }
    );


    /* =============================================
       GAME OVER
    ============================================= */

    socket.on(
        "game_over",
        data => {

            showResult(
                data.winner,
                data.message ||
                "Match complete."
            );

        }
    );


    /* =============================================
       RESTART
    ============================================= */

    socket.on(
        "restart_game",
        () => {

            createGame();

            currentPlayer = 0;

            gameRunning = true;

            shotInProgress = false;

            resultModal.classList.add(
                "hidden"
            );

            updatePlayerUI();

            startAnimation();

        }
    );


    /* =============================================
       SERVER ERROR
    ============================================= */

    socket.on(
        "error_message",
        data => {

            console.error(
                "Server error:",
                data
            );


            alert(
                data.message ||
                "Something went wrong."
            );

        }
    );

}


/* =========================================================
   CREATE ROOM
========================================================= */

if (createRoomButton) {

    createRoomButton.addEventListener(
        "click",
        createOnlineRoom
    );

}


function createOnlineRoom() {

    if (!socket) {

        alert(
            "Socket.IO is not loaded."
        );

        return;

    }


    connectSocket();


    const name =
        player1Input &&
        player1Input.value.trim()
            ? player1Input.value.trim()
            : "Player 1";


    if (onlineStatus) {

        onlineStatus.textContent =
            "● CREATING ROOM...";

    }


    waitForSocket(
        () => {

            socket.emit(
                "create_room",
                {
                    name: name
                }
            );

        }
    );

}


/* =========================================================
   JOIN ROOM
========================================================= */

if (joinRoomButton) {

    joinRoomButton.addEventListener(
        "click",
        joinOnlineRoom
    );

}


function joinOnlineRoom() {

    if (!socket) {

        alert(
            "Socket.IO is not loaded."
        );

        return;

    }


    const code =
        roomCodeInput
            ? roomCodeInput.value
                .trim()
                .toUpperCase()
            : "";


    if (!code) {

        alert(
            "Please enter the room code."
        );

        return;

    }


    const name =
        player1Input &&
        player1Input.value.trim()
            ? player1Input.value.trim()
            : "Player 2";


    onlineRoom =
        code;


    connectSocket();


    if (onlineStatus) {

        onlineStatus.textContent =
            "● JOINING ROOM...";

    }


    waitForSocket(
        () => {

            socket.emit(
                "join_room",
                {
                    room: code,
                    name: name
                }
            );

        }
    );

}


/* =========================================================
   WAIT FOR SOCKET
========================================================= */

function waitForSocket(callback) {

    if (!socket) {
        return;
    }


    if (socket.connected) {

        callback();

        return;

    }


    let attempts = 0;


    const timer =
        setInterval(
            () => {

                attempts++;


                if (socket.connected) {

                    clearInterval(timer);

                    callback();

                }


                if (attempts >= 50) {

                    clearInterval(timer);

                    alert(
                        "Could not connect to the Python server."
                    );

                }

            },
            100
        );

}


/* =========================================================
   UPDATE ONLINE PLAYERS
========================================================= */

function updateOnlinePlayers(data) {

    if (!Array.isArray(data)) {
        return;
    }


    if (data[0]) {

        players[0].name =
            data[0].name ||
            "Player 1";

    }


    if (data[1]) {

        players[1].name =
            data[1].name ||
            "Player 2";

    }


    updatePlayerUI();

}


/* =========================================================
   START ONLINE GAME
========================================================= */

function startOnlineGameIfNeeded() {

    if (!onlineReady) {
        return;
    }


    if (gameRunning) {
        return;
    }


    startGame(true);

}


/* =========================================================
   START BUTTON
========================================================= */

if (startButton) {

    startButton.addEventListener(
        "click",
        () => startGame(false)
    );

}


/* =========================================================
   START GAME
========================================================= */

function startGame(fromOnline = false) {

    clearTimeout(aiTimer);


    const name1 =
        player1Input &&
        player1Input.value.trim()
            ? player1Input.value.trim()
            : players[0].name ||
              "Player 1";


    let name2;


    if (gameMode === "single") {

        name2 =
            "Royal AI";

    }

    else if (gameMode === "two") {

        name2 =
            player2Input &&
            player2Input.value.trim()
                ? player2Input.value.trim()
                : "Player 2";

    }

    else {

        name2 =
            players[1].name ||
            "Player 2";

    }


    players = [

        {
            name: name1,
            group: null,
            score: 0
        },

        {
            name: name2,
            group: null,
            score: 0
        }

    ];


    currentPlayer = 0;

    gameRunning = true;

    shotInProgress = false;

    aiming = false;

    winner = null;


    if (resultModal) {

        resultModal.classList.add(
            "hidden"
        );

    }


    if (startScreen) {

        startScreen.classList.add(
            "hidden"
        );

    }


    if (gameScreen) {

        gameScreen.classList.remove(
            "hidden"
        );

    }


    if (modeLabel) {

        if (gameMode === "single") {

            modeLabel.textContent =
                "VS ROYAL AI";

        }

        else if (gameMode === "two") {

            modeLabel.textContent =
                "2 PLAYER DUEL";

        }

        else {

            modeLabel.textContent =
                "ONLINE MATCH";

        }

    }


    setupCanvas();

    createGame();

    updatePlayerUI();


    lastTime =
        performance.now();

    startAnimation();


    if (
        gameMode === "online" &&
        !fromOnline &&
        socket &&
        socket.connected
    ) {

        socket.emit(
            "game_ready",
            {
                room: onlineRoom
            }
        );

    }

}


/* =========================================================
   CREATE GAME
========================================================= */

function createGame() {

    balls = [];

    pockets = [];

    shotPocketed = [];

    shotCueBallPocketed = false;

    shotHadContact = false;

    firstContactBall = null;

    eightBallPocketed = false;

    scratch = false;

    power = 0;


    if (powerFill) {

        powerFill.style.width =
            "0%";

    }


    if (powerText) {

        powerText.textContent =
            "0%";

    }


    /* CUE BALL */

    balls.push({

        number: 0,

        type: "cue",

        x: 245,

        y: TABLE.height / 2,

        vx: 0,

        vy: 0,

        radius: TABLE.ballRadius,

        active: true

    });


    /* RACK */

    const startX = 700;

    const centerY =
        TABLE.height / 2;

    const spacing =
        TABLE.ballRadius * 2.02;


    const rack = [

        [1],

        [2, 9],

        [3, 8, 10],

        [4, 11, 5, 12],

        [6, 13, 7, 14, 15]

    ];


    for (
        let row = 0;
        row < rack.length;
        row++
    ) {

        const rowBalls =
            rack[row];


        for (
            let col = 0;
            col < rowBalls.length;
            col++
        ) {

            const number =
                rowBalls[col];


            const x =
                startX +
                row *
                spacing *
                0.866;


            const y =
                centerY +
                (
                    col -
                    (rowBalls.length - 1) / 2
                ) *
                spacing;


            balls.push({

                number: number,

                type:
                    number === 8
                        ? "eight"
                        : number <= 7
                            ? "solid"
                            : "stripe",

                x: x,

                y: y,

                vx: 0,

                vy: 0,

                radius:
                    TABLE.ballRadius,

                active: true

            });

        }

    }


    createPockets();

    updatePlayerUI();

}


/* =========================================================
   POCKETS
========================================================= */

function createPockets() {

    const c =
        TABLE.cushion;


    pockets = [

        {
            x: c,
            y: c
        },

        {
            x: TABLE.width / 2,
            y: c - 3
        },

        {
            x: TABLE.width - c,
            y: c
        },

        {
            x: c,
            y: TABLE.height - c
        },

        {
            x: TABLE.width / 2,
            y: TABLE.height - c + 3
        },

        {
            x: TABLE.width - c,
            y: TABLE.height - c
        }

    ];

}


/* =========================================================
   ANIMATION
========================================================= */

function startAnimation() {

    cancelAnimationFrame(
        animationFrame
    );


    lastTime =
        performance.now();


    function loop(now) {

        if (!gameRunning) {
            return;
        }


        let dt =
            (now - lastTime) /
            16.6667;


        lastTime = now;


        dt =
            Math.min(
                dt,
                2
            );


        update(dt);

        draw();


        animationFrame =
            requestAnimationFrame(
                loop
            );

    }


    animationFrame =
        requestAnimationFrame(
            loop
        );

}


/* =========================================================
   UPDATE PHYSICS
========================================================= */

function update(dt) {

    if (!shotInProgress) {
        return;
    }


    let moving = false;


    for (const ball of balls) {

        if (!ball.active) {
            continue;
        }


        ball.x +=
            ball.vx * dt;


        ball.y +=
            ball.vy * dt;


        const friction =
            Math.pow(
                PHYSICS.friction,
                dt
            );


        ball.vx *= friction;

        ball.vy *= friction;


        if (
            Math.abs(ball.vx) <
            PHYSICS.stopSpeed
        ) {

            ball.vx = 0;

        }


        if (
            Math.abs(ball.vy) <
            PHYSICS.stopSpeed
        ) {

            ball.vy = 0;

        }


        const speed =
            Math.hypot(
                ball.vx,
                ball.vy
            );


        if (
            speed >
            PHYSICS.maxSpeed
        ) {

            const scale =
                PHYSICS.maxSpeed /
                speed;


            ball.vx *= scale;
            ball.vy *= scale;

        }


        checkPocket(ball);


        if (!ball.active) {
            continue;
        }


        wallCollision(ball);

    }


    for (let i = 0; i < 2; i++) {

        ballCollisions();

    }


    for (const ball of balls) {

        if (!ball.active) {
            continue;
        }


        if (
            Math.abs(ball.vx) > 0 ||
            Math.abs(ball.vy) > 0
        ) {

            moving = true;

            break;

        }

    }


    if (!moving) {

        finishShot();

    }

}


/* =========================================================
   WALL COLLISION
========================================================= */

function wallCollision(ball) {

    const left =
        TABLE.cushion +
        ball.radius;

    const right =
        TABLE.width -
        TABLE.cushion -
        ball.radius;

    const top =
        TABLE.cushion +
        ball.radius;

    const bottom =
        TABLE.height -
        TABLE.cushion -
        ball.radius;


    if (ball.x < left) {

        ball.x = left;

        if (ball.vx < 0) {

            ball.vx =
                -ball.vx *
                PHYSICS.cushionRestitution;

        }

    }


    if (ball.x > right) {

        ball.x = right;

        if (ball.vx > 0) {

            ball.vx =
                -ball.vx *
                PHYSICS.cushionRestitution;

        }

    }


    if (ball.y < top) {

        ball.y = top;

        if (ball.vy < 0) {

            ball.vy =
                -ball.vy *
                PHYSICS.cushionRestitution;

        }

    }


    if (ball.y > bottom) {

        ball.y = bottom;

        if (ball.vy > 0) {

            ball.vy =
                -ball.vy *
                PHYSICS.cushionRestitution;

        }

    }

}


/* =========================================================
   BALL COLLISIONS
========================================================= */

function ballCollisions() {

    for (
        let i = 0;
        i < balls.length;
        i++
    ) {

        const a =
            balls[i];


        if (!a.active) {
            continue;
        }


        for (
            let j = i + 1;
            j < balls.length;
            j++
        ) {

            const b =
                balls[j];


            if (!b.active) {
                continue;
            }


            let dx =
                b.x - a.x;

            let dy =
                b.y - a.y;


            let distance =
                Math.hypot(
                    dx,
                    dy
                );


            const minDistance =
                a.radius +
                b.radius;


            if (distance === 0) {

                distance = 0.001;

                dx = 0.001;

                dy = 0;

            }


            if (
                distance >=
                minDistance
            ) {

                continue;

            }


            if (!shotHadContact) {

                shotHadContact = true;


                if (!firstContactBall) {

                    firstContactBall =
                        a.type === "cue"
                            ? b
                            : a;

                }

            }


            const nx =
                dx / distance;

            const ny =
                dy / distance;


            const overlap =
                minDistance -
                distance;


            a.x -=
                nx *
                overlap *
                0.5;

            a.y -=
                ny *
                overlap *
                0.5;


            b.x +=
                nx *
                overlap *
                0.5;

            b.y +=
                ny *
                overlap *
                0.5;


            const rvx =
                b.vx -
                a.vx;

            const rvy =
                b.vy -
                a.vy;


            const velocityAlongNormal =
                rvx * nx +
                rvy * ny;


            if (
                velocityAlongNormal > 0
            ) {

                continue;

            }


            const impulse =
                -(
                    1 +
                    PHYSICS.ballRestitution
                ) *
                velocityAlongNormal /
                2;


            const ix =
                impulse * nx;

            const iy =
                impulse * ny;


            a.vx -= ix;
            a.vy -= iy;

            b.vx += ix;
            b.vy += iy;

        }

    }

}


/* =========================================================
   POCKET CHECK
========================================================= */

function checkPocket(ball) {

    for (const pocket of pockets) {

        const distance =
            Math.hypot(
                ball.x - pocket.x,
                ball.y - pocket.y
            );


        if (
            distance <
            TABLE.pocketRadius
        ) {

            ball.active = false;

            ball.vx = 0;
            ball.vy = 0;


            shotPocketed.push(
                ball
            );


            if (
                ball.type === "cue"
            ) {

                shotCueBallPocketed =
                    true;

                scratch = true;

            }


            if (
                ball.type === "eight"
            ) {

                eightBallPocketed =
                    true;

            }


            break;

        }

    }

}


/* =========================================================
   POINTER → TABLE
========================================================= */

function pointerToTable(event) {

    const rect =
        canvas.getBoundingClientRect();


    const scaleX =
        TABLE.width /
        rect.width;


    const scaleY =
        TABLE.height /
        rect.height;


    let clientX;
    let clientY;


    if (
        event.touches &&
        event.touches.length
    ) {

        clientX =
            event.touches[0].clientX;

        clientY =
            event.touches[0].clientY;

    }

    else {

        clientX =
            event.clientX;

        clientY =
            event.clientY;

    }


    return {

        x:
            (
                clientX -
                rect.left
            ) *
            scaleX,

        y:
            (
                clientY -
                rect.top
            ) *
            scaleY

    };

}


/* =========================================================
   POINTER DOWN
========================================================= */

function pointerDown(event) {

    if (!gameRunning) {
        return;
    }


    if (shotInProgress) {
        return;
    }


    if (!isLocalTurn()) {
        return;
    }


    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue) {
        return;
    }


    const point =
        pointerToTable(event);


    const distance =
        Math.hypot(
            point.x - cue.x,
            point.y - cue.y
        );


    if (
        distance >
        cue.radius * 4
    ) {

        return;

    }


    event.preventDefault();


    aiming = true;


    aimStartX =
        cue.x;

    aimStartY =
        cue.y;


    pointerX =
        point.x;

    pointerY =
        point.y;


    updatePower();

}


/* =========================================================
   POINTER MOVE
========================================================= */

function pointerMove(event) {

    if (!aiming) {
        return;
    }


    const point =
        pointerToTable(event);


    pointerX =
        point.x;

    pointerY =
        point.y;


    updatePower();


    event.preventDefault();

}


/* =========================================================
   POINTER UP
========================================================= */

function pointerUp(event) {

    if (!aiming) {
        return;
    }


    aiming = false;


    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue) {
        return;
    }


    const dx =
        aimStartX -
        pointerX;


    const dy =
        aimStartY -
        pointerY;


    const distance =
        Math.hypot(
            dx,
            dy
        );


    if (distance < 8) {

        power = 0;

        updatePowerUI();

        return;

    }


    shoot(
        dx,
        dy,
        power,
        false
    );


    event.preventDefault();

}


/* =========================================================
   POWER
========================================================= */

function updatePower() {

    const dx =
        aimStartX -
        pointerX;


    const dy =
        aimStartY -
        pointerY;


    const distance =
        Math.hypot(
            dx,
            dy
        );


    power =
        Math.min(
            distance / 180,
            1
        );


    updatePowerUI();

}


function updatePowerUI() {

    const percent =
        Math.round(
            power * 100
        );


    if (powerFill) {

        powerFill.style.width =
            `${percent}%`;

    }


    if (powerText) {

        powerText.textContent =
            `${percent}%`;

    }

}


/* =========================================================
   POINTER EVENTS
========================================================= */

if (canvas) {

    canvas.addEventListener(
        "mousedown",
        pointerDown
    );


    canvas.addEventListener(
        "touchstart",
        pointerDown,
        {
            passive: false
        }
    );

}


window.addEventListener(
    "mousemove",
    pointerMove
);


window.addEventListener(
    "mouseup",
    pointerUp
);


window.addEventListener(
    "touchmove",
    pointerMove,
    {
        passive: false
    }
);


window.addEventListener(
    "touchend",
    pointerUp,
    {
        passive: false
    }
);


/* =========================================================
   LOCAL TURN
========================================================= */

function isLocalTurn() {

    if (gameMode !== "online") {

        return true;

    }


    return (
        onlinePlayer ===
        currentPlayer
    );

}


/* =========================================================
   SHOOT
========================================================= */

function shoot(
    dx,
    dy,
    shotPower,
    remote = false
) {

    if (shotInProgress) {
        return;
    }


    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue) {
        return;
    }


    const length =
        Math.hypot(
            dx,
            dy
        );


    if (length < 0.001) {
        return;
    }


    const nx =
        dx / length;

    const ny =
        dy / length;


    const speed =
        3 +
        shotPower * 12;


    cue.vx =
        nx * speed;

    cue.vy =
        ny * speed;


    shotInProgress = true;


    shotPocketed = [];

    shotCueBallPocketed = false;

    shotHadContact = false;

    firstContactBall = null;

    scratch = false;

    eightBallPocketed = false;


    if (statusText) {

        statusText.textContent =
            "Balls are moving...";

    }


    /* SEND TO SERVER */

    if (
        gameMode === "online" &&
        !remote &&
        socket &&
        socket.connected
    ) {

        socket.emit(
            "shot",
            {
                room: onlineRoom,

                player: onlinePlayer,

                dx: dx,

                dy: dy,

                power: shotPower

            }
        );

    }

}


/* =========================================================
   FINISH SHOT
========================================================= */

function finishShot() {

    shotInProgress = false;


    const player =
        players[currentPlayer];


    let continueTurn = false;


    /* SCRATCH */

    if (shotCueBallPocketed) {

        if (statusText) {

            statusText.textContent =
                "Scratch! Cue ball is returned.";

        }


        respawnCueBall();

    }


    /* 8 BALL */

    if (eightBallPocketed) {

        const ownRemaining =
            countOwnRemaining(
                currentPlayer
            );


        if (
            ownRemaining === 0 &&
            !scratch
        ) {

            const message =
                `${player.name} legally pocketed the 8-ball.`;


            showResult(
                currentPlayer,
                message
            );


            sendGameOver(
                currentPlayer,
                `${player.name} wins!`
            );


            sendState();

            return;

        }


        const other =
            currentPlayer === 0
                ? 1
                : 0;


        const message =
            `${player.name} pocketed the 8-ball too early.`;


        showResult(
            other,
            message
        );


        sendGameOver(
            other,
            `${players[other].name} wins!`
        );


        sendState();

        return;

    }


    /* GROUP ASSIGNMENT */

    if (
        player.group === null
    ) {

        const firstNormal =
            shotPocketed.find(
                ball =>
                    ball.type === "solid" ||
                    ball.type === "stripe"
            );


        if (firstNormal) {

            player.group =
                firstNormal.type;


            const other =
                currentPlayer === 0
                    ? 1
                    : 0;


            players[other].group =
                firstNormal.type === "solid"
                    ? "stripe"
                    : "solid";


            if (statusText) {

                statusText.textContent =
                    `${player.name} is ${player.group}s.`;

            }

        }

    }


    /* SCORE */

    for (
        const ball of shotPocketed
    ) {

        if (
            ball.type !== "cue" &&
            ball.type !== "eight"
        ) {

            if (
                ball.type ===
                player.group
            ) {

                player.score++;

                continueTurn = true;

            }

        }

    }


    updatePlayerUI();


    if (!continueTurn) {

        switchTurn();

    }

    else {

        if (statusText) {

            statusText.textContent =
                `${player.name} continues.`;

        }

    }


    sendState();


    /* AI */

    if (
        gameMode === "single" &&
        currentPlayer === 1
    ) {

        clearTimeout(aiTimer);


        aiTimer =
            setTimeout(
                aiTurn,
                900
            );

    }

}


/* =========================================================
   COUNT REMAINING
========================================================= */

function countOwnRemaining(
    playerIndex
) {

    const group =
        players[playerIndex].group;


    if (!group) {

        return balls.filter(
            ball =>
                ball.active &&
                ball.type !== "cue" &&
                ball.type !== "eight"
        ).length;

    }


    return balls.filter(
        ball =>
            ball.active &&
            ball.type === group
    ).length;

}


/* =========================================================
   RESPAWN CUE BALL
========================================================= */

function respawnCueBall() {

    let cue =
        balls.find(
            ball =>
                ball.type === "cue"
        );


    if (!cue) {

        cue = {

            number: 0,

            type: "cue",

            x: 245,

            y: TABLE.height / 2,

            vx: 0,

            vy: 0,

            radius:
                TABLE.ballRadius,

            active: true

        };


        balls.push(cue);

    }


    cue.active = true;

    cue.x = 245;

    cue.y =
        TABLE.height / 2;

    cue.vx = 0;
    cue.vy = 0;

}


/* =========================================================
   SWITCH TURN
========================================================= */

function switchTurn() {

    currentPlayer =
        currentPlayer === 0
            ? 1
            : 0;


    updatePlayerUI();


    if (
        gameMode === "online" &&
        socket &&
        socket.connected
    ) {

        socket.emit(
            "turn_changed",
            {
                room: onlineRoom,

                player:
                    currentPlayer
            }
        );

    }


    if (
        gameMode === "single" &&
        currentPlayer === 1
    ) {

        clearTimeout(aiTimer);


        aiTimer =
            setTimeout(
                aiTurn,
                900
            );

    }

}


/* =========================================================
   AI
========================================================= */

function aiTurn() {

    if (!gameRunning) {
        return;
    }


    if (
        gameMode !== "single" ||
        currentPlayer !== 1
    ) {

        return;

    }


    if (shotInProgress) {
        return;
    }


    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue) {
        return;
    }


    let targets =
        balls.filter(
            ball =>
                ball.active &&
                ball.type !== "cue" &&
                ball.type !== "eight"
        );


    if (players[1].group) {

        const own =
            targets.filter(
                ball =>
                    ball.type ===
                    players[1].group
            );


        if (own.length) {

            targets = own;

        }

        else {

            const eight =
                balls.find(
                    ball =>
                        ball.number === 8 &&
                        ball.active
                );


            if (eight) {

                targets = [eight];

            }

        }

    }


    if (!targets.length) {
        return;
    }


    let target = null;

    let bestScore =
        Infinity;


    for (
        const ball of targets
    ) {

        const distance =
            Math.hypot(
                ball.x - cue.x,
                ball.y - cue.y
            );


        let pocketDistance =
            Infinity;


        for (
            const pocket of pockets
        ) {

            const d =
                Math.hypot(
                    ball.x - pocket.x,
                    ball.y - pocket.y
                );


            pocketDistance =
                Math.min(
                    pocketDistance,
                    d
                );

        }


        const score =
            distance +
            pocketDistance * 0.35;


        if (
            score <
            bestScore
        ) {

            bestScore =
                score;

            target =
                ball;

        }

    }


    if (!target) {
        return;
    }


    let targetPocket =
        pockets[0];


    let pocketDistance =
        Infinity;


    for (
        const pocket of pockets
    ) {

        const d =
            Math.hypot(
                target.x - pocket.x,
                target.y - pocket.y
            );


        if (
            d <
            pocketDistance
        ) {

            pocketDistance = d;

            targetPocket = pocket;

        }

    }


    const pdx =
        targetPocket.x -
        target.x;


    const pdy =
        targetPocket.y -
        target.y;


    const pocketLength =
        Math.hypot(
            pdx,
            pdy
        );


    if (pocketLength === 0) {
        return;
    }


    const pocketNX =
        pdx /
        pocketLength;


    const pocketNY =
        pdy /
        pocketLength;


    const ghostX =
        target.x -
        pocketNX *
        target.radius *
        2;


    const ghostY =
        target.y -
        pocketNY *
        target.radius *
        2;


    const dx =
        ghostX -
        cue.x;


    const dy =
        ghostY -
        cue.y;


    const error =
        (
            Math.random() -
            0.5
        ) *
        0.10;


    const angle =
        Math.atan2(
            dy,
            dx
        ) +
        error;


    const distance =
        Math.hypot(
            dx,
            dy
        );


    let speed =
        5 +
        distance * 0.012;


    speed =
        Math.min(
            speed,
            9.5
        );


    const shotDX =
        Math.cos(angle);


    const shotDY =
        Math.sin(angle);


    const shotPower =
        Math.min(
            Math.max(
                (speed - 3) / 12,
                0.2
            ),
            1
        );


    shoot(
        shotDX * 180 * shotPower,
        shotDY * 180 * shotPower,
        shotPower
    );


    if (statusText) {

        statusText.textContent =
            "Royal AI is taking the shot...";

    }

}


/* =========================================================
   PLAYER UI
========================================================= */

function updatePlayerUI() {

    if (!players[currentPlayer]) {
        return;
    }


    if (playerName1) {

        playerName1.textContent =
            players[0].name;

    }


    if (playerName2) {

        playerName2.textContent =
            players[1].name;

    }


    if (playerScore1) {

        playerScore1.textContent =
            players[0].score;

    }


    if (playerScore2) {

        playerScore2.textContent =
            players[1].score;

    }


    if (playerGroup1) {

        playerGroup1.textContent =
            players[0].group
                ? players[0].group.toUpperCase()
                : "NOT ASSIGNED";

    }


    if (playerGroup2) {

        playerGroup2.textContent =
            players[1].group
                ? players[1].group.toUpperCase()
                : "NOT ASSIGNED";

    }


    if (playerCard1) {

        playerCard1.classList.toggle(
            "active",
            currentPlayer === 0
        );

    }


    if (playerCard2) {

        playerCard2.classList.toggle(
            "active",
            currentPlayer === 1
        );

    }


    if (turnText) {

        turnText.textContent =
            `${players[currentPlayer].name.toUpperCase()}'S TURN`;

    }


    if (gameMode === "online") {

        if (
            currentPlayer ===
            onlinePlayer
        ) {

            if (statusText) {

                statusText.textContent =
                    "Your turn — drag from the cue ball.";

            }

        }

        else {

            if (statusText) {

                statusText.textContent =
                    "Opponent's turn...";

            }

        }

    }

}


/* =========================================================
   DRAW
========================================================= */

function draw() {

    if (!ctx) return;


    ctx.clearRect(
        0,
        0,
        TABLE.width,
        TABLE.height
    );


    drawTable();

    drawPockets();

    drawBalls();


    if (
        aiming &&
        !shotInProgress
    ) {

        drawAim();

    }

}


/* =========================================================
   TABLE DRAW
========================================================= */

function drawTable() {

    const wood =
        ctx.createLinearGradient(
            0,
            0,
            0,
            TABLE.height
        );


    wood.addColorStop(
        0,
        "#4b2b14"
    );


    wood.addColorStop(
        0.5,
        "#241308"
    );


    wood.addColorStop(
        1,
        "#4b2b14"
    );


    ctx.fillStyle =
        wood;


    roundRect(
        ctx,
        0,
        0,
        TABLE.width,
        TABLE.height,
        22
    );


    ctx.fill();


    const clothX =
        TABLE.cushion;


    const clothY =
        TABLE.cushion;


    const clothW =
        TABLE.width -
        TABLE.cushion * 2;


    const clothH =
        TABLE.height -
        TABLE.cushion * 2;


    const cloth =
        ctx.createLinearGradient(
            0,
            clothY,
            0,
            clothY + clothH
        );


    cloth.addColorStop(
        0,
        "#087442"
    );


    cloth.addColorStop(
        0.5,
        "#075d36"
    );


    cloth.addColorStop(
        1,
        "#06482b"
    );


    ctx.fillStyle =
        cloth;


    roundRect(
        ctx,
        clothX,
        clothY,
        clothW,
        clothH,
        10
    );


    ctx.fill();


    ctx.strokeStyle =
        "rgba(255,255,255,.08)";


    ctx.lineWidth = 2;


    roundRect(
        ctx,
        clothX + 7,
        clothY + 7,
        clothW - 14,
        clothH - 14,
        7
    );


    ctx.stroke();

}


/* =========================================================
   POCKET DRAW
========================================================= */

function drawPockets() {

    for (
        const pocket of pockets
    ) {

        const gradient =
            ctx.createRadialGradient(
                pocket.x,
                pocket.y,
                3,
                pocket.x,
                pocket.y,
                TABLE.pocketRadius
            );


        gradient.addColorStop(
            0,
            "#000000"
        );


        gradient.addColorStop(
            0.7,
            "#020303"
        );


        gradient.addColorStop(
            1,
            "#111111"
        );


        ctx.fillStyle =
            gradient;


        ctx.beginPath();


        ctx.arc(
            pocket.x,
            pocket.y,
            TABLE.pocketRadius,
            0,
            Math.PI * 2
        );


        ctx.fill();


        ctx.strokeStyle =
            "rgba(255,255,255,.08)";


        ctx.lineWidth = 2;

        ctx.stroke();

    }

}


/* =========================================================
   BALL DRAW
========================================================= */

function drawBalls() {

    for (
        const ball of balls
    ) {

        if (!ball.active) {
            continue;
        }


        drawBall(ball);

    }

}


/* =========================================================
   DRAW BALL
========================================================= */

function drawBall(ball) {

    const r =
        ball.radius;


    ctx.save();


    /* Shadow */

    ctx.beginPath();


    ctx.arc(
        ball.x + 3,
        ball.y + 4,
        r,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "rgba(0,0,0,.35)";


    ctx.fill();


    let baseColor =
        "#ffffff";


    if (
        ball.type === "solid"
    ) {

        baseColor =
            solidColors[
                ball.number
            ];

    }


    else if (
        ball.type === "stripe"
    ) {

        baseColor =
            stripeColors[
                ball.number
            ];

    }


    else if (
        ball.type === "eight"
    ) {

        baseColor =
            "#050505";

    }


    const gradient =
        ctx.createRadialGradient(
            ball.x - r * .35,
            ball.y - r * .4,
            r * .1,
            ball.x,
            ball.y,
            r
        );


    if (
        ball.type === "cue"
    ) {

        gradient.addColorStop(
            0,
            "#ffffff"
        );


        gradient.addColorStop(
            0.7,
            "#e7e7e7"
        );


        gradient.addColorStop(
            1,
            "#9b9b9b"
        );

    }


    else {

        gradient.addColorStop(
            0,
            "#ffffff"
        );


        gradient.addColorStop(
            0.16,
            baseColor
        );


        gradient.addColorStop(
            1,
            "#111111"
        );

    }


    ctx.beginPath();


    ctx.arc(
        ball.x,
        ball.y,
        r,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        gradient;


    ctx.fill();


    /* Stripe */

    if (
        ball.type === "stripe"
    ) {

        ctx.save();


        ctx.beginPath();


        ctx.arc(
            ball.x,
            ball.y,
            r,
            0,
            Math.PI * 2
        );


        ctx.clip();


        ctx.fillStyle =
            "#eeeeee";


        ctx.fillRect(
            ball.x - r,
            ball.y - r * .35,
            r * 2,
            r * .7
        );


        ctx.restore();

    }


    /* Number */

    if (
        ball.type !== "cue"
    ) {

        ctx.beginPath();


        ctx.arc(
            ball.x,
            ball.y,
            r * .38,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            "#ffffff";


        ctx.fill();


        ctx.fillStyle =
            "#050505";


        ctx.font =
            `bold ${Math.max(
                7,
                r * .65
            )}px Arial`;


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "middle";


        ctx.fillText(
            ball.number,
            ball.x,
            ball.y + .5
        );

    }


    /* Shine */

    ctx.beginPath();


    ctx.arc(
        ball.x - r * .35,
        ball.y - r * .4,
        r * .18,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "rgba(255,255,255,.55)";


    ctx.fill();


    ctx.restore();

}


/* =========================================================
   AIM
========================================================= */

function drawAim() {

    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue) {
        return;
    }


    const dx =
        aimStartX -
        pointerX;


    const dy =
        aimStartY -
        pointerY;


    const length =
        Math.hypot(
            dx,
            dy
        );


    if (length < 1) {
        return;
    }


    const nx =
        dx / length;


    const ny =
        dy / length;


    ctx.save();


    ctx.setLineDash(
        [8, 8]
    );


    ctx.strokeStyle =
        "rgba(255,255,255,.6)";


    ctx.lineWidth = 1.5;


    ctx.beginPath();


    ctx.moveTo(
        cue.x,
        cue.y
    );


    ctx.lineTo(
        cue.x + nx * 300,
        cue.y + ny * 300
    );


    ctx.stroke();


    ctx.restore();


    const stickLength =
        230;


    const startX =
        cue.x -
        nx * 25;


    const startY =
        cue.y -
        ny * 25;


    const endX =
        cue.x -
        nx *
        (
            25 +
            stickLength *
            Math.max(
                power,
                .15
            )
        );


    const endY =
        cue.y -
        ny *
        (
            25 +
            stickLength *
            Math.max(
                power,
                .15
            )
        );


    const stick =
        ctx.createLinearGradient(
            startX,
            startY,
            endX,
            endY
        );


    stick.addColorStop(
        0,
        "#fff7df"
    );


    stick.addColorStop(
        .65,
        "#d9b979"
    );


    stick.addColorStop(
        1,
        "#3b1d0b"
    );


    ctx.strokeStyle =
        stick;


    ctx.lineWidth = 5;


    ctx.beginPath();


    ctx.moveTo(
        startX,
        startY
    );


    ctx.lineTo(
        endX,
        endY
    );


    ctx.stroke();

}


/* =========================================================
   RESULT
========================================================= */

function showResult(
    winnerIndex,
    message
) {

    gameRunning = false;

    shotInProgress = false;


    winner =
        winnerIndex;


    if (resultTitle) {

        resultTitle.textContent =
            `${players[winnerIndex].name.toUpperCase()} WINS`;

    }


    if (resultMessage) {

        resultMessage.textContent =
            message;

    }


    if (resultModal) {

        resultModal.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   GAME OVER
========================================================= */

function sendGameOver(
    winnerIndex,
    message
) {

    if (
        gameMode !== "online"
    ) {
        return;
    }


    if (
        !socket ||
        !socket.connected
    ) {
        return;
    }


    socket.emit(
        "game_over",
        {
            room: onlineRoom,

            winner:
                winnerIndex,

            message:
                message
        }
    );

}


/* =========================================================
   NEW GAME
========================================================= */

if (restartButton) {

    restartButton.addEventListener(
        "click",
        () => {

            if (
                gameMode === "online" &&
                socket &&
                socket.connected
            ) {

                socket.emit(
                    "restart_game",
                    {
                        room:
                            onlineRoom
                    }
                );

                return;

            }


            createGame();

            currentPlayer = 0;

            gameRunning = true;

            shotInProgress = false;

            updatePlayerUI();

            startAnimation();

        }
    );

}


/* =========================================================
   PLAY AGAIN
========================================================= */

if (playAgainButton) {

    playAgainButton.addEventListener(
        "click",
        () => {

            if (resultModal) {

                resultModal.classList.add(
                    "hidden"
                );

            }


            if (
                gameMode === "online" &&
                socket &&
                socket.connected
            ) {

                socket.emit(
                    "restart_game",
                    {
                        room:
                            onlineRoom
                    }
                );

                return;

            }


            createGame();

            currentPlayer = 0;

            gameRunning = true;

            shotInProgress = false;

            updatePlayerUI();

            startAnimation();

        }
    );

}


/* =========================================================
   MAIN MENU
========================================================= */

if (menuButton) {

    menuButton.addEventListener(
        "click",
        () => {

            if (resultModal) {

                resultModal.classList.add(
                    "hidden"
                );

            }


            if (gameScreen) {

                gameScreen.classList.add(
                    "hidden"
                );

            }


            if (startScreen) {

                startScreen.classList.remove(
                    "hidden"
                );

            }


            gameRunning = false;

            shotInProgress = false;

        }
    );

}


/* =========================================================
   BACK
========================================================= */

if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            if (
                gameMode === "online" &&
                socket &&
                socket.connected &&
                onlineRoom
            ) {

                socket.emit(
                    "leave_room",
                    {
                        room:
                            onlineRoom
                    }
                );

            }


            gameRunning = false;

            shotInProgress = false;

            onlineReady = false;

            onlineRoom = null;

            onlinePlayer = null;


            if (gameScreen) {

                gameScreen.classList.add(
                    "hidden"
                );

            }


            if (startScreen) {

                startScreen.classList.remove(
                    "hidden"
                );

            }

        }
    );

}


/* =========================================================
   SERIALIZE GAME STATE
========================================================= */

function getGameState() {

    return {

        balls:
            balls.map(
                ball => ({

                    number:
                        ball.number,

                    type:
                        ball.type,

                    x:
                        ball.x,

                    y:
                        ball.y,

                    vx:
                        ball.vx,

                    vy:
                        ball.vy,

                    radius:
                        ball.radius,

                    active:
                        ball.active

                })
            ),


        players:
            players.map(
                player => ({

                    name:
                        player.name,

                    group:
                        player.group,

                    score:
                        player.score

                })
            ),


        currentPlayer:
            currentPlayer,


        shotInProgress:
            shotInProgress

    };

}


/* =========================================================
   SEND STATE
========================================================= */

function sendState() {

    if (
        gameMode !== "online"
    ) {
        return;
    }


    if (
        !socket ||
        !socket.connected ||
        !onlineRoom
    ) {
        return;
    }


    socket.emit(
        "state_update",
        {
            room:
                onlineRoom,

            state:
                getGameState()
        }
    );

}


/* =========================================================
   LOAD REMOTE STATE
========================================================= */

function loadRemoteState(state) {

    if (!state) {
        return;
    }


    if (
        Array.isArray(
            state.balls
        )
    ) {

        balls =
            state.balls.map(
                ball => ({
                    ...ball
                })
            );

    }


    if (
        Array.isArray(
            state.players
        )
    ) {

        players =
            state.players.map(
                player => ({
                    ...player
                })
            );

    }


    if (
        typeof state.currentPlayer ===
        "number"
    ) {

        currentPlayer =
            state.currentPlayer;

    }


    updatePlayerUI();

}


/* =========================================================
   ONLINE PERIODIC SYNC
========================================================= */

setInterval(
    () => {

        if (
            gameMode === "online" &&
            gameRunning &&
            !shotInProgress
        ) {

            sendState();

        }

    },
    250
);


/* =========================================================
   ROUND RECTANGLE
========================================================= */

function roundRect(
    context,
    x,
    y,
    width,
    height,
    radius
) {

    context.beginPath();


    context.moveTo(
        x + radius,
        y
    );


    context.lineTo(
        x + width - radius,
        y
    );


    context.quadraticCurveTo(
        x + width,
        y,
        x + width,
        y + radius
    );


    context.lineTo(
        x + width,
        y + height - radius
    );


    context.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
    );


    context.lineTo(
        x + radius,
        y + height
    );


    context.quadraticCurveTo(
        x,
        y + height,
        x,
        y + height - radius
    );


    context.lineTo(
        x,
        y + radius
    );


    context.quadraticCurveTo(
        x,
        y,
        x + radius,
        y
    );


    context.closePath();

}


/* =========================================================
   INITIALIZE
========================================================= */

setupCanvas();

createPockets();

updatePlayerUI();


if (statusText) {

    statusText.textContent =
        "Drag from the cue ball to aim and release.";

}


console.log(
    "Royal 8 Ball game.js loaded successfully."
);