/* =========================================================
   KINGDOM GUARDIANS
   Advanced Tower Defense
========================================================= */


/* =========================================================
   CANVAS
========================================================= */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");

let W = 0;
let H = 0;


function resizeCanvas() {

    const rect =
        canvas.getBoundingClientRect();

    W = rect.width;
    H = rect.height;

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width =
        W * dpr;

    canvas.height =
        H * dpr;

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
    resizeCanvas
);

resizeCanvas();


/* =========================================================
   GAME STATE
========================================================= */

const game = {

    running: false,

    paused: false,

    gameOver: false,

    speed: 1,

    gold: 1000,

    lives: 30,

    wave: 1,

    score: 0,

    enemiesKilled: 0,

    totalEnemies: 0,

    spawnedEnemies: 0,

    enemiesRemaining: 0,

    waveActive: false,

    spawnTimer: 0,

    spawnInterval: 0.7,

    selectedTowerType: "archer",

    selectedTower: null,

    mouse: {
        x: 0,
        y: 0
    }

};


/* =========================================================
   ARRAYS
========================================================= */

const towers = [];

const enemies = [];

const projectiles = [];

const particles = [];

const floatingTexts = [];

const effects = [];


/* =========================================================
   TOWER DATA
========================================================= */

const TOWER_TYPES = {

    archer: {

        name: "Archer",

        icon: "🏹",

        cost: 100,

        damage: 30,

        range: 150,

        fireRate: .55,

        projectileSpeed: 500,

        color: "#f2bd58",

        splash: 0,

        slow: 0

    },


    mage: {

        name: "Arcane Mage",

        icon: "🔥",

        cost: 200,

        damage: 55,

        range: 135,

        fireRate: 1.1,

        projectileSpeed: 350,

        color: "#b26cff",

        splash: 60,

        slow: 0

    },


    cannon: {

        name: "Cannon",

        icon: "💣",

        cost: 300,

        damage: 110,

        range: 180,

        fireRate: 1.8,

        projectileSpeed: 300,

        color: "#ef754c",

        splash: 85,

        slow: 0

    },


    frost: {

        name: "Frost Tower",

        icon: "❄️",

        cost: 250,

        damage: 25,

        range: 160,

        fireRate: .75,

        projectileSpeed: 420,

        color: "#5cdcff",

        splash: 40,

        slow: .45

    }

};


/* =========================================================
   ENEMY DATA
========================================================= */

const ENEMY_TYPES = {

    goblin: {

        name: "Goblin",

        health: 120,

        speed: 55,

        reward: 20,

        size: 13,

        color: "#4caf50"

    },


    wolf: {

        name: "Wolf",

        health: 80,

        speed: 105,

        reward: 25,

        size: 10,

        color: "#c6ccd2"

    },


    armored: {

        name: "Knight",

        health: 300,

        speed: 40,

        reward: 40,

        size: 15,

        color: "#64748b",

        armor: .25

    },


    ogre: {

        name: "Ogre",

        health: 600,

        speed: 25,

        reward: 80,

        size: 21,

        color: "#8256a5"

    },


    boss: {

        name: "Demon King",

        health: 3500,

        speed: 20,

        reward: 500,

        size: 34,

        color: "#b52b45",

        armor: .15,

        boss: true

    }

};


/* =========================================================
   MAP
========================================================= */

const PATH = [

    {
        x: -.05,
        y: .18
    },

    {
        x: .16,
        y: .18
    },

    {
        x: .16,
        y: .73
    },

    {
        x: .45,
        y: .73
    },

    {
        x: .45,
        y: .32
    },

    {
        x: .75,
        y: .32
    },

    {
        x: .75,
        y: .76
    },

    {
        x: 1.05,
        y: .76
    }

];


function point(index) {

    return {

        x: PATH[index].x * W,

        y: PATH[index].y * H

    };

}


/* =========================================================
   UTILITIES
========================================================= */

function distance(a,b) {

    return Math.hypot(
        a.x-b.x,
        a.y-b.y
    );

}


function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(max,value)
    );

}


function random(min,max) {

    return Math.random() *
        (max-min) + min;

}


/* =========================================================
   UI
========================================================= */

