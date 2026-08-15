/**
 * Procedural Temple World & Tile Generator
 */
class World {
    constructor(scene) {
        this.scene = scene;
        this.tiles = [];
        this.tileLength = 10;
        this.numTilesVisible = 16;
        this.nextSpawnZ = 0;
        this.turnZPositions = [];

        // Materials setup for performance recycling
        this.stoneMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.8,
            metalness: 0.2
        });

        this.pillarMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.9
        });

        this.torchMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

        this.initWorld();
    }

    initWorld() {
        for (let i = 0; i < this.numTilesVisible; i++) {
            this.spawnTile(i < 3); // Safe starting tiles without gaps/turns
        }
    }

    spawnTile(isSafeStartingTile = false) {
        const tileGroup = new THREE.Group();
        const z = this.nextSpawnZ;

        // Determine segment type
        const isGap = !isSafeStartingTile && Math.random() < 0.15;
        const isTurnTile = !isSafeStartingTile && !isGap && (this.tiles.length % 22 === 0);

        if (isTurnTile) {
            this.turnZPositions.push(z);
        }

        // Stone Floor Mesh
        if (!isGap) {
            const floorGeo = new THREE.BoxGeometry(9.6, 0.4, this.tileLength);
            const floor = new THREE.Mesh(floorGeo, this.stoneMat);
            floor.position.set(0, -0.2, z + this.tileLength / 2);
            floor.receiveShadow = true;
            tileGroup.add(floor);
        } else {
            // Lava / Abyss visual bottom
            const lavaGeo = new THREE.BoxGeometry(9.6, 0.2, this.tileLength);
            const lavaMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });
            const lava = new THREE.Mesh(lavaGeo, lavaMat);
            lava.position.set(0, -4.0, z + this.tileLength / 2);
            tileGroup.add(lava);
        }

        // Side Curbs / Stone Walls
        const curbGeo = new THREE.BoxGeometry(0.8, 0.8, this.tileLength);
        const leftCurb = new THREE.Mesh(curbGeo, this.stoneMat);
        leftCurb.position.set(-4.8, 0.2, z + this.tileLength / 2);
        tileGroup.add(leftCurb);

        const rightCurb = new THREE.Mesh(curbGeo, this.stoneMat);
        rightCurb.position.set(4.8, 0.2, z + this.tileLength / 2);
        tileGroup.add(rightCurb);

        // Ancient Side Pillars (Every 2 tiles)
        if (Math.floor(z / this.tileLength) % 2 === 0) {
            const pillarGeo = new THREE.CylinderGeometry(0.6, 0.7, 5, 8);
            
            const leftPillar = new THREE.Mesh(pillarGeo, this.pillarMat);
            leftPillar.position.set(-5.2, 2.5, z + this.tileLength / 2);
            leftPillar.castShadow = true;
            tileGroup.add(leftPillar);

            const rightPillar = new THREE.Mesh(pillarGeo, this.pillarMat);
            rightPillar.position.set(5.2, 2.5, z + this.tileLength / 2);
            rightPillar.castShadow = true;
            tileGroup.add(rightPillar);

            // Fiery Torch on Pillar
            const torchGeo = new THREE.SphereGeometry(0.3, 8, 8);
            const leftTorch = new THREE.Mesh(torchGeo, this.torchMat);
            leftTorch.position.set(-4.5, 3.2, z + this.tileLength / 2);
            tileGroup.add(leftTorch);

            const rightTorch = new THREE.Mesh(torchGeo, this.torchMat);
            rightTorch.position.set(4.5, 3.2, z + this.tileLength / 2);
            tileGroup.add(rightTorch);
        }

        tileGroup.userData = {
            zStart: z,
            zEnd: z + this.tileLength,
            isGap: isGap,
            isTurnTile: isTurnTile
        };

        this.scene.add(tileGroup);
        this.tiles.push(tileGroup);

        this.nextSpawnZ += this.tileLength;
        return tileGroup;
    }

    update(playerZ) {
        // Recycle old tiles behind player
        if (this.tiles.length > 0 && this.tiles[0].userData.zEnd < playerZ - 15) {
            const oldTile = this.tiles.shift();
            this.scene.remove(oldTile);

            // Remove turn position if registered
            if (oldTile.userData.isTurnTile) {
                this.turnZPositions = this.turnZPositions.filter(pos => pos >= playerZ - 15);
            }

            // Spawn fresh tile ahead
            this.spawnTile(false);
        }
    }

    checkGapFall(playerPos) {
        for (let tile of this.tiles) {
            if (tile.userData.isGap) {
                if (playerPos.z >= tile.userData.zStart && playerPos.z <= tile.userData.zEnd) {
                    if (playerPos.y <= 0.1) {
                        return true; // Player stepped into open gap!
                    }
                }
            }
        }
        return false;
    }

    reset() {
        this.tiles.forEach(tile => this.scene.remove(tile));
        this.tiles = [];
        this.nextSpawnZ = 0;
        this.turnZPositions = [];
        this.initWorld();
    }
}
