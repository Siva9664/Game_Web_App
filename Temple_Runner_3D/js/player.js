/**
 * 3D Player Character (Movement, Physics, Animations & Visual Effects)
 */
class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);

        // Lane setup: -1 (Left), 0 (Center), 1 (Right)
        this.currentLane = 0;
        this.laneWidth = 2.8;
        this.targetX = 0;
        
        // Physics constants
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocityY = 0;
        this.gravity = -38;
        this.jumpForce = 13.5;
        this.isGrounded = true;
        this.isSliding = false;
        this.slideTimer = 0;
        this.slideDuration = 0.75; // seconds

        // Body leaning & animation parameters
        this.runCycle = 0;
        this.tiltAngle = 0;
        this.isStumbling = false;
        this.stumbleTimer = 0;

        // Visual components
        this.bodyGroup = new THREE.Group();
        this.mesh.add(this.bodyGroup);
        
        this.shieldBubble = null;
        this.magnetIcon = null;

        this.buildCharacter('explorer');
        this.setupEffects();
    }

    buildCharacter(skinId = 'explorer') {
        // Clear previous meshes
        while (this.bodyGroup.children.length > 0) {
            this.bodyGroup.remove(this.bodyGroup.children[0]);
        }

        // Color theme mapping by skin
        const skinColors = {
            explorer: { body: 0xa855f7, shirt: 0xd97706, pants: 0x78350f, hat: 0x92400e, accent: 0xfbbf24 },
            ninja:    { body: 0x1e293b, shirt: 0x0f172a, pants: 0x020617, scarf: 0xef4444, accent: 0xf87171 },
            golden:   { body: 0xf59e0b, shirt: 0xfbbf24, pants: 0xd97706, hat: 0xfef08a, accent: 0xffffff },
            cyber:    { body: 0x0284c7, shirt: 0x06b6d4, pants: 0x0f172a, visor: 0x22d3ee, accent: 0x38bdf8 }
        };

        const theme = skinColors[skinId] || skinColors.explorer;

        // Torso / Chest
        const torsoGeo = new THREE.BoxGeometry(0.8, 1.1, 0.5);
        const torsoMat = new THREE.MeshStandardMaterial({ color: theme.shirt, roughness: 0.6 });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 1.35;
        torso.castShadow = true;
        this.bodyGroup.add(torso);

        // Head
        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.2;
        head.castShadow = true;
        this.bodyGroup.add(head);

        // Hat / Mask / Visor depending on skin
        if (skinId === 'explorer' || skinId === 'golden') {
            const hatGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
            const hatMat = new THREE.MeshStandardMaterial({ color: theme.hat || theme.accent });
            const hat = new THREE.Mesh(hatGeo, hatMat);
            hat.position.y = 2.45;
            this.bodyGroup.add(hat);
        } else if (skinId === 'cyber') {
            const visorGeo = new THREE.BoxGeometry(0.52, 0.15, 0.25);
            const visorMat = new THREE.MeshBasicMaterial({ color: theme.visor });
            const visor = new THREE.Mesh(visorGeo, visorMat);
            visor.position.set(0, 2.22, 0.18);
            this.bodyGroup.add(visor);
        } else if (skinId === 'ninja') {
            const scarfGeo = new THREE.BoxGeometry(0.6, 0.15, 0.6);
            const scarfMat = new THREE.MeshStandardMaterial({ color: theme.scarf });
            const scarf = new THREE.Mesh(scarfGeo, scarfMat);
            scarf.position.y = 1.95;
            this.bodyGroup.add(scarf);
        }

        // Limbs (Left/Right Arms & Legs)
        const limbMat = new THREE.MeshStandardMaterial({ color: theme.pants, roughness: 0.7 });
        const armMat = new THREE.MeshStandardMaterial({ color: theme.shirt, roughness: 0.6 });

        // Left Leg
        this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), limbMat);
        this.leftLeg.position.set(-0.22, 0.4, 0);
        this.leftLeg.castShadow = true;
        this.bodyGroup.add(this.leftLeg);

        // Right Leg
        this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), limbMat);
        this.rightLeg.position.set(0.22, 0.4, 0);
        this.rightLeg.castShadow = true;
        this.bodyGroup.add(this.rightLeg);

        // Left Arm
        this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), armMat);
        this.leftArm.position.set(-0.52, 1.35, 0);
        this.leftArm.castShadow = true;
        this.bodyGroup.add(this.leftArm);

        // Right Arm
        this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), armMat);
        this.rightArm.position.set(0.52, 1.35, 0);
        this.rightArm.castShadow = true;
        this.bodyGroup.add(this.rightArm);
    }

    setupEffects() {
        // Shield Bubble Aura
        const shieldGeo = new THREE.SphereGeometry(1.6, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.4,
            wireframe: true
        });
        this.shieldBubble = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldBubble.position.y = 1.2;
        this.shieldBubble.visible = false;
        this.mesh.add(this.shieldBubble);

        // Magnet Icon
        const magnetGeo = new THREE.TorusGeometry(0.3, 0.08, 8, 16);
        const magnetMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 });
        this.magnetIcon = new THREE.Mesh(magnetGeo, magnetMat);
        this.magnetIcon.position.set(0, 2.8, 0);
        this.magnetIcon.visible = false;
        this.mesh.add(this.magnetIcon);
    }

    moveLeft() {
        if (this.currentLane > -1) {
            this.currentLane--;
            this.targetX = -this.currentLane * this.laneWidth;
            this.tiltAngle = 0.35; // Bank left
        }
    }

    moveRight() {
        if (this.currentLane < 1) {
            this.currentLane++;
            this.targetX = -this.currentLane * this.laneWidth;
            this.tiltAngle = -0.35; // Bank right
        }
    }

    jump() {
        if (this.isGrounded && !this.isSliding) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            audioManager.playJumpSound();
        }
    }

    slide() {
        if (!this.isSliding) {
            this.isSliding = true;
            this.slideTimer = this.slideDuration;
            audioManager.playSlideSound();

            // Quick drop if mid-air
            if (!this.isGrounded) {
                this.velocityY = -15;
            }
        }
    }

    triggerStumble() {
        this.isStumbling = true;
        this.stumbleTimer = 1.2;
        audioManager.playCrashSound();
    }

    update(delta, forwardSpeed) {
        // Forward progression along Z axis
        this.position.z += forwardSpeed * delta;

        // Smooth horizontal interpolation towards target lane X position
        this.position.x += (this.targetX - this.position.x) * 15 * delta;

        // Smooth Body Tilt Recovery
        this.tiltAngle *= (1 - 8 * delta);
        this.mesh.rotation.z = this.tiltAngle;

        // Apply Vertical Gravity & Jump Physics
        if (!this.isGrounded) {
            this.velocityY += this.gravity * delta;
            this.position.y += this.velocityY * delta;

            if (this.position.y <= 0) {
                this.position.y = 0;
                this.velocityY = 0;
                this.isGrounded = true;
                audioManager.playFootstep();
            }
        }

        // Handle Slide Timer & Crouch Scale
        if (this.isSliding) {
            this.slideTimer -= delta;
            this.bodyGroup.scale.set(1, 0.4, 1);
            this.bodyGroup.position.y = -0.4;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.bodyGroup.scale.set(1, 1, 1);
                this.bodyGroup.position.y = 0;
            }
        } else {
            this.bodyGroup.scale.set(1, 1, 1);
            this.bodyGroup.position.y = 0;
        }

        // Stumble timer update
        if (this.isStumbling) {
            this.stumbleTimer -= delta;
            if (this.stumbleTimer <= 0) {
                this.isStumbling = false;
            }
        }

        // Running animation leg swing
        if (this.isGrounded && !this.isSliding) {
            this.runCycle += delta * forwardSpeed * 0.85;
            const swing = Math.sin(this.runCycle) * 0.7;
            this.leftLeg.rotation.x = swing;
            this.rightLeg.rotation.x = -swing;
            this.leftArm.rotation.x = -swing * 0.8;
            this.rightArm.rotation.x = swing * 0.8;

            // Trigger footstep sound periodically
            if (Math.abs(swing) > 0.65 && Math.random() < 0.15) {
                audioManager.playFootstep();
            }
        } else if (!this.isGrounded) {
            // Jump pose
            this.leftLeg.rotation.x = -0.6;
            this.rightLeg.rotation.x = 0.6;
        }

        // Update main mesh transform
        this.mesh.position.copy(this.position);

        // Animate Power-up visual overlays
        if (this.shieldBubble.visible) {
            this.shieldBubble.rotation.y += delta * 2;
        }
        if (this.magnetIcon.visible) {
            this.magnetIcon.rotation.y += delta * 3;
        }
    }

    setPowerupVisual(type, active) {
        if (type === 'shield' && this.shieldBubble) {
            this.shieldBubble.visible = active;
        }
        if (type === 'magnet' && this.magnetIcon) {
            this.magnetIcon.visible = active;
        }
    }

    reset() {
        this.currentLane = 0;
        this.targetX = 0;
        this.position.set(0, 0, 0);
        this.velocityY = 0;
        this.isGrounded = true;
        this.isSliding = false;
        this.isStumbling = false;
        this.mesh.position.set(0, 0, 0);
        this.shieldBubble.visible = false;
        this.magnetIcon.visible = false;
    }
}