function updateUI() {

    document.getElementById(
        "gold"
    ).textContent =
        Math.floor(game.gold);

    document.getElementById(
        "lives"
    ).textContent =
        game.lives;

    document.getElementById(
        "wave"
    ).textContent =
        game.wave;

    document.getElementById(
        "waveNumber"
    ).textContent =
        game.wave;

    document.getElementById(
        "score"
    ).textContent =
        game.score;

    document.getElementById(
        "enemyCounter"
    ).textContent =
        `${game.spawnedEnemies} / ${game.totalEnemies}`;

}


/* =========================================================
   ENEMY CLASS
========================================================= */

class Enemy {

    constructor(type) {

        const data =
            ENEMY_TYPES[type];

        const start =
            point(0);

        this.type = type;

        this.x = start.x;

        this.y = start.y;

        this.health =
            data.health *
            (1 + game.wave * .13);

        this.maxHealth =
            this.health;

        this.speed =
            data.speed;

        this.baseSpeed =
            data.speed;

        this.reward =
            data.reward;

        this.size =
            data.size;

        this.color =
            data.color;

        this.armor =
            data.armor || 0;

        this.pathIndex = 1;

        this.dead = false;

        this.slowTimer = 0;

        this.flash = 0;

        this.boss =
            data.boss || false;

    }


    update(dt) {

        if(this.dead)
            return;


        if(this.slowTimer > 0) {

            this.slowTimer -= dt;

            this.speed =
                this.baseSpeed *
                .55;

        }
        else {

            this.speed =
                this.baseSpeed;

        }


        if(
            this.pathIndex >=
            PATH.length
        ) {

            this.reachCastle();

            return;

        }


        const target =
            point(
                this.pathIndex
            );


        const dx =
            target.x - this.x;

        const dy =
            target.y - this.y;


        const len =
            Math.hypot(dx,dy);


        if(len < 3) {

            this.pathIndex++;

            return;

        }


        this.x +=
            dx / len *
            this.speed *
            dt *
            game.speed;


        this.y +=
            dy / len *
            this.speed *
            dt *
            game.speed;


        if(this.flash > 0) {

            this.flash -= dt;

        }

    }


    takeDamage(
        amount,
        source
    ) {

        const reduced =
            amount *
            (1-this.armor);


        this.health -=
            reduced;

        this.flash = .08;


        floatingText(
            this.x,
            this.y-20,
            "-" +
            Math.round(reduced)
        );


        if(
            source &&
            source.slow
        ) {

            this.slowTimer = 1.2;

        }


        if(this.health <= 0) {

            this.die();

        }

    }


    die() {

        if(this.dead)
            return;


        this.dead = true;

        game.gold +=
            this.reward;

        game.score +=
            this.reward * 10;

        game.enemiesKilled++;


        createExplosion(
            this.x,
            this.y,
            this.color
        );


        if(this.boss) {

            document
                .getElementById(
                    "bossBar"
                )
                .classList
                .add("hidden");

        }


        updateUI();

    }


    reachCastle() {

        this.dead = true;

        game.lives--;

        createExplosion(
            this.x,
            this.y,
            "#ff4444"
        );


        updateUI();


        if(game.lives <= 0) {

            endGame();

        }

    }


    draw() {

        ctx.save();


        if(this.flash > 0) {

            ctx.globalAlpha = .6;

        }


        /* Shadow */

        ctx.fillStyle =
            "rgba(0,0,0,.3)";

        ctx.beginPath();

        ctx.ellipse(
            this.x,
            this.y + this.size,
            this.size,
            5,
            0,
            0,
            Math.PI*2
        );

        ctx.fill();


        /* Body */

        ctx.fillStyle =
            this.color;

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            this.size,
            0,
            Math.PI*2
        );

        ctx.fill();


        /* Boss ring */

        if(this.boss) {

            ctx.strokeStyle =
                "#ffce55";

            ctx.lineWidth = 3;

            ctx.beginPath();

            ctx.arc(
                this.x,
                this.y,
                this.size+8,
                0,
                Math.PI*2
            );

            ctx.stroke();

        }


        /* Eyes */

        ctx.fillStyle =
            "#fff";

        ctx.beginPath();

        ctx.arc(
            this.x-4,
            this.y-2,
            2,
            0,
            Math.PI*2
        );

        ctx.arc(
            this.x+4,
            this.y-2,
            2,
            0,
            Math.PI*2
        );

        ctx.fill();


        /* Health */

        const barWidth =
            this.boss
                ? 80
                : 35;


        ctx.fillStyle =
            "#321919";

