/**
 * Subway Surfers 3D - Three.js Endless Runner Engine
 */

class SubwayRunnerGame {
    constructor() {
        this.container = document.getElementById('game-canvas-container');
        this.lanes = [-3.5, 0, 3.5];
        this.currentLane = 1; // 0: Left, 1: Center, 2: Right
        
        this.score = 0;
        this.coins = 0;
        this.multiplier = 1;
        this.baseSpeed = 0.08;
        this.currentSpeed = this.baseSpeed;
        this.distanceTravelled = 0;
        this.spawnZ = 0;

        this.isStarted = false;
        this.isGameOver = false;
        this.isPaused = false;

        // Player physics
        this.playerY = 0;
        this.velY = 0;
        this.gravity = -0.022;
        this.isJumping = false;
        this.isSliding = false;
        this.slideTimer = 0;

        // Power-ups state
        this.powerups = {
            magnet: { active: false, duration: 0, max: 600 },
            jetpack: { active: false, duration: 0, max: 400 },
            hoverboard: { active: false, count: 1 },
            multiplier: { active: false, duration: 0, max: 600 },
            sneakers: { active: false, duration: 0, max: 500 }
        };

        // Guard / Inspector chase state
        this.stumbleWarning = false;
        this.stumbleTimer = 0;

        // World objects
        this.chunks = [];
        this.obstacles = [];
        this.coinsList = [];
        this.powerupItems = [];
        this.particles = [];

        this.initThree();
        this.createPlayer();
        this.createGuard();
        this.initEnvironment();

        window.addEventListener('resize', () => this.onWindowResize());
        this.renderPreview();
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0b0d17);
        this.scene.fog = new THREE.FogExp2(0x0b0d17, 0.012);

