/**
 * Dynamic Obstacle Spawner & Collision Box Engine
 */
class ObstacleManager {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.lanePositions = [-2.8, 0, 2.8];

        this.stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
        this.woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
        this.spikeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    }

    spawnObstaclePattern(zPos) {
        const types = ['high_arch', 'low_log', 'spike_trap', 'side_pillar'];
        const type = types[Math.floor(Math.random() * types.length)];
        const laneIdx = Math.floor(Math.random() * 3);
        const laneX = this.lanePositions[laneIdx];

        const group = new THREE.Group();
        let bbox = null;

        if (type === 'high_arch') {
            // High Stone Arch spanning all lanes - Requires SLIDE under center
            const archTopGeo = new THREE.BoxGeometry(9.0, 1.0, 0.8);
            const archTop = new THREE.Mesh(archTopGeo, this.stoneMat);
            archTop.position.set(0, 2.2, zPos);
            archTop.castShadow = true;
            group.add(archTop);

            // Side supports
            const suppGeo = new THREE.BoxGeometry(0.8, 2.6, 0.8);
            const leftSupp = new THREE.Mesh(suppGeo, this.stoneMat);
            leftSupp.position.set(-4.2, 1.3, zPos);
            group.add(leftSupp);

            const rightSupp = new THREE.Mesh(suppGeo, this.stoneMat);
            rightSupp.position.set(4.2, 1.3, zPos);
            group.add(rightSupp);

            bbox = new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(0, 2.2, zPos),
                new THREE.Vector3(8.5, 0.9, 0.8)
            );
        } else if (type === 'low_log') {
            // Low Fallen Log on 1 or 2 lanes - Requires JUMP over
            const logGeo = new THREE.CylinderGeometry(0.4, 0.4, 3.2, 8);
            const log = new THREE.Mesh(logGeo, this.woodMat);
            log.rotation.z = Math.PI / 2;
            log.position.set(laneX, 0.4, zPos);
            log.castShadow = true;
            group.add(log);

            bbox = new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(laneX, 0.4, zPos),
                new THREE.Vector3(3.0, 0.8, 0.8)
            );
        } else if (type === 'spike_trap') {
            // Spike Trap on 1 lane - Requires LANE SWITCH or JUMP
            for (let i = 0; i < 4; i++) {
                const spikeGeo = new THREE.ConeGeometry(0.2, 0.8, 4);
                const spike = new THREE.Mesh(spikeGeo, this.spikeMat);
                spike.position.set(laneX + (i % 2 === 0 ? 0.3 : -0.3), 0.4, zPos + (i > 1 ? 0.3 : -0.3));
                spike.castShadow = true;
                group.add(spike);
            }

            bbox = new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(laneX, 0.4, zPos),
                new THREE.Vector3(1.8, 0.8, 1.2)
            );
        } else if (type === 'side_pillar') {
            // Fallen Pillar blocking 2 lanes
            const pillarGeo = new THREE.BoxGeometry(5.4, 1.4, 0.8);
            const pillar = new THREE.Mesh(pillarGeo, this.stoneMat);
            const blockCenterAndLeft = Math.random() < 0.5;
            const px = blockCenterAndLeft ? -1.4 : 1.4;
            pillar.position.set(px, 0.7, zPos);
            pillar.castShadow = true;
            group.add(pillar);

            bbox = new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(px, 0.7, zPos),
                new THREE.Vector3(5.2, 1.4, 0.8)
            );
        }

        group.userData = {
            type: type,
            bbox: bbox,
            zPos: zPos,
            hit: false
        };

        this.scene.add(group);
        this.obstacles.push(group);
    }

    update(playerZ) {
        // Remove past obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            if (this.obstacles[i].userData.zPos < playerZ - 10) {
                this.scene.remove(this.obstacles[i]);
                this.obstacles.splice(i, 1);
            }
        }
    }

    checkCollisions(player) {
        if (player.isStumbling) return null; // Grace period during stumble

        // Player Bounding Box based on current state (crouched vs standing vs jumping)
        const pSizeY = player.isSliding ? 0.6 : 1.8;
        const pPosY = player.position.y + (player.isSliding ? 0.3 : 0.9);
        const playerBBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(player.position.x, pPosY, player.position.z),
            new THREE.Vector3(0.8, pSizeY, 0.8)
        );

        for (let obs of this.obstacles) {
            if (obs.userData.hit) continue;

            const oBox = obs.userData.bbox;
            if (oBox && playerBBox.intersectsBox(oBox)) {
                obs.userData.hit = true;
                return obs.userData.type; // Returns obstacle type triggered
            }
        }
        return null;
    }

    reset() {
        this.obstacles.forEach(obs => this.scene.remove(obs));
        this.obstacles = [];
    }
}