        ctx.fillRect(
            this.x-barWidth/2,
            this.y-this.size-12,
            barWidth,
            5
        );


        ctx.fillStyle =
            "#54d477";

        ctx.fillRect(
            this.x-barWidth/2,
            this.y-this.size-12,
            barWidth *
            clamp(
                this.health /
                this.maxHealth,
                0,
                1
            ),
            5
        );


        ctx.restore();

    }

}


/* =========================================================
   TOWER CLASS
========================================================= */

class Tower {

    constructor(
        x,
        y,
        type
    ) {

        const data =
            TOWER_TYPES[type];

        this.x = x;

        this.y = y;

        this.type = type;

        this.level = 1;

        this.damage =
            data.damage;

        this.range =
            data.range;

        this.fireRate =
            data.fireRate;

        this.cooldown = 0;

        this.targetMode =
            "first";

    }


    update(dt) {

        this.cooldown -=
            dt *
            game.speed;


        if(
            this.cooldown > 0
        )
            return;


        const target =
            this.findTarget();


        if(target) {

            projectiles.push(
                new Projectile(
                    this,
                    target
                )
            );


            this.cooldown =
                this.fireRate;

        }

    }


    findTarget() {

        const valid =
            enemies.filter(
                enemy =>
                    !enemy.dead &&
                    distance(
                        this,
                        enemy
                    ) <= this.range
            );


        if(valid.length === 0)
            return null;


        if(
            this.targetMode ===
            "strong"
        ) {

            return valid.reduce(
                (a,b) =>
                    a.health >
                    b.health
                        ? a
                        : b
            );

        }


        if(
            this.targetMode ===
            "last"
        ) {

            return valid
                .slice()
                .sort(
                    (a,b) =>
                        b.pathIndex -
                        a.pathIndex
                )[0];

        }


        /* First */

        return valid
            .slice()
            .sort(
                (a,b) =>
                    b.pathIndex -
                    a.pathIndex
            )[0];

    }


    upgrade() {

        const cost =
            this.getUpgradeCost();


        if(
            game.gold < cost
        )
            return;


        game.gold -= cost;

        this.level++;


        this.damage *= 1.35;

        this.range += 12;

        this.fireRate *= .9;


        floatingText(
            this.x,
            this.y-30,
            "UPGRADED!"
        );


        updateTowerInfo();

        updateUI();

    }


    getUpgradeCost() {

        const base =
            TOWER_TYPES[
                this.type
            ].cost;

        return Math.floor(
            base *
            this.level *
            .8
        );

    }


    sell() {

        const base =
            TOWER_TYPES[
                this.type
            ].cost;

        const refund =
            Math.floor(
                base *
                this.level *
                .55
            );


        game.gold +=
            refund;


        const index =
            towers.indexOf(this);


        if(index !== -1) {

            towers.splice(
                index,
                1
            );

        }


        game.selectedTower =
            null;


        updateTowerInfo();

        updateUI();

    }


    draw() {

        const data =
            TOWER_TYPES[
                this.type
            ];


        /* Range */

        if(
            this ===
            game.selectedTower
        ) {

            ctx.fillStyle =
                "rgba(255,220,100,.08)";

            ctx.strokeStyle =
                "rgba(255,220,100,.5)";

            ctx.beginPath();

            ctx.arc(
                this.x,
                this.y,
                this.range,
                0,
                Math.PI*2
            );

            ctx.fill();

            ctx.stroke();

        }


        /* Base */

        ctx.fillStyle =
            "#4b321c";

        ctx.strokeStyle =
            data.color;

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            23,
            0,
            Math.PI*2
        );

        ctx.fill();

        ctx.stroke();


        /* Icon */

        ctx.font =
            "25px Arial";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            data.icon,
            this.x,
            this.y
        );


        /* Level */

        ctx.font =
            "10px Arial";

        ctx.fillStyle =
            "#ffe3a0";

        ctx.fillText(
            "LV " + this.level,
            this.x,
            this.y+35
        );

    }

}


/* =========================================================
   PROJECTILE
========================================================= */

class Projectile {

    constructor(
        tower,
        target
    ) {

        this.x =
            tower.x;

        this.y =
            tower.y;

        this.target =
            target;

        this.type =
            tower.type;

        this.damage =
            tower.damage;

        this.speed =
            TOWER_TYPES[
                tower.type
            ].projectileSpeed;

        this.dead = false;

    }