        // Camera
        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
        this.cameraTargetPosition = new THREE.Vector3(0, 3.5, 8);
        this.camera.position.copy(this.cameraTargetPosition);
        this.camera.lookAt(0, 1.5, -10);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfffaed, 0.9);
        dirLight.position.set(20, 40, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        this.scene.add(dirLight);

        // Neon Point Lights along track
        const cyanLight = new THREE.PointLight(0x00f0ff, 1.5, 30);
        cyanLight.position.set(-8, 5, -20);
        this.scene.add(cyanLight);

        const pinkLight = new THREE.PointLight(0xff007f, 1.5, 30);
        pinkLight.position.set(8, 5, -40);
        this.scene.add(pinkLight);
    }

    createPlayer() {
        this.playerGroup = new THREE.Group();

        // Torso / Body
        const torsoGeo = new THREE.BoxGeometry(0.8, 1.1, 0.5);
        const torsoMat = new THREE.MeshStandardMaterial({ color: 0xff007f, roughness: 0.3 });
        this.torso = new THREE.Mesh(torsoGeo, torsoMat);
        this.torso.position.y = 1.1;
        this.torso.castShadow = true;
        this.playerGroup.add(this.torso);

        // Head & Visor
        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.0;
        head.castShadow = true;
        this.playerGroup.add(head);

        const visorGeo = new THREE.BoxGeometry(0.62, 0.2, 0.4);
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.1, metalness: 0.8 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 2.05, -0.15);
        this.playerGroup.add(visor);

        // Cap / Hat
        const capGeo = new THREE.BoxGeometry(0.66, 0.15, 0.7);
        const capMat = new THREE.MeshStandardMaterial({ color: 0x111122 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(0, 2.38, 0.05);
        this.playerGroup.add(cap);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.32, 0.8, 0.35);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1e2942 });
        
        this.leftLeg = new THREE.Mesh(legGeo, legMat);
        this.leftLeg.position.set(-0.22, 0.4, 0);
        this.leftLeg.castShadow = true;
        this.playerGroup.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, legMat);
        this.rightLeg.position.set(0.22, 0.4, 0);
        this.rightLeg.castShadow = true;
        this.playerGroup.add(this.rightLeg);

        // Hoverboard Mesh (Hidden by default)
        const boardGeo = new THREE.BoxGeometry(1.2, 0.1, 2.4);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x32ff7e, emissive: 0x105525, roughness: 0.2 });
        this.hoverboardMesh = new THREE.Mesh(boardGeo, boardMat);
        this.hoverboardMesh.position.set(0, -0.05, 0);
        this.hoverboardMesh.visible = false;
        this.playerGroup.add(this.hoverboardMesh);

        // Jetpack Mesh (Hidden by default)
        const jetpackGeo = new THREE.BoxGeometry(0.7, 0.8, 0.4);
        const jetpackMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.8 });
        this.jetpackMesh = new THREE.Mesh(jetpackGeo, jetpackMat);
        this.jetpackMesh.position.set(0, 1.2, 0.45);
        this.jetpackMesh.visible = false;
        this.playerGroup.add(this.jetpackMesh);

        // Shadow Blob on Ground
        const shadowGeo = new THREE.PlaneGeometry(1.2, 1.8);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
        this.playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.playerShadow.rotation.x = -Math.PI / 2;
        this.playerShadow.position.y = 0.02;
        this.scene.add(this.playerShadow);

        this.playerGroup.position.set(this.lanes[this.currentLane], 0, 0);
        this.scene.add(this.playerGroup);
    }

    createGuard() {
        this.guardGroup = new THREE.Group();
        
        const guardBodyGeo = new THREE.BoxGeometry(1.0, 1.3, 0.6);
        const guardBodyMat = new THREE.MeshStandardMaterial({ color: 0x2b3e66 });
        const guardBody = new THREE.Mesh(guardBodyGeo, guardBodyMat);
        guardBody.position.y = 1.2;
        guardBody.castShadow = true;
        this.guardGroup.add(guardBody);

        const guardHeadGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const guardHeadMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
        const guardHead = new THREE.Mesh(guardHeadGeo, guardHeadMat);
        guardHead.position.y = 2.2;
        this.guardGroup.add(guardHead);

        this.guardGroup.position.set(this.lanes[this.currentLane], 0, 5); // 5 units behind
        this.scene.add(this.guardGroup);
    }

    initEnvironment() {
        this.spawnZ = 0;
        // Build initial track chunks
        for (let i = 0; i < 10; i++) {
            this.spawnTrackChunk(-i * 30);
        }

        // Initialize continuous obstacle stream ahead
        let initialZ = -40;
        while (initialZ > -260) {
            this.generateObstaclesForChunk(initialZ);
            initialZ -= 25;
        }
        this.spawnZ = initialZ;
    }

    spawnTrackChunk(zPos) {
        const chunk = new THREE.Group();

        // Track Floor Bed
        const bedGeo = new THREE.BoxGeometry(14, 0.2, 30);
        const bedMat = new THREE.MeshStandardMaterial({ color: 0x181c2e, roughness: 0.8 });
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.set(0, -0.1, -15);
        bed.receiveShadow = true;
        chunk.add(bed);

        // Steel Rails for 3 Lanes
        const railGeo = new THREE.BoxGeometry(0.12, 0.15, 30);
        const railMat = new THREE.MeshStandardMaterial({ color: 0x606c88, metalness: 0.9, roughness: 0.2 });

        this.lanes.forEach(laneX => {
            const leftRail = new THREE.Mesh(railGeo, railMat);
            leftRail.position.set(laneX - 0.9, 0.05, -15);
            chunk.add(leftRail);

            const rightRail = new THREE.Mesh(railGeo, railMat);
            rightRail.position.set(laneX + 0.9, 0.05, -15);
            chunk.add(rightRail);
        });

        // Side Tunnel Walls & Arch Pillars
        const wallGeo = new THREE.BoxGeometry(1, 10, 30);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x101424 });
        
        const leftWall = new THREE.Mesh(wallGeo, wallMat);
        leftWall.position.set(-8, 5, -15);
        chunk.add(leftWall);

        const rightWall = new THREE.Mesh(wallGeo, wallMat);
        rightWall.position.set(8, 5, -15);
        chunk.add(rightWall);

        chunk.position.z = zPos;
        this.scene.add(chunk);
        this.chunks.push(chunk);
    }

    generateObstaclesForChunk(zPos) {
        const randPattern = Math.random();
        
        if (randPattern < 0.45) {
            // Train on one lane, barrier or coins on another
            const trainLane = Math.floor(Math.random() * 3);
            const isRamp = Math.random() < 0.5;
            this.spawnTrain(this.lanes[trainLane], zPos, isRamp);

            const otherLane = (trainLane + 1) % 3;
            if (Math.random() < 0.6) {
                this.spawnBarrier(this.lanes[otherLane], zPos - 3, Math.random() < 0.5 ? 'low' : 'high');
            } else {
                this.spawnCoinArc(this.lanes[otherLane], zPos);
            }
        } else if (randPattern < 0.80) {
            // Barriers and Coin Arc
            const barrierLane = Math.floor(Math.random() * 3);
            this.spawnBarrier(this.lanes[barrierLane], zPos, Math.random() < 0.5 ? 'low' : 'high');
            
            const coinLane = (barrierLane + 1) % 3;
            this.spawnCoinArc(this.lanes[coinLane], zPos);
        } else {
            // Coin Arc & Powerup
            const coinLane = Math.floor(Math.random() * 3);
            this.spawnCoinArc(this.lanes[coinLane], zPos);
        }

        // Powerup item spawn chance (15%)
        if (Math.random() < 0.15) {
            const puTypes = ['magnet', 'jetpack', 'multiplier', 'sneakers'];
            const selectedPU = puTypes[Math.floor(Math.random() * puTypes.length)];
            const puLane = Math.floor(Math.random() * 3);
            this.spawnPowerup(this.lanes[puLane], zPos - 12, selectedPU);
        }
    }

    spawnTrain(laneX, zPos, hasRamp) {
        const trainGroup = new THREE.Group();

        // Main Body
        const trainGeo = new THREE.BoxGeometry(2.4, 3.2, 14);
        const trainMat = new THREE.MeshStandardMaterial({ color: 0x7928ca, metalness: 0.5, roughness: 0.3 });
        const trainMesh = new THREE.Mesh(trainGeo, trainMat);
        trainMesh.position.set(0, 1.6, 0);
        trainMesh.castShadow = true;
        trainMesh.receiveShadow = true;
        trainGroup.add(trainMesh);

        // Front Face / Windshield
        const frontGeo = new THREE.BoxGeometry(2.42, 1.2, 0.2);
        const frontMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.1 });
        const frontMesh = new THREE.Mesh(frontGeo, frontMat);
        frontMesh.position.set(0, 2.2, 7.0);
        trainGroup.add(frontMesh);

        // Headlights
        const lightGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const hlLeft = new THREE.Mesh(lightGeo, lightMat);
        hlLeft.rotation.x = Math.PI / 2;
        hlLeft.position.set(-0.8, 0.8, 7.02);
        trainGroup.add(hlLeft);

        const hlRight = hlLeft.clone();
        hlRight.position.set(0.8, 0.8, 7.02);
        trainGroup.add(hlRight);

        // Wooden Ramp attached to front if ramp train
        if (hasRamp) {
            const rampGeo = new THREE.BoxGeometry(2.2, 0.2, 4.5);
            const rampMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
            const rampMesh = new THREE.Mesh(rampGeo, rampMat);
            rampMesh.rotation.x = -Math.PI / 9; // Sloped up
            rampMesh.position.set(0, 0.9, 8.8);
            trainGroup.add(rampMesh);
        }

        trainGroup.position.set(laneX, 0, zPos);
        trainGroup.userData = { type: 'train', hasRamp: hasRamp, boundingBox: new THREE.Box3() };
        this.scene.add(trainGroup);
        this.obstacles.push(trainGroup);

        // Spawn Coins on Train Roof!
        for (let c = -4; c <= 4; c += 2) {
            this.spawnCoin(laneX, zPos + c, 3.6);
        }
    }

    spawnBarrier(laneX, zPos, type) {
        const barrierGroup = new THREE.Group();

        if (type === 'low') {
            // Jump over hurdle
            const barGeo = new THREE.BoxGeometry(2.4, 0.9, 0.3);
            const barMat = new THREE.MeshStandardMaterial({ color: 0xff3860 });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.y = 0.45;
            bar.castShadow = true;
            barrierGroup.add(bar);
        } else {
            // Slide under barrier
            const topBarGeo = new THREE.BoxGeometry(2.6, 0.8, 0.3);
            const barMat = new THREE.MeshStandardMaterial({ color: 0xff3860 });
            const topBar = new THREE.Mesh(topBarGeo, barMat);
            topBar.position.y = 2.2;
            barrierGroup.add(topBar);

            const legGeo = new THREE.BoxGeometry(0.2, 2.2, 0.2);
            const legL = new THREE.Mesh(legGeo, barMat);
            legL.position.set(-1.2, 1.1, 0);
            const legR = legL.clone();
            legR.position.set(1.2, 1.1, 0);
            barrierGroup.add(legL);
            barrierGroup.add(legR);
        }

        barrierGroup.position.set(laneX, 0, zPos);
        barrierGroup.userData = { type: type === 'low' ? 'barrier_low' : 'barrier_high', boundingBox: new THREE.Box3() };
        this.scene.add(barrierGroup);
        this.obstacles.push(barrierGroup);
    }

    spawnCoin(x, z, y = 0.8) {
        const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2, emissive: 0x665200 });
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.rotation.x = Math.PI / 2;
        coin.position.set(x, y, z);
        coin.castShadow = true;
        this.scene.add(coin);
        this.coinsList.push(coin);
    }

    spawnCoinArc(laneX, zPos) {
        for (let i = 0; i < 5; i++) {
            const arcY = 0.8 + Math.sin((i / 4) * Math.PI) * 1.5;
            this.spawnCoin(laneX, zPos - (i * 2.2), arcY);
        }
    }

    spawnPowerup(laneX, zPos, type) {
        const group = new THREE.Group();
        const geo = new THREE.SphereGeometry(0.5, 16, 16);
        
        let color = 0x00f0ff;
        if (type === 'magnet') color = 0x00f0ff;
        else if (type === 'jetpack') color = 0xff007f;
        else if (type === 'multiplier') color = 0xffd700;
        else if (type === 'sneakers') color = 0x32ff7e;

        const mat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        group.position.set(laneX, 1.2, zPos);
        group.userData = { type: type };
        this.scene.add(group);
        this.powerupItems.push(group);
    }

    // --- CONTROLS ---
    moveLeft() {
        if (!this.isStarted || this.isGameOver || this.isPaused) return;
        if (this.currentLane > 0) {
            this.currentLane--;
            window.soundManager.playSlide();
        }
    }

    moveRight() {
        if (!this.isStarted || this.isGameOver || this.isPaused) return;
        if (this.currentLane < 2) {
            this.currentLane++;
            window.soundManager.playSlide();
        }
    }

    jump() {
        if (!this.isStarted || this.isGameOver || this.isPaused) return;
        if (!this.isJumping) {
            this.isJumping = true;
            const jumpVelocity = this.powerups.sneakers.active ? 0.55 : 0.38;
            this.velY = jumpVelocity;
            if (this.isSliding) {
                this.isSliding = false;
                this.torso.scale.set(1, 1, 1);
            }
            window.soundManager.playJump();
        }
    }

    slide() {
        if (!this.isStarted || this.isGameOver || this.isPaused) return;
        if (!this.isSliding) {
            this.isSliding = true;
            this.slideTimer = 40;
            this.torso.scale.set(1, 0.4, 1); // Shrink height
            if (this.isJumping) {
                this.velY = -0.4; // Slam down fast
            }
            window.soundManager.playSlide();
        }
    }

    activateHoverboard() {
        if (!this.isStarted || this.isGameOver || this.isPaused) return;
        if (!this.powerups.hoverboard.active) {
            this.powerups.hoverboard.active = true;
            this.hoverboardMesh.visible = true;
            window.soundManager.playPowerup();
        }
    }

    renderPreview() {
        if (!this.isStarted && !this.isGameOver) {
            requestAnimationFrame(() => this.renderPreview());
            this.renderer.render(this.scene, this.camera);
        }
    }

    // --- GAME LOOP & UPDATE ---
    start() {
        this.isStarted = true;
        this.isGameOver = false;
        this.isPaused = false;
        this.animate();
    }

    animate() {
        if (this.isGameOver) return;
        requestAnimationFrame(() => this.animate());

        if (this.isPaused) return;

        this.updatePlayer();
        this.updateWorld();
        this.updateCollisions();
        this.updatePowerups();

        this.renderer.render(this.scene, this.camera);
    }

    updatePlayer() {
        // Lateral lane interpolation
        const targetX = this.lanes[this.currentLane];
        this.playerGroup.position.x += (targetX - this.playerGroup.position.x) * 0.2;

        // Vertical physics (Jump / Fall)
        if (this.isJumping || this.playerY > 0) {
            this.playerY += this.velY;
            this.velY += this.gravity;

            if (this.playerY <= 0) {
                this.playerY = 0;
                this.isJumping = false;
                this.velY = 0;
            }
        }

        // Slide timer update
        if (this.isSliding) {
            this.slideTimer--;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.torso.scale.set(1, 1, 1);
            }
        }

        // Jetpack altitude
        if (this.powerups.jetpack.active) {
            this.playerGroup.position.y = 8.0;
        } else {
            this.playerGroup.position.y = this.playerY;
        }

        // Shadow position
        this.playerShadow.position.x = this.playerGroup.position.x;
        this.playerShadow.position.z = this.playerGroup.position.z;

        // Camera follow
        const camTargetY = this.powerups.jetpack.active ? 11.0 : 3.5 + (this.playerY * 0.5);
        this.camera.position.x += (this.playerGroup.position.x * 0.4 - this.camera.position.x) * 0.1;
        this.camera.position.y += (camTargetY - this.camera.position.y) * 0.1;

        // Leg running animation
        const time = Date.now() * 0.012;
        if (!this.isJumping && !this.isSliding) {
            this.leftLeg.rotation.x = Math.sin(time) * 0.6;
            this.rightLeg.rotation.x = -Math.sin(time) * 0.6;
        }
    }

    updateWorld() {
        // Speed up progressively (very gentle acceleration)
        this.currentSpeed = this.baseSpeed + (this.distanceTravelled * 0.000002);
        this.distanceTravelled += this.currentSpeed;

        const moveDist = this.currentSpeed * 3.2;
        this.spawnZ += moveDist;

        const mult = this.powerups.multiplier.active ? 2 : 1;
        this.score = Math.floor(this.distanceTravelled * 15 * mult);

        // Move track chunks & recycle seamlessly
        this.chunks.forEach(chunk => {
            chunk.position.z += moveDist;
            if (chunk.position.z > 30) {
                chunk.position.z -= 300;
            }
        });

        // Continuously spawn new obstacles ahead as player advances!
        while (this.spawnZ > -260) {
            this.generateObstaclesForChunk(this.spawnZ);
            this.spawnZ -= 25;
        }

        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.position.z += moveDist;
            if (obs.position.z > 20) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
            }
        }

        // Rotate & move coins
        for (let i = this.coinsList.length - 1; i >= 0; i--) {
            const coin = this.coinsList[i];
            coin.rotation.z += 0.05;
            coin.position.z += moveDist;

            // Magnet pull
            if (this.powerups.magnet.active) {
                const distToPlayer = coin.position.distanceTo(this.playerGroup.position);
                if (distToPlayer < 12) {
                    coin.position.lerp(this.playerGroup.position, 0.2);
                }
            }

            if (coin.position.z > 20) {
                this.scene.remove(coin);
                this.coinsList.splice(i, 1);
            }
        }

        // Move powerup items
        for (let i = this.powerupItems.length - 1; i >= 0; i--) {
            const pu = this.powerupItems[i];
            pu.rotation.y += 0.04;
            pu.position.z += moveDist;
            if (pu.position.z > 20) {
                this.scene.remove(pu);
                this.powerupItems.splice(i, 1);
            }
        }
    }

    updateCollisions() {
        const playerPos = this.playerGroup.position;

        // Coin Collection
        for (let i = this.coinsList.length - 1; i >= 0; i--) {
            const coin = this.coinsList[i];
            if (coin.position.distanceTo(playerPos) < 1.4) {
                this.coins++;
                window.soundManager.playCoin();
                this.scene.remove(coin);
                this.coinsList.splice(i, 1);
            }
        }

        // Powerup Collection
        for (let i = this.powerupItems.length - 1; i >= 0; i--) {
            const pu = this.powerupItems[i];
            if (pu.position.distanceTo(playerPos) < 1.6) {
                const type = pu.userData.type;
                this.activatePowerup(type);
                window.soundManager.playPowerup();
                this.scene.remove(pu);
                this.powerupItems.splice(i, 1);
            }
        }

        // Obstacle Collisions (Only when not in Jetpack mode)
        if (!this.powerups.jetpack.active) {
            for (let obs of this.obstacles) {
                const obsPos = obs.position;
                const type = obs.userData.type;

                // Check lane alignment & Z proximity
                if (Math.abs(obsPos.x - playerPos.x) < 1.2 && Math.abs(obsPos.z - playerPos.z) < 1.5) {
                    let collided = false;

                    if (type === 'barrier_low') {
                        if (playerPos.y < 0.8) collided = true;
                    } else if (type === 'barrier_high') {
                        if (!this.isSliding) collided = true;
                    } else if (type === 'train') {
                        // If train has ramp and player is climbing front
                        if (obs.userData.hasRamp && playerPos.z > obsPos.z + 6) {
                            this.playerY = 3.4; // Run on top of train!
                        } else if (playerPos.y < 3.0) {
                            collided = true;
                        }
                    }

                    if (collided) {
                        this.handleCrash();
                        break;
                    }
                }
            }
        }
    }

    activatePowerup(type) {
        if (type === 'magnet') {
            this.powerups.magnet.active = true;
            this.powerups.magnet.duration = this.powerups.magnet.max;
        } else if (type === 'jetpack') {
            this.powerups.jetpack.active = true;
            this.powerups.jetpack.duration = this.powerups.jetpack.max;
            this.jetpackMesh.visible = true;
        } else if (type === 'multiplier') {
            this.powerups.multiplier.active = true;
            this.powerups.multiplier.duration = this.powerups.multiplier.max;
        } else if (type === 'sneakers') {
            this.powerups.sneakers.active = true;
            this.powerups.sneakers.duration = this.powerups.sneakers.max;
        }
    }

    updatePowerups() {
        for (let key in this.powerups) {
            if (key === 'hoverboard') continue;
            const p = this.powerups[key];
            if (p.active) {
                p.duration--;
                if (p.duration <= 0) {
                    p.active = false;
                    if (key === 'jetpack') this.jetpackMesh.visible = false;
                }
            }
        }
    }

    handleCrash() {
        if (this.powerups.hoverboard.active) {
            // Hoverboard absorbs hit!
            this.powerups.hoverboard.active = false;
            this.hoverboardMesh.visible = false;
            window.soundManager.playCrash();
        } else {
            // Game Over
            this.isGameOver = true;
            window.soundManager.playCrash();
            if (window.uiManager) {
                window.uiManager.showGameOver(this.score, this.coins);
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Instantiate Engine when DOM loads
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new SubwayRunnerGame();
});
