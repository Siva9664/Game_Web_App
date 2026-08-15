/**
 * Shadow Demon Guardian (Chasing Monster Logic & Animations)
 */
class Monster {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);

        this.distanceBehind = 4.5; // Normal chasing distance (meters behind player)
        this.targetDistance = 4.5;
        this.stumbleDanger = false;
        this.runCycle = 0;

        this.buildMonster();
    }

    buildMonster() {
        const monsterMat = new THREE.MeshStandardMaterial({
            color: 0x090a0f,
            roughness: 0.9,
            metalness: 0.1
        });

        const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

        // Huge Torso
        const torsoGeo = new THREE.BoxGeometry(1.6, 2.2, 1.2);
        const torso = new THREE.Mesh(torsoGeo, monsterMat);
        torso.position.y = 1.8;
        this.mesh.add(torso);

        // Head with Horns
        const headGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        const head = new THREE.Mesh(headGeo, monsterMat);
        head.position.set(0, 3.2, 0.2);
        this.mesh.add(head);

        // Horns
        const hornGeo = new THREE.ConeGeometry(0.2, 0.8, 4);
        const leftHorn = new THREE.Mesh(hornGeo, monsterMat);
        leftHorn.position.set(-0.4, 3.8, 0.2);
        leftHorn.rotation.z = -0.3;
        this.mesh.add(leftHorn);

        const rightHorn = new THREE.Mesh(hornGeo, monsterMat);
        rightHorn.position.set(0.4, 3.8, 0.2);
        rightHorn.rotation.z = 0.3;
        this.mesh.add(rightHorn);

        // Glowing Red Eyes
        const eyeGeo = new THREE.BoxGeometry(0.25, 0.1, 0.1);
        const leftEye = new THREE.Mesh(eyeGeo, redGlowMat);
        leftEye.position.set(-0.25, 3.25, 0.72);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, redGlowMat);
        rightEye.position.set(0.25, 3.25, 0.72);
        this.mesh.add(rightEye);

        // Claw Arms
        const armGeo = new THREE.BoxGeometry(0.4, 1.8, 0.4);
        this.leftArm = new THREE.Mesh(armGeo, monsterMat);
        this.leftArm.position.set(-1.1, 2.0, 0.5);
        this.mesh.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, monsterMat);
        this.rightArm.position.set(1.1, 2.0, 0.5);
        this.mesh.add(this.rightArm);
    }

    triggerApproach() {
        this.targetDistance = 1.6; // Rush extremely close!
        this.stumbleDanger = true;
        audioManager.playMonsterRoar();
    }

    retreat() {
        this.targetDistance = 4.5;
        this.stumbleDanger = false;
    }

    update(delta, playerPos, isPlayerStumbling) {
        if (isPlayerStumbling && !this.stumbleDanger) {
            this.triggerApproach();
        }

        // Smoothly interpolate current chasing distance
        this.distanceBehind += (this.targetDistance - this.distanceBehind) * 4 * delta;

        // Position monster directly behind player along Z path
        this.mesh.position.x = playerPos.x * 0.8;
        this.mesh.position.y = playerPos.y;
        this.mesh.position.z = playerPos.z - this.distanceBehind;

        // Running claw animation
        this.runCycle += delta * 12;
        const swing = Math.sin(this.runCycle) * 0.8;
        this.leftArm.rotation.x = swing;
        this.rightArm.rotation.x = -swing;
    }

    isCatchingPlayer() {
        return this.distanceBehind < 1.9 && this.stumbleDanger;
    }

    reset() {
        this.distanceBehind = 4.5;
        this.targetDistance = 4.5;
        this.stumbleDanger = false;
        this.mesh.position.set(0, 0, -4.5);
    }
}