    update(dt) {

        if(
            !this.target ||
            this.target.dead
        ) {

            this.dead = true;

            return;

        }


        const dx =
            this.target.x -
            this.x;

        const dy =
            this.target.y -
            this.y;


        const len =
            Math.hypot(dx,dy);


        if(len < 8) {

            this.hit();

            return;

        }


        this.x +=
            dx / len *
            this.speed *
            dt *
            game.speed;


        this.y +=
            dy / len *
            this.speed *
            dt *
            game.speed;

    }


    hit() {

        const data =
            TOWER_TYPES[
                this.type
            ];


        this.target.takeDamage(
            this.damage,
            data
        );


        /* Splash */

        if(data.splash > 0) {

            enemies.forEach(
                enemy => {

                    if(
                        enemy !==
                        this.target &&
                        !enemy.dead &&
                        distance(
                            this.target,
                            enemy
                        ) <= data.splash
                    ) {

                        enemy.takeDamage(
                            this.damage*.35,
                            data
                        );

                    }

                }
            );

        }


        createExplosion(
            this.x,
            this.y,
            data.color
        );


        this.dead = true;

    }


    draw() {

        const color =
            TOWER_TYPES[
                this.type
            ].color;


        ctx.fillStyle =
            color;

        ctx.shadowBlur = 12;

        ctx.shadowColor =
            color;

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            5,
            0,
            Math.PI*2
        );

        ctx.fill();

        ctx.shadowBlur = 0;

    }

}


/* =========================================================
   PARTICLES
========================================================= */

function createExplosion(
    x,
    y,
    color
) {

    for(
        let i=0;
        i<18;
        i++
    ) {

        particles.push({

            x:x,

            y:y,

            vx:
                random(-120,120),

            vy:
                random(-120,120),

            life:
                random(.3,.7),

            maxLife:.7,

            color:color,

            size:
                random(2,5)

        });

    }

}


function updateParticles(dt) {

    particles.forEach(
        p => {

            p.x +=
                p.vx *
                dt *
                game.speed;

            p.y +=
                p.vy *
                dt *
                game.speed;

            p.vy +=
                100 *
                dt;

            p.life -=
                dt;

        }
    );


    particles.splice(
        0,
        particles.length -
        particles.filter(
            p => p.life > 0
        ).length
    );

}


function drawParticles() {

    particles.forEach(
        p => {

            ctx.globalAlpha =
                clamp(
                    p.life /
                    p.maxLife,
                    0,
                    1
                );

            ctx.fillStyle =
                p.color;

            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                p.size,
                0,
                Math.PI*2
            );

            ctx.fill();

        }
    );


    ctx.globalAlpha = 1;

}


/* =========================================================
   FLOATING DAMAGE TEXT
========================================================= */

function floatingText(
    x,
    y,
    text
) {

    floatingTexts.push({

        x:x,

        y:y,

        text:text,

        life:1

    });

}


function updateFloatingText(dt) {

    floatingTexts.forEach(
        item => {

            item.y -=
                25 * dt;

            item.life -=
                dt;

        }
    );


    while(
        floatingTexts.length &&
        floatingTexts[0].life <= 0
    ) {

        floatingTexts.shift();

    }

}


function drawFloatingText() {

    floatingTexts.forEach(
        item => {

            ctx.globalAlpha =
                item.life;

            ctx.fillStyle =
                "#fff4bd";

            ctx.font =
                "bold 13px Arial";

            ctx.textAlign =
                "center";

            ctx.fillText(
                item.text,
                item.x,
                item.y
            );

        }
    );


    ctx.globalAlpha = 1;

}


/* =========================================================
   MAP DRAW
========================================================= */

