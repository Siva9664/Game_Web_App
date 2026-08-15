/**
 * Relic Coins & Power-Up Orbs Collectibles Engine
 */
class CollectiblesManager {
    constructor(scene) {
        this.scene = scene;
        this.coins = [];
        this.powerups = [];
        this.lanePositions = [-2.8, 0, 2.8];

        // Shared Geometries & Materials
        this.coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12);
        this.coinGeo.rotateX(Math.PI / 2);
        this.coinMat = new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            metalness: 0.9,
            roughness: 0.2,
            emissive: 0x92400e
        });

        this.powerupMatMap = {
            magnet: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
            shield: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
            boost: new THREE.MeshBasicMaterial({ color: 0x06b6d4 }),
            multiplier: new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        };
    }

    spawnCoinPattern(zStart) {
        const patternType = Math.floor(Math.random() * 3);
        const laneIdx = Math.floor(Math.random() * 3);
        const laneX = this.lanePositions[laneIdx];

        if (patternType === 0) {
            // Straight line of 6 coins
            for (let i = 0; i < 6; i++) {
                this.createCoin(laneX, 0.6, zStart + i * 1.8);
            }
        } else if (patternType === 1) {
            // Arc jump pattern (coins going up and down)
            for (let i = 0; i < 7; i++) {
                const arcY = 0.6 + Math.sin((i / 6) * Math.PI) * 2.2;
                this.createCoin(laneX, arcY, zStart + i * 1.8);
            }
        } else if (patternType === 2) {
            // Zig-Zag across lanes
            for (let i = 0; i < 6; i++) {
                const zX = this.lanePositions[i % 3];
                this.createCoin(zX, 0.6, zStart + i * 2.0);
            }
        }

        // 20% Chance to spawn a rare Power-up Orb ahead
        if (Math.random() < 0.25) {
            const types = ['magnet', 'shield', 'boost', 'multiplier'];
            const type = types[Math.floor(Math.random() * types.length)];
            const pLane = this.lanePositions[Math.floor(Math.random() * 3)];
            this.createPowerup(type, pLane, 1.2, zStart + 16);
        }
    }

    createCoin(x, y, z) {
        const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
        coin.position.set(x, y, z);
        coin.userData = { zPos: z, collected: false };
        this.scene.add(coin);
        this.coins.push(coin);
    }

    createPowerup(type, x, y, z) {
        const geo = new THREE.SphereGeometry(0.45, 12, 12);
        const pOrb = new THREE.Mesh(geo, this.powerupMatMap[type]);
        pOrb.position.set(x, y, z);
        pOrb.userData = { type: type, zPos: z, collected: false };
        this.scene.add(pOrb);
        this.powerups.push(pOrb);
    }

    update(delta, playerPos, isMagnetActive) {
        // Spin coins & powerup animations
        this.coins.forEach(coin => {
            if (!coin.userData.collected) {
                coin.rotation.y += delta * 4;

                // Magnetic Attraction Logic
                if (isMagnetActive) {
                    const distSq = coin.position.distanceToSquared(playerPos);
                    if (distSq < 100) { // 10 meter magnetic pull radius
                        coin.position.lerp(playerPos, delta * 12);
                    }
                }
            }
        });

        this.powerups.forEach(p => {
            if (!p.userData.collected) {
                p.rotation.y += delta * 3;
                p.position.y = 1.2 + Math.sin(Date.now() * 0.005) * 0.2;
            }
        });

        // Clean past items behind player
        for (let i = this.coins.length - 1; i >= 0; i--) {
            if (this.coins[i].userData.zPos < playerPos.z - 10 || this.coins[i].userData.collected) {
                this.scene.remove(this.coins[i]);
                this.coins.splice(i, 1);
            }
        }

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            if (this.powerups[i].userData.zPos < playerPos.z - 10 || this.powerups[i].userData.collected) {
                this.scene.remove(this.powerups[i]);
                this.powerups.splice(i, 1);
            }
        }
    }

    checkCoinCollections(playerPos) {
        let collectedCount = 0;
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(playerPos.x, playerPos.y + 0.9, playerPos.z),
            new THREE.Vector3(1.2, 1.8, 1.2)
        );

        for (let coin of this.coins) {
            if (coin.userData.collected) continue;
            const coinBox = new THREE.Box3().setFromObject(coin);

            if (playerBox.intersectsBox(coinBox)) {
                coin.userData.collected = true;
                this.scene.remove(coin);
                collectedCount++;
                audioManager.playCoinSound();
            }
        }
        return collectedCount;
    }

    checkPowerupCollections(playerPos) {
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(playerPos.x, playerPos.y + 0.9, playerPos.z),
            new THREE.Vector3(1.4, 2.0, 1.4)
        );

        for (let p of this.powerups) {
            if (p.userData.collected) continue;
            const pBox = new THREE.Box3().setFromObject(p);

            if (playerBox.intersectsBox(pBox)) {
                p.userData.collected = true;
                this.scene.remove(p);
                audioManager.playPowerupSound();
                return p.userData.type; // Returns 'magnet', 'shield', 'boost', or 'multiplier'
            }
        }
        return null;
    }

    reset() {
        this.coins.forEach(c => this.scene.remove(c));
        this.powerups.forEach(p => this.scene.remove(p));
        this.coins = [];
        this.powerups = [];
    }
}
