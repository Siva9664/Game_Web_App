/* =========================================================
   ROYAL 8 BALL
   PREMIUM SMOOTH POOL ENGINE
========================================================= */


/* =========================================================
   DOM
========================================================= */

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");

const singleModeButton = document.getElementById("singleModeButton");
const twoModeButton = document.getElementById("twoModeButton");

const startButton = document.getElementById("startButton");
const backButton = document.getElementById("backButton");
const restartButton = document.getElementById("restartButton");

const playAgainButton = document.getElementById("playAgainButton");
const menuButton = document.getElementById("menuButton");

const player1Input = document.getElementById("player1Input");
const player2Input = document.getElementById("player2Input");
const player2Box = document.getElementById("player2Box");

const canvas = document.getElementById("poolCanvas");
const ctx = canvas.getContext("2d");

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
   GAME STATE
========================================================= */

let gameMode = "single";

let players = [];
let currentPlayer = 0;

let balls = [];
let pockets = [];

let gameRunning = false;
let shotInProgress = false;
let aiming = false;

let mouseX = 0;
let mouseY = 0;

let power = 0;

let animationFrame = 0;
let lastTime = 0;

let aiTimer = null;

let shotPocketed = [];
let shotCueBallPocketed = false;
let shotHadContact = false;

let firstContactBall = null;


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

    /*
       Lower = balls roll longer
    */

    friction: 0.992,

    /*
       Cushion bounce
    */

    cushionRestitution: 0.86,

    /*
       Ball collision
    */

    ballRestitution: 0.96,

    /*
       Maximum velocity
    */

    maxSpeed: 16,

    /*
       Very small velocity
       gets stopped
    */

    stopSpeed: 0.025

};


/* =========================================================
   COLORS
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

    const dpr =
        Math.min(window.devicePixelRatio || 1, 2);

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
   MODE
========================================================= */

singleModeButton.addEventListener(
    "click",
    () => {

        gameMode = "single";

        singleModeButton.classList.add("selected");
        twoModeButton.classList.remove("selected");

        player2Box.classList.add("hidden");

    }
);


twoModeButton.addEventListener(
    "click",
    () => {

        gameMode = "two";

        twoModeButton.classList.add("selected");
        singleModeButton.classList.remove("selected");

        player2Box.classList.remove("hidden");

    }
);


/* =========================================================
   START GAME
========================================================= */

startButton.addEventListener(
    "click",
    startGame
);


function startGame() {

    clearTimeout(aiTimer);

    const name1 =
        player1Input.value.trim() || "Player 1";

    const name2 =
        gameMode === "two"
            ? player2Input.value.trim() || "Player 2"
            : "Royal AI";


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

    resultModal.classList.add("hidden");

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");


    modeLabel.textContent =
        gameMode === "single"
            ? "VS ROYAL AI"
            : "2 PLAYER DUEL";


    setupCanvas();

    createGame();

    updatePlayerUI();

    lastTime = performance.now();

    startAnimation();

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

    power = 0;

    powerFill.style.width = "0%";
    powerText.textContent = "0%";


    /*
       Cue ball
    */

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


    /*
       Rack
    */

    const startX = 700;

    const startY = TABLE.height / 2;

    const spacing = TABLE.ballRadius * 2.04;

    let number = 1;


    for (let row = 0; row < 5; row++) {

        for (let col = 0; col <= row; col++) {

            const x =
                startX +
                row * spacing * 0.87;

            const y =
                startY +
                (col - row / 2) * spacing;


            let type;

            if (number === 8) {

                type = "eight";

            } else if (number <= 7) {

                type = "solid";

            } else {

                type = "stripe";

            }


            balls.push({

                number,
                type,

                x,
                y,

                vx: 0,
                vy: 0,

                radius: TABLE.ballRadius,

                active: true

            });


            number++;

        }

    }


    createPockets();


    statusText.textContent =
        "Drag from the cue ball and release to shoot.";

}


/* =========================================================
   POCKETS
========================================================= */