function drawMap() {

    /* Grass */

    ctx.fillStyle =
        "#63994b";

    ctx.fillRect(
        0,
        0,
        W,
        H
    );


    /* Grid */

    ctx.strokeStyle =
        "rgba(255,255,255,.035)";

    ctx.lineWidth = 1;


    for(
        let x=0;
        x<W;
        x+=45
    ) {

        ctx.beginPath();

        ctx.moveTo(x,0);

        ctx.lineTo(x,H);

        ctx.stroke();

    }


    for(
        let y=0;
        y<H;
        y+=45
    ) {

        ctx.beginPath();

        ctx.moveTo(0,y);

        ctx.lineTo(W,y);

        ctx.stroke();

    }


    /* Road */

    ctx.beginPath();


    const first =
        point(0);


    ctx.moveTo(
        first.x,
        first.y
    );


    for(
        let i=1;
        i<PATH.length;
        i++
    ) {

        const p =
            point(i);

        ctx.lineTo(
            p.x,
            p.y
        );

    }


    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";


    ctx.strokeStyle =
        "#4a3827";

    ctx.lineWidth =
        68;

    ctx.stroke();


    ctx.strokeStyle =
        "#ad8c60";

    ctx.lineWidth =
        56;

    ctx.stroke();


    ctx.strokeStyle =
        "#c5a878";

    ctx.lineWidth =
        3;

    ctx.setLineDash([
        15,
        12
    ]);

    ctx.stroke();

    ctx.setLineDash([]);


    /* Trees */

    drawTrees();


    /* Castle */

    const end =
        point(
            PATH.length-1
        );


    ctx.font =
        "65px Arial";

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";

    ctx.fillText(
        "🏰",
        end.x,
        end.y
    );

}


/* =========================================================
   TREES
========================================================= */

function drawTrees() {

    const trees = [

        [0.07,.08],
        [.28,.08],
        [.38,.15],
        [.58,.1],
        [.9,.12],
        [.08,.88],
        [.33,.9],
        [.58,.9],
        [.91,.9],
        [.9,.52],
        [.29,.48]

    ];


    trees.forEach(
        item => {

            const x =
                item[0] * W;

            const y =
                item[1] * H;


            ctx.font =
                "38px Arial";

            ctx.textAlign =
                "center";

            ctx.fillText(
                "🌲",
                x,
                y
            );

        }
    );

}


/* =========================================================
   WAVE SYSTEM
========================================================= */

function startWave() {

    if(
        game.waveActive ||
        game.gameOver
    )
        return;


    game.waveActive =
        true;


    game.spawnedEnemies = 0;


    game.totalEnemies =
        7 +
        game.wave * 3;


    game.enemiesRemaining =
        game.totalEnemies;


    game.spawnTimer = 0;


    /* Boss */

    if(
        game.wave % 5 === 0
    ) {

        game.totalEnemies += 1;

    }


    updateUI();

}


function spawnEnemy() {

    let type =
        "goblin";


    const r =
        Math.random();


    if(
        game.wave >= 3 &&
        r < .2
    ) {

        type = "wolf";

    }


    if(
        game.wave >= 4 &&
        r < .15
    ) {

        type = "armored";

    }


    if(
        game.wave >= 6 &&
        r < .08
    ) {

        type = "ogre";

    }


    if(
        game.wave % 5 === 0 &&
        game.spawnedEnemies ===
        game.totalEnemies-1
    ) {

        type = "boss";

        showBoss();

    }


    enemies.push(
        new Enemy(type)
    );


    game.spawnedEnemies++;

    updateUI();

}


function updateWave(dt) {

    if(
        !game.waveActive
    )
        return;


    game.spawnTimer -=
        dt *
        game.speed;


    if(
        game.spawnedEnemies <
        game.totalEnemies &&
        game.spawnTimer <= 0
    ) {

        spawnEnemy();

        game.spawnTimer =
            game.spawnInterval;

    }


    const progress =
        game.spawnedEnemies /
        game.totalEnemies;


    document.getElementById(
        "waveProgress"
    ).style.width =
        (progress*100) + "%";


    if(
        game.spawnedEnemies >=
        game.totalEnemies &&
        enemies.length === 0
    ) {

        game.waveActive =
            false;

        game.wave++;

        game.gold +=
            100 +
            game.wave * 10;

        updateUI();

    }

}


/* =========================================================
   BOSS UI
========================================================= */

function showBoss() {

    document
        .getElementById(
            "bossBar"
        )
        .classList
        .remove("hidden");

}


function updateBossBar() {

    const boss =
        enemies.find(
            enemy =>
                enemy.boss &&
                !enemy.dead
        );


    if(!boss) {

        document
            .getElementById(
                "bossBar"
            )
            .classList
            .add("hidden");

        return;

    }


    document.getElementById(
        "bossHealth"
    ).style.width =
        (
            boss.health /
            boss.maxHealth *
            100
        ) + "%";

}


/* =========================================================
   ABILITIES
========================================================= */

