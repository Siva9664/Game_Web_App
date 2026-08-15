/**
 * Three.js Scene Setup (Lights, Fog, Camera, Particle Systems)
 */
class GameScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.dirLight = null;
        this.particleSystem = null;
        this.particlesCount = 150;

        this.init();
    }

    init() {
        const canvas = document.getElementById('bg-canvas');
        
        // Scene creation
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x090a0f);
        this.scene.fog = new THREE.FogExp2(0x090a0f, 0.02);

        // Perspective Camera Setup
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            180
        );
        this.camera.position.set(0, 7.5, -9);
        this.camera.lookAt(0, 1.5, 6);

        // WebGL Renderer Setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting System
        this.setupLights();

        // Atmospheric Ember Particles
        this.setupEmbers();

        // Handle Window Resizing
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    setupLights() {
        // Ambient Light
        const ambient = new THREE.AmbientLight(0xffedd5, 0.45);
        this.scene.add(ambient);

        // Sunlight / Directional Light with Shadows
        this.dirLight = new THREE.DirectionalLight(0xffb703, 1.2);
        this.dirLight.position.set(15, 30, 20);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 80;
        this.dirLight.shadow.camera.left = -20;
        this.dirLight.shadow.camera.right = 20;
        this.dirLight.shadow.camera.top = 20;
        this.dirLight.shadow.camera.bottom = -20;
        this.scene.add(this.dirLight);

        // Subtle Hemisphere Light for sky/ground contrast
        const hemiLight = new THREE.HemisphereLight(0xffb703, 0x1e1b4b, 0.4);
        this.scene.add(hemiLight);
    }

    setupEmbers() {
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(this.particlesCount * 3);
        const pSpeed = new Float32Array(this.particlesCount);

        for (let i = 0; i < this.particlesCount; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * 30;
            pPos[i * 3 + 1] = Math.random() * 15;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
            pSpeed[i] = 0.02 + Math.random() * 0.04;
        }

        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

        const pMat = new THREE.PointsMaterial({
            color: 0xfbbf24,
            size: 0.25,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending
        });

        this.particleSystem = new THREE.Points(pGeo, pMat);
        this.particleSystem.userData = { speeds: pSpeed };
        this.scene.add(this.particleSystem);
    }

    updateEmbers(playerZ) {
        if (!this.particleSystem) return;
        const posAttr = this.particleSystem.geometry.attributes.position;
        const positions = posAttr.array;
        const speeds = this.particleSystem.userData.speeds;

        for (let i = 0; i < this.particlesCount; i++) {
            positions[i * 3 + 1] += speeds[i]; // float up
            
            // Wrap around relative to player Z
            if (positions[i * 3 + 1] > 18) {
                positions[i * 3 + 1] = 0;
            }
            if (positions[i * 3 + 2] < playerZ - 10) {
                positions[i * 3 + 2] = playerZ + 40;
            }
        }
        posAttr.needsUpdate = true;
    }

    updateCamera(playerPos, isBoosting = false) {
        // Target position significantly higher and further back for clear view
        const targetX = playerPos.x * 0.5;
        const targetY = playerPos.y + 6.8 + (isBoosting ? 1.5 : 0);
        const targetZ = playerPos.z - (isBoosting ? 11.5 : 9.0);

        // Smooth camera damping
        this.camera.position.x += (targetX - this.camera.position.x) * 0.12;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.12;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.15;

        // Camera focus point looking down the track ahead of player
        const lookTarget = new THREE.Vector3(
            playerPos.x * 0.3,
            playerPos.y + 1.2,
            playerPos.z + 16
        );
        this.camera.lookAt(lookTarget);

        // Dynamic light follow
        if (this.dirLight) {
            this.dirLight.position.set(playerPos.x + 15, 30, playerPos.z + 20);
            this.dirLight.target.position.set(playerPos.x, 0, playerPos.z + 10);
            this.dirLight.target.updateMatrixWorld();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