function createPockets() {

    const c = TABLE.cushion;

    pockets = [

        {
            x: c,
            y: c
        },

        {
            x: TABLE.width / 2,
            y: c - 1
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
            y: TABLE.height - c + 1
        },

        {
            x: TABLE.width - c,
            y: TABLE.height - c
        }

    ];

}


/* =========================================================
   ANIMATION LOOP
========================================================= */

function startAnimation() {

    cancelAnimationFrame(animationFrame);

    lastTime = performance.now();


    function loop(now) {

        if (!gameRunning)
            return;


        /*
           Delta time

           This makes physics much smoother
           and independent of FPS.
        */

        let dt =
            (now - lastTime) / 16.6667;

        lastTime = now;


        /*
           Prevent huge jumps
        */

        dt = Math.min(dt, 2);


        update(dt);

        draw();


        animationFrame =
            requestAnimationFrame(loop);

    }


    animationFrame =
        requestAnimationFrame(loop);

}


/* =========================================================
   UPDATE
========================================================= */

function update(dt) {

    if (!shotInProgress)
        return;


    let moving = false;


    /*
       Move balls
    */

    for (const ball of balls) {

        if (!ball.active)
            continue;


        /*
           Move
        */

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;


        /*
           Friction

           Delta-time corrected.
        */

        const friction =
            Math.pow(PHYSICS.friction, dt);

        ball.vx *= friction;
        ball.vy *= friction;


        /*
           Stop tiny movement
        */

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


        /*
           Limit speed
        */

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


        /*
           Pocket first
        */

        checkPocket(ball);


        if (!ball.active)
            continue;


        /*
           Cushion
        */

        wallCollision(ball);

    }


    /*
       Multiple collision passes

       This makes rack breaks much more stable.
    */

    for (let i = 0; i < 2; i++) {

        ballCollisions();

    }


    /*
       Check if everything stopped
    */

    for (const ball of balls) {

        if (!ball.active)
            continue;


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


    /*
       Left
    */

    if (ball.x < left) {

        ball.x = left;

        if (ball.vx < 0) {

            ball.vx =
                -ball.vx *
                PHYSICS.cushionRestitution;

        }

    }


    /*
       Right
    */

    if (ball.x > right) {

        ball.x = right;

        if (ball.vx > 0) {

            ball.vx =
                -ball.vx *
                PHYSICS.cushionRestitution;

        }

    }


    /*
       Top
    */

    if (ball.y < top) {

        ball.y = top;

        if (ball.vy < 0) {

            ball.vy =
                -ball.vy *
                PHYSICS.cushionRestitution;

        }

    }


    /*
       Bottom
    */

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

        const a = balls[i];


        if (!a.active)
            continue;


        for (
            let j = i + 1;
            j < balls.length;
            j++
        ) {

            const b = balls[j];


            if (!b.active)
                continue;


            const dx =
                b.x - a.x;

            const dy =
                b.y - a.y;


            const distance =
                Math.hypot(dx, dy);


            const minimum =
                a.radius +
                b.radius;


            /*
               Collision
            */

            if (
                distance > 0 &&
                distance < minimum
            ) {

                const nx =
                    dx / distance;

                const ny =
                    dy / distance;


                /*
                   Relative velocity
                */

                const rvx =
                    b.vx - a.vx;

                const rvy =
                    b.vy - a.vy;


                const relativeVelocity =
                    rvx * nx +
                    rvy * ny;


                /*
                   Record first contact

                   IMPORTANT FIX
                */

                if (!shotHadContact) {

                    shotHadContact = true;

                    firstContactBall =
                        a.type === "cue"
                            ? b
                            : b.type === "cue"
                                ? a
                                : null;

                }


                /*
                   Only resolve if
                   moving toward each other
                */

                if (
                    relativeVelocity < 0
                ) {

                    const impulse =
                        -(1 + PHYSICS.ballRestitution) *
                        relativeVelocity /
                        2;


                    a.vx -=
                        impulse * nx;

                    a.vy -=
                        impulse * ny;


                    b.vx +=
                        impulse * nx;

                    b.vy +=
                        impulse * ny;

                }


                /*
                   Separate balls

                   Prevents sticking.
                */

                const overlap =
                    minimum - distance;


                const correction =
                    overlap / 2 + 0.01;


                a.x -=
                    nx * correction;

                a.y -=
                    ny * correction;


                b.x +=
                    nx * correction;

                b.y +=
                    ny * correction;

            }

        }

    }

}