document
.getElementById("meteor")
.addEventListener(
    "click",
    () => {

        if(
            game.gold < 100
        )
            return;


        game.gold -= 100;


        enemies.forEach(
            enemy => {

                if(
                    !enemy.dead
                ) {

                    enemy.takeDamage(
                        250
                    );

                }

            }
        );


        createExplosion(
            W*.5,
            H*.5,
            "#ff713d"
        );


        updateUI();

    }
);


document
.getElementById("freeze")
.addEventListener(
    "click",
    () => {

        if(
            game.gold < 75
        )
            return;


        game.gold -= 75;


        enemies.forEach(
            enemy => {

                enemy.slowTimer =
                    4;

            }
        );


        updateUI();

    }
);


document
.getElementById("lightning")
.addEventListener(
    "click",
    () => {

        if(
            game.gold < 150
        )
            return;


        game.gold -= 150;


        const targets =
            enemies
            .filter(
                e => !e.dead
            )
            .slice(0,5);


        targets.forEach(
            enemy => {

                enemy.takeDamage(
                    450
                );


                createExplosion(
                    enemy.x,
                    enemy.y,
                    "#a8e7ff"
                );

            }
        );


        updateUI();

    }
);


/* =========================================================
   PLACE TOWER
========================================================= */

canvas.addEventListener(
    "click",
    event => {

        if(
            !game.running ||
            game.paused
        )
            return;


        const rect =
            canvas.getBoundingClientRect();


        const x =
            event.clientX -
            rect.left;


        const y =
            event.clientY -
            rect.top;


        game.mouse.x = x;

        game.mouse.y = y;


        /* Existing tower */

        for(
            const tower of towers
        ) {

            if(
                distance(
                    {x,y},
                    tower
                ) < 30
            ) {

                game.selectedTower =
                    tower;

                game.selectedTowerType =
                    null;

                clearTowerCards();

                updateTowerInfo();

                return;

            }

        }


        if(
            !game.selectedTowerType
        )
            return;


        const data =
            TOWER_TYPES[
                game.selectedTowerType
            ];


        if(
            game.gold < data.cost
        )
            return;


        /* Road protection */

        for(
            let i=0;
            i<PATH.length-1;
            i++
        ) {

            const a =
                point(i);

            const b =
                point(i+1);


            const minX =
                Math.min(
                    a.x,b.x
                ) - 38;


            const maxX =
                Math.max(
                    a.x,b.x
                ) + 38;


            const minY =
                Math.min(
                    a.y,b.y
                ) - 38;


            const maxY =
                Math.max(
                    a.y,b.y
                ) + 38;


            if(
                x > minX &&
                x < maxX &&
                y > minY &&
                y < maxY
            ) {

                return;

            }

        }


        /* Tower overlap */

        for(
            const tower of towers
        ) {

            if(
                distance(
                    {x,y},
                    tower
                ) < 50
            ) {

                return;

            }

        }


        const tower =
            new Tower(
                x,
                y,
                game.selectedTowerType
            );


        towers.push(tower);


        game.gold -=
            data.cost;


        game.selectedTower =
            tower;


        updateTowerInfo();

        updateUI();

    }
);


/* =========================================================
   TOWER SHOP
========================================================= */

document
.querySelectorAll(".tower-card")
.forEach(
    card => {

        card.addEventListener(
            "click",
            () => {

                game.selectedTowerType =
                    card.dataset.type;

                game.selectedTower =
                    null;


                clearTowerCards();

                card.classList.add(
                    "selected"
                );


                updateTowerInfo();

            }
        );

    }
);


function clearTowerCards() {

    document
    .querySelectorAll(
        ".tower-card"
    )
    .forEach(
        card =>
        card.classList
        .remove(
            "selected"
        )
    );

}


/* =========================================================
   TOWER INFO
========================================================= */

function updateTowerInfo() {

    const tower =
        game.selectedTower;


    if(!tower) {

        document.querySelector(
            ".info-title"
        ).textContent =
            "No tower selected";

        document.getElementById(
            "towerDamage"
        ).textContent = "-";

        document.getElementById(
            "towerRange"
        ).textContent = "-";

        document.getElementById(
            "towerLevel"
        ).textContent = "-";

        return;

    }


    const data =
        TOWER_TYPES[
            tower.type
        ];


    document.querySelector(
        ".info-title"
    ).textContent =
        data.icon +
        " " +
        data.name;


    document.getElementById(
        "towerDamage"
    ).textContent =
        Math.round(
            tower.damage
        );


    document.getElementById(
        "towerRange"
    ).textContent =
        Math.round(
            tower.range
        );


    document.getElementById(
        "towerLevel"
    ).textContent =
        tower.level;

}