/* =========================================================
   POCKET CHECK
========================================================= */

function checkPocket(ball) {

    for (const pocket of pockets) {

        const dx =
            ball.x - pocket.x;

        const dy =
            ball.y - pocket.y;


        const distance =
            Math.hypot(dx, dy);


        /*
           Larger entrance near pocket
        */

        if (
            distance <
            TABLE.pocketRadius
        ) {

            pocketBall(ball);

            return;

        }

    }

}


/* =========================================================
   POCKET BALL
========================================================= */

function pocketBall(ball) {

    if (!ball.active)
        return;


    ball.active = false;

    ball.vx = 0;
    ball.vy = 0;


    /*
       Cue ball
    */

    if (ball.type === "cue") {

        shotCueBallPocketed = true;

        return;

    }


    /*
       Save pocketed ball
    */

    shotPocketed.push(ball);


    /*
       Score

       Each legal object ball = +1
    */

    players[currentPlayer].score++;

    updatePlayerUI();


    statusText.textContent =
        `${players[currentPlayer].name} pocketed ball ${ball.number}.`;

}


/* =========================================================
   FINISH SHOT
========================================================= */

function finishShot() {

    if (!shotInProgress)
        return;


    shotInProgress = false;


    /*
       Cue ball foul
    */

    if (shotCueBallPocketed) {

        statusText.textContent =
            "FOUL — Cue ball pocketed.";

        resetCueBall();

        shotPocketed = [];

        shotHadContact = false;

        firstContactBall = null;

        switchTurn();

        return;

    }


    /*
       No object ball contacted
    */

    if (!shotHadContact) {

        statusText.textContent =
            "FOUL — No ball contacted.";

        switchTurn();

        return;

    }


    /*
       Assign groups after first
       legal solid/stripe pocket
    */

    assignGroups();


    /*
       8 Ball
    */

    const eightPocketed =
        shotPocketed.some(
            ball =>
                ball.number === 8
        );


    if (eightPocketed) {

        handleEightBall();

        return;

    }


    /*
       No ball pocketed
    */

    if (
        shotPocketed.length === 0
    ) {

        switchTurn();

        return;

    }


    /*
       Check whether player
       pocketed their own group
    */

    const playerGroup =
        players[currentPlayer].group;


    let ownBallPocketed = false;


    if (playerGroup) {

        ownBallPocketed =
            shotPocketed.some(
                ball =>
                    ball.type === playerGroup
            );

    } else {

        /*
           Before groups are assigned,
           allow continuation.
        */

        ownBallPocketed = true;

    }


    /*
       Wrong group
    */

    if (!ownBallPocketed) {

        statusText.textContent =
            "Wrong ball pocketed — turn changes.";

        switchTurn();

        return;

    }


    /*
       Correct ball pocketed

       PLAYER CONTINUES
    */

    statusText.textContent =
        `${players[currentPlayer].name} continues!`;

    updatePlayerUI();


    /*
       Reset shot state
       BUT DO NOT SWITCH TURN
    */

    shotPocketed = [];

    shotHadContact = false;

    firstContactBall = null;


    /*
       AI continues automatically
    */

    if (
        gameMode === "single" &&
        currentPlayer === 1
    ) {

        clearTimeout(aiTimer);

        aiTimer =
            setTimeout(
                aiTurn,
                650
            );

    }

}


/* =========================================================
   ASSIGN GROUPS
========================================================= */

function assignGroups() {

    if (
        players[0].group !== null ||
        players[1].group !== null
    ) {

        return;

    }


    /*
       Find first solid/stripe pocketed
    */

    const firstGroupBall =
        shotPocketed.find(
            ball =>
                ball.type === "solid" ||
                ball.type === "stripe"
        );


    if (!firstGroupBall)
        return;


    const group =
        firstGroupBall.type;


    const other =
        group === "solid"
            ? "stripe"
            : "solid";


    players[currentPlayer].group =
        group;


    players[
        currentPlayer === 0 ? 1 : 0
    ].group =
        other;


    updatePlayerUI();


    statusText.textContent =
        `${players[currentPlayer].name} is ${group === "solid" ? "SOLIDS" : "STRIPES"}.`;

}


/* =========================================================
   8 BALL
========================================================= */

function handleEightBall() {

    const player =
        players[currentPlayer];


    /*
       Player must clear
       their group first.
    */

    if (player.group) {

        const remaining =
            countRemaining(
                player.group
            );


        if (remaining > 0) {

            const opponent =
                players[
                    currentPlayer === 0
                        ? 1
                        : 0
                ];


            endGame(
                opponent,

                `${player.name} pocketed the 8-ball too early.`
            );


            return;

        }

    }


    /*
       Legal 8-ball
    */

    endGame(
        player,

        `${player.name} legally pocketed the 8-ball!`
    );

}


/* =========================================================
   COUNT REMAINING
========================================================= */

function countRemaining(group) {

    if (!group)
        return 0;


    return balls.filter(
        ball =>
            ball.active &&
            ball.type === group
    ).length;

}


/* =========================================================
   RESET CUE
========================================================= */

function resetCueBall() {

    const cue =
        balls.find(
            ball =>
                ball.type === "cue"
        );


    if (!cue)
        return;


    cue.active = true;

    cue.x = 245;

    cue.y =
        TABLE.height / 2;

    cue.vx = 0;
    cue.vy = 0;

}


/* =========================================================
   TURN
========================================================= */

function switchTurn() {

    currentPlayer =
        currentPlayer === 0
            ? 1
            : 0;


    shotPocketed = [];

    shotHadContact = false;

    firstContactBall = null;


    updatePlayerUI();


    /*
       AI turn
    */

    if (
        gameMode === "single" &&
        currentPlayer === 1
    ) {

        statusText.textContent =
            "Royal AI is thinking...";


        clearTimeout(aiTimer);


        aiTimer =
            setTimeout(
                aiTurn,
                700
            );

    } else {

        statusText.textContent =
            `${players[currentPlayer].name}, your turn.`;

    }

}


/* =========================================================
   PLAYER UI
========================================================= */

function updatePlayerUI() {

    if (!players.length)
        return;


    playerName1.textContent =
        players[0].name;

    playerName2.textContent =
        players[1].name;


    playerScore1.textContent =
        players[0].score;

    playerScore2.textContent =
        players[1].score;


    playerGroup1.textContent =
        players[0].group
            ? players[0].group.toUpperCase()
            : "NOT ASSIGNED";


    playerGroup2.textContent =
        players[1].group
            ? players[1].group.toUpperCase()
            : "NOT ASSIGNED";


    playerCard1.classList.toggle(
        "active",
        currentPlayer === 0
    );


    playerCard2.classList.toggle(
        "active",
        currentPlayer === 1
    );


    turnText.textContent =
        `${players[currentPlayer].name.toUpperCase()}'S TURN`;

}


/* =========================================================
   POINTER
========================================================= */

function getPointerPosition(event) {

    const rect =
        canvas.getBoundingClientRect();


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

    } else {

        clientX =
            event.clientX;

        clientY =
            event.clientY;

    }


    return {

        x:
            (clientX - rect.left) *
            TABLE.width /
            rect.width,

        y:
            (clientY - rect.top) *
            TABLE.height /
            rect.height

    };

}


/* =========================================================
   START AIM
========================================================= */

function startAim(event) {

    if (!gameRunning)
        return;


    if (shotInProgress)
        return;


    if (
        gameMode === "single" &&
        currentPlayer === 1
    )
        return;


    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue)
        return;


    const pos =
        getPointerPosition(event);


    const distance =
        Math.hypot(
            pos.x - cue.x,
            pos.y - cue.y
        );


    /*
       User must start
       near cue ball.
    */

    if (distance > 110)
        return;


    aiming = true;

    mouseX = pos.x;
    mouseY = pos.y;


    event.preventDefault();

}