document
.getElementById("upgrade")
.addEventListener(
    "click",
    () => {

        if(
            game.selectedTower
        ) {

            game.selectedTower
                .upgrade();

        }

    }
);


document
.getElementById("sell")
.addEventListener(
    "click",
    () => {

        if(
            game.selectedTower
        ) {

            game.selectedTower
                .sell();

        }

    }
);


/* =========================================================
   TARGET MODE
========================================================= */

document
.getElementById("targetMode")
.addEventListener(
    "click",
    () => {

        if(
            !game.selectedTower
        )
            return;


        const modes = [
            "first",
            "last",
            "strong"
        ];


        const index =
            modes.indexOf(
                game.selectedTower
                    .targetMode
            );


        game.selectedTower
            .targetMode =
            modes[
                (index+1) %
                modes.length
            ];


        const names = {

            first: "🎯 First",

            last: "🎯 Last",

            strong: "💪 Strong"

        };


        document.getElementById(
            "targetMode"
        ).textContent =
            names[
                game.selectedTower
                    .targetMode
            ];

    }
);


/* =========================================================
   GAME CONTROLS
========================================================= */

document
.getElementById("startGame")
.addEventListener(
    "click",
    () => {

        game.running = true;

        document
            .getElementById(
                "startScreen"
            )
            .classList
            .add("hidden");

        startWave();

    }
);


document
.getElementById("nextWave")
.addEventListener(
    "click",
    startWave
);


document
.getElementById("pause")
.addEventListener(
    "click",
    function() {

        game.paused =
            !game.paused;


        this.textContent =
            game.paused
                ? "▶"
                : "⏸";

    }
);


document
.getElementById("speed")
.addEventListener(
    "click",
    function() {

        game.speed++;


        if(
            game.speed > 3
        ) {

            game.speed = 1;

        }


        this.textContent =
            "×" +
            game.speed;

    }
);


/* =========================================================
   GAME OVER
========================================================= */

function endGame() {

    game.gameOver = true;

    game.running = false;


    document.getElementById(
        "finalScore"
    ).textContent =
        game.score;


    document
        .getElementById(
            "gameOver"
        )
        .classList
        .remove("hidden");

}


document
.getElementById("restart")
.addEventListener(
    "click",
    () => {

        location.reload();

    }
);


/* =========================================================
   DRAW LOOP
========================================================= */

function draw() {

    ctx.clearRect(
        0,
        0,
        W,
        H
    );


    drawMap();


    towers.forEach(
        tower =>
        tower.draw()
    );


    enemies.forEach(
        enemy =>
        enemy.draw()
    );


    projectiles.forEach(
        projectile =>
        projectile.draw()
    );


    drawParticles();

    drawFloatingText();

}


/* =========================================================
   UPDATE LOOP
========================================================= */

let lastTime =
    performance.now();


function gameLoop(time) {

    const dt =
        Math.min(
            (time-lastTime)/1000,
            .05
        );


    lastTime = time;


    if(
        game.running &&
        !game.paused &&
        !game.gameOver
    ) {

        updateWave(dt);


        enemies.forEach(
            enemy =>
            enemy.update(dt)
        );


        towers.forEach(
            tower =>
            tower.update(dt)
        );


        projectiles.forEach(
            projectile =>
            projectile.update(dt)
        );


        updateParticles(dt);

        updateFloatingText(dt);


        /* Remove dead enemies */

        for(
            let i=enemies.length-1;
            i>=0;
            i--
        ) {

            if(
                enemies[i].dead
            ) {

                enemies.splice(
                    i,
                    1
                );

            }

        }


        /* Remove projectiles */

        for(
            let i=projectiles.length-1;
            i>=0;
            i--
        ) {

            if(
                projectiles[i].dead
            ) {

                projectiles.splice(
                    i,
                    1
                );

            }

        }


        updateBossBar();

    }


    draw();


    requestAnimationFrame(
        gameLoop
    );

}


/* =========================================================
   START
========================================================= */

updateUI();

requestAnimationFrame(
    gameLoop
);