/* =========================================================
   MOVE AIM
========================================================= */

function moveAim(event) {

    if (!aiming)
        return;


    const pos =
        getPointerPosition(event);


    mouseX = pos.x;
    mouseY = pos.y;


    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue)
        return;


    const distance =
        Math.hypot(
            cue.x - mouseX,
            cue.y - mouseY
        );


    /*
       Power curve

       Small movement = light shot
       Large movement = powerful shot
    */

    power =
        Math.min(
            100,
            Math.pow(
                distance / 2.2,
                0.9
            )
        );


    powerFill.style.width =
        `${power}%`;


    powerText.textContent =
        `${Math.round(power)}%`;


    event.preventDefault();

}


/* =========================================================
   RELEASE AIM
========================================================= */

function releaseAim(event) {

    if (!aiming)
        return;


    aiming = false;


    if (power < 2) {

        power = 0;

        powerFill.style.width = "0%";
        powerText.textContent = "0%";

        return;

    }


    shoot();


    event.preventDefault();

}


/* =========================================================
   SHOOT
========================================================= */

function shoot() {

    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue)
        return;


    const dx =
        cue.x - mouseX;

    const dy =
        cue.y - mouseY;


    const length =
        Math.hypot(dx, dy);


    if (!length)
        return;


    const nx =
        dx / length;

    const ny =
        dy / length;


    /*
       Smooth realistic power

       Very light:
       2.0

       Full:
       around 11
    */

    const speed =
        1.8 +
        Math.pow(
            power / 100,
            0.75
        ) * 10.5;


    cue.vx =
        nx * speed;

    cue.vy =
        ny * speed;


    shotInProgress = true;

    shotPocketed = [];

    shotCueBallPocketed = false;

    shotHadContact = false;

    firstContactBall = null;


    power = 0;

    powerFill.style.width = "0%";
    powerText.textContent = "0%";


    statusText.textContent =
        "Shot in progress...";

}


/* =========================================================
   MOUSE
========================================================= */

canvas.addEventListener(
    "mousedown",
    startAim
);


window.addEventListener(
    "mousemove",
    moveAim
);


window.addEventListener(
    "mouseup",
    releaseAim
);


/* =========================================================
   TOUCH
========================================================= */

canvas.addEventListener(
    "touchstart",
    startAim,
    {
        passive: false
    }
);


canvas.addEventListener(
    "touchmove",
    moveAim,
    {
        passive: false
    }
);


window.addEventListener(
    "touchend",
    releaseAim,
    {
        passive: false
    }
);


/* =========================================================
   DRAW
========================================================= */

function draw() {

    ctx.clearRect(
        0,
        0,
        TABLE.width,
        TABLE.height
    );


    drawTable();

    drawPockets();

    drawBalls();

    drawAim();

}


/* =========================================================
   TABLE
========================================================= */

function drawTable() {

    /*
       Wood
    */

    const wood =
        ctx.createLinearGradient(
            0,
            0,
            TABLE.width,
            TABLE.height
        );


    wood.addColorStop(
        0,
        "#2c1005"
    );

    wood.addColorStop(
        0.5,
        "#a05c29"
    );

    wood.addColorStop(
        1,
        "#241006"
    );


    ctx.fillStyle = wood;


    roundRect(
        ctx,
        0,
        0,
        TABLE.width,
        TABLE.height,
        20
    );


    ctx.fill();


    /*
       Cloth
    */

    const cloth =
        ctx.createLinearGradient(
            0,
            40,
            0,
            TABLE.height - 40
        );


    cloth.addColorStop(
        0,
        "#08734d"
    );

    cloth.addColorStop(
        0.5,
        "#075f40"
    );

    cloth.addColorStop(
        1,
        "#064a32"
    );


    ctx.fillStyle = cloth;


    roundRect(
        ctx,
        TABLE.cushion,
        TABLE.cushion,
        TABLE.width -
            TABLE.cushion * 2,
        TABLE.height -
            TABLE.cushion * 2,
        6
    );


    ctx.fill();


    /*
       Inner line
    */

    ctx.strokeStyle =
        "rgba(255,255,255,.08)";

    ctx.lineWidth = 2;


    ctx.strokeRect(
        TABLE.cushion + 8,
        TABLE.cushion + 8,
        TABLE.width -
            TABLE.cushion * 2 -
            16,
        TABLE.height -
            TABLE.cushion * 2 -
            16
    );

}


/* =========================================================
   POCKET DRAW
========================================================= */

function drawPockets() {

    for (const pocket of pockets) {

        const gradient =
            ctx.createRadialGradient(
                pocket.x,
                pocket.y,
                2,
                pocket.x,
                pocket.y,
                TABLE.pocketRadius
            );


        gradient.addColorStop(
            0,
            "#000"
        );

        gradient.addColorStop(
            0.65,
            "#010101"
        );

        gradient.addColorStop(
            1,
            "#42200c"
        );


        ctx.beginPath();


        ctx.arc(
            pocket.x,
            pocket.y,
            TABLE.pocketRadius,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            gradient;

        ctx.fill();

    }

}


/* =========================================================
   BALL DRAW
========================================================= */

function drawBalls() {

    for (const ball of balls) {

        if (!ball.active)
            continue;


        drawBall(ball);

    }

}


/* =========================================================
   DRAW BALL
========================================================= */

function drawBall(ball) {

    const r =
        ball.radius;


    /*
       Shadow
    */

    ctx.beginPath();

    ctx.arc(
        ball.x + 2,
        ball.y + 3,
        r,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "rgba(0,0,0,.35)";

    ctx.fill();


    /*
       Color
    */

    let color = "#ffffff";


    if (ball.type === "solid") {

        color =
            solidColors[ball.number];

    }


    if (ball.type === "stripe") {

        color =
            stripeColors[ball.number];

    }


    if (ball.type === "eight") {

        color =
            "#050505";

    }


    /*
       Ball gradient
    */

    const gradient =
        ctx.createRadialGradient(
            ball.x - r * .4,
            ball.y - r * .4,
            1,
            ball.x,
            ball.y,
            r
        );


    gradient.addColorStop(
        0,
        "#ffffff"
    );

    gradient.addColorStop(
        0.18,
        color
    );

    gradient.addColorStop(
        1,
        darkenColor(color)
    );


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


    /*
       Stripe
    */

    if (ball.type === "stripe") {

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
            "#f4f4f4";


        ctx.fillRect(
            ball.x - r,
            ball.y - r * .36,
            r * 2,
            r * .72
        );


        ctx.restore();

    }


    /*
       Number
    */

    if (ball.type !== "cue") {

        ctx.beginPath();

        ctx.arc(
            ball.x,
            ball.y,
            r * .39,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            "#ffffff";

        ctx.fill();


        ctx.fillStyle =
            "#111111";


        ctx.font =
            `bold ${Math.max(
                7,
                r * .7
            )}px Arial`;


        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";


        ctx.fillText(
            ball.number,
            ball.x,
            ball.y
        );

    }


    /*
       Highlight
    */

    ctx.beginPath();

    ctx.arc(
        ball.x - r * .35,
        ball.y - r * .35,
        r * .18,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "rgba(255,255,255,.65)";

    ctx.fill();

}


/* =========================================================
   AIM GUIDE
========================================================= */

function drawAim() {

    if (!aiming)
        return;


    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue)
        return;


    const dx =
        cue.x - mouseX;

    const dy =
        cue.y - mouseY;


    const length =
        Math.hypot(dx, dy);


    if (!length)
        return;


    const nx =
        dx / length;

    const ny =
        dy / length;


    /*
       Guide line
    */

    ctx.beginPath();

    ctx.moveTo(
        cue.x,
        cue.y
    );


    ctx.lineTo(
        cue.x + nx * 350,
        cue.y + ny * 350
    );


    ctx.setLineDash([
        7,
        7
    ]);


    ctx.strokeStyle =
        "rgba(255,255,255,.55)";

    ctx.lineWidth = 1;


    ctx.stroke();


    ctx.setLineDash([]);


    /*
       Cue stick
    */

    const cueLength =
        130 +
        power * 1.3;


    const startX =
        cue.x -
        nx * cueLength;


    const startY =
        cue.y -
        ny * cueLength;


    ctx.beginPath();


    ctx.moveTo(
        startX,
        startY
    );


    ctx.lineTo(
        cue.x - nx * 14,
        cue.y - ny * 14
    );


    const stick =
        ctx.createLinearGradient(
            startX,
            startY,
            cue.x,
            cue.y
        );


    stick.addColorStop(
        0,
        "#3b1d0b"
    );

    stick.addColorStop(
        0.65,
        "#d9b979"
    );

    stick.addColorStop(
        1,
        "#fff7df"
    );


    ctx.strokeStyle =
        stick;

    ctx.lineWidth = 5;


    ctx.stroke();

}


/* =========================================================
   AI
========================================================= */

function aiTurn() {

    if (!gameRunning)
        return;


    if (
        gameMode !== "single" ||
        currentPlayer !== 1
    )
        return;


    if (shotInProgress)
        return;


    const cue =
        balls.find(
            ball =>
                ball.type === "cue" &&
                ball.active
        );


    if (!cue)
        return;


    /*
       Find AI targets
    */

    let targets =
        balls.filter(
            ball =>
                ball.active &&
                ball.type !== "cue" &&
                ball.type !== "eight"
        );


    /*
       Own group
    */

    if (players[1].group) {

        const own =
            targets.filter(
                ball =>
                    ball.type ===
                    players[1].group
            );


        if (own.length) {

            targets = own;

        } else {

            /*
               All own balls cleared.
               Go for 8.
            */

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


    /*
       If no group assigned,
       choose normal ball.
    */

    if (!targets.length) {

        const normal =
            balls.find(
                ball =>
                    ball.active &&
                    ball.type !== "cue"
            );


        if (normal)
            targets = [normal];

    }


    if (!targets.length)
        return;


    /*
       Find best target
    */

    let target = null;

    let bestScore = Infinity;


    for (const ball of targets) {

        const distance =
            Math.hypot(
                ball.x - cue.x,
                ball.y - cue.y
            );


        /*
           Prefer balls that
           are closer to pockets.
        */

        let pocketDistance =
            Infinity;


        for (const pocket of pockets) {

            const d =
                Math.hypot(
                    ball.x - pocket.x,
                    ball.y - pocket.y
                );


            if (d < pocketDistance) {

                pocketDistance = d;

            }

        }


        const score =
            distance +
            pocketDistance * 0.35;


        if (score < bestScore) {

            bestScore = score;

            target = ball;

        }

    }


    if (!target)
        return;


    /*
       Find nearest pocket
    */

    let targetPocket =
        pockets[0];

    let pocketDistance =
        Infinity;


    for (const pocket of pockets) {

        const d =
            Math.hypot(
                target.x - pocket.x,
                target.y - pocket.y
            );


        if (d < pocketDistance) {

            pocketDistance = d;

            targetPocket = pocket;

        }

    }


    /*
       Calculate ghost-ball position.

       This makes AI aim toward
       the pocket rather than simply
       shooting directly at the ball.
    */

    const pdx =
        targetPocket.x - target.x;

    const pdy =
        targetPocket.y - target.y;


    const pocketLength =
        Math.hypot(
            pdx,
            pdy
        );


    const pocketNX =
        pdx / pocketLength;

    const pocketNY =
        pdy / pocketLength;


    /*
       Ghost ball is behind target.
    */

    const ghostX =
        target.x -
        pocketNX *
        (target.radius * 2);


    const ghostY =
        target.y -
        pocketNY *
        (target.radius * 2);


    /*
       Direction cue -> ghost
    */

    const dx =
        ghostX - cue.x;

    const dy =
        ghostY - cue.y;


    /*
       Small AI error

       Makes AI feel human.
    */

    const error =
        (Math.random() - 0.5) *
        0.10;


    const angle =
        Math.atan2(
            dy,
            dx
        ) + error;


    /*
       AI power

       Longer shot = more power.
    */

    const distance =
        Math.hypot(
            dx,
            dy
        );


    let speed =
        5.0 +
        distance * 0.012;


    speed =
        Math.min(
            speed,
            9.5
        );


    cue.vx =
        Math.cos(angle) *
        speed;

    cue.vy =
        Math.sin(angle) *
        speed;


    shotInProgress = true;

    shotPocketed = [];

    shotCueBallPocketed = false;

    shotHadContact = false;

    firstContactBall = null;


    statusText.textContent =
        "Royal AI is taking the shot...";

}


/* =========================================================
   END GAME
========================================================= */

function endGame(
    winner,
    message
) {

    gameRunning = false;

    shotInProgress = false;

    aiming = false;


    clearTimeout(aiTimer);


    resultTitle.textContent =
        `${winner.name.toUpperCase()} WINS`;


    resultMessage.textContent =
        message;


    resultModal.classList.remove(
        "hidden"
    );

}


/* =========================================================
   PLAY AGAIN
========================================================= */

playAgainButton.addEventListener(
    "click",
    () => {

        clearTimeout(aiTimer);


        resultModal.classList.add(
            "hidden"
        );


        players[0].group = null;
        players[1].group = null;

        players[0].score = 0;
        players[1].score = 0;


        currentPlayer = 0;

        gameRunning = true;

        shotInProgress = false;

        aiming = false;


        createGame();

        updatePlayerUI();

        lastTime =
            performance.now();


        startAnimation();

    }
);


/* =========================================================
   MENU
========================================================= */

menuButton.addEventListener(
    "click",
    goBackToMenu
);


backButton.addEventListener(
    "click",
    goBackToMenu
);


function goBackToMenu() {

    gameRunning = false;

    shotInProgress = false;

    aiming = false;


    clearTimeout(aiTimer);


    cancelAnimationFrame(
        animationFrame
    );


    resultModal.classList.add(
        "hidden"
    );


    power = 0;

    powerFill.style.width = "0%";
    powerText.textContent = "0%";


    gameScreen.classList.add(
        "hidden"
    );


    startScreen.classList.remove(
        "hidden"
    );


    currentPlayer = 0;

}


/* =========================================================
   NEW GAME
========================================================= */

restartButton.addEventListener(
    "click",
    () => {

        if (
            confirm("Start a new game?")
        ) {

            startGame();

        }

    }
);


/* =========================================================
   ROUNDED RECTANGLE
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

    context.arcTo(
        x + width,
        y,
        x + width,
        y + height,
        radius
    );

    context.arcTo(
        x + width,
        y + height,
        x,
        y + height,
        radius
    );

    context.arcTo(
        x,
        y + height,
        x,
        y,
        radius
    );

    context.arcTo(
        x,
        y,
        x + width,
        y,
        radius
    );

    context.closePath();

}


/* =========================================================
   DARKEN COLOR
========================================================= */

function darkenColor(hex) {

    if (
        !hex ||
        hex[0] !== "#" ||
        hex.length !== 7
    ) {

        return "#111111";

    }


    let r =
        parseInt(
            hex.substring(1, 3),
            16
        );


    let g =
        parseInt(
            hex.substring(3, 5),
            16
        );


    let b =
        parseInt(
            hex.substring(5, 7),
            16
        );


    r =
        Math.floor(r * 0.45);

    g =
        Math.floor(g * 0.45);

    b =
        Math.floor(b * 0.45);


    return `rgb(${r},${g},${b})`;

}


/* =========================================================
   INITIALIZE
========================================================= */

setupCanvas();

singleModeButton.classList.add("selected");

player2Box.classList.add("hidden");

console.log(
    "Royal 8 Ball Premium Physics Engine loaded."
);