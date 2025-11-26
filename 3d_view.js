import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Chess3DView {
    constructor(containerId, callbacks) {
        this.container = document.getElementById(containerId);
        this.callbacks = callbacks; // { onMove, onSelect, getGameState }

        this.pieces = {}; // Map "gridX,gridZ" or pieceId -> Three.js Object
        this.squares = [];
        this.selectedPieceMesh = null;

        this.initScene();
        this.initMaterials();
        this.initEnvironment();
        this.initBoard();
        this.initInteraction();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f7fa);
        this.scene.fog = new THREE.Fog(0xf5f7fa, 10, 50);

        this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 16, 16);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 30;
    }

    initMaterials() {
        // Dark Glass (Lighter Blue-Grey)
        this.darkPieceMat = new THREE.MeshPhysicalMaterial({
            color: 0x3a5a7a,
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.8,
            thickness: 1.5,
            ior: 1.5,
            clearcoat: 1.0,
            attenuationColor: new THREE.Color(0x557799),
            attenuationDistance: 3.0
        });

        // White Glass (Frosted/Clear)
        this.whitePieceMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.1,
            transmission: 0.9,
            thickness: 1.5,
            ior: 1.5,
            clearcoat: 1.0,
            attenuationColor: new THREE.Color(0xffffff),
            attenuationDistance: 5.0
        });

        this.glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0.1, roughness: 0.05, transmission: 0.9, thickness: 1.0, transparent: true, opacity: 1.0
        });

        this.darkBoardMat = new THREE.MeshPhysicalMaterial({
            color: 0x1e2b39, roughness: 0.2, metalness: 0.1, clearcoat: 0.5
        });

        this.whiteBoardMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, roughness: 0.1, metalness: 0.0, transmission: 0.05, thickness: 0.5
        });

        this.highlightMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
        this.selectRingMat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    }

    initEnvironment() {
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        const rimLight = new THREE.SpotLight(0x44aaff, 5);
        rimLight.position.set(-10, 5, -10);
        rimLight.lookAt(0, 0, 0);
        this.scene.add(rimLight);

        // Platform & Decor
        const mainGroup = new THREE.Group();
        this.scene.add(mainGroup);
        this.mainGroup = mainGroup;

        const platform = new THREE.Mesh(new THREE.CylinderGeometry(9, 8, 0.5, 64), this.glassMat);
        platform.position.y = -0.5;
        platform.receiveShadow = true;
        mainGroup.add(platform);

        const ring = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.05, 16, 100), new THREE.MeshBasicMaterial({ color: 0x00aaff }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.5;
        mainGroup.add(ring);

        // Decor
        this.decorGroup = new THREE.Group();
        const geoShape = new THREE.IcosahedronGeometry(0.3, 0);
        const geoMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.2, emissive: 0x0044aa, emissiveIntensity: 0.2 });
        for (let i = 0; i < 12; i++) {
            const mesh = new THREE.Mesh(geoShape, geoMat);
            const angle = (i / 12) * Math.PI * 2;
            const radius = 10;
            mesh.position.set(Math.cos(angle) * radius, Math.random() * 4 - 2, Math.sin(angle) * radius);
            this.decorGroup.add(mesh);
        }
        mainGroup.add(this.decorGroup);
    }

    initBoard() {
        this.boardGroup = new THREE.Group();
        this.mainGroup.add(this.boardGroup);

        this.squareSize = 1.4;
        this.boardSize = 8 * this.squareSize;
        this.offset = (this.boardSize - this.squareSize) / 2;

        for (let x = 0; x < 8; x++) {
            for (let z = 0; z < 8; z++) {
                const isDark = (x + z) % 2 === 1;
                const geometry = new THREE.BoxGeometry(this.squareSize * 0.95, 0.2, this.squareSize * 0.95);
                const material = isDark ? this.darkBoardMat : this.whiteBoardMat;
                const square = new THREE.Mesh(geometry, material);

                // Coordinate mapping: x=0 is 'a', z=0 is '1' (or '8' depending on orientation)
                // Let's stick to standard: x (0-7) -> a-h, z (0-7) -> 1-8
                // But in 3D, usually +z is towards camera.
                // Let's map: gridX (0-7) -> a-h, gridZ (0-7) -> 1-8

                square.userData = { type: 'square', gridX: x, gridZ: z };
                square.position.set(x * this.squareSize - this.offset, 0, z * this.squareSize - this.offset);
                square.receiveShadow = true;
                square.castShadow = true;
                this.boardGroup.add(square);
                this.squares.push(square);
            }
        }

        // Highlight Marker
        const markerGeo = new THREE.PlaneGeometry(this.squareSize, this.squareSize);
        markerGeo.rotateX(-Math.PI / 2);
        this.marker = new THREE.Mesh(markerGeo, this.highlightMat);
        this.marker.position.y = 0.11;
        this.marker.visible = false;
        this.boardGroup.add(this.marker);

        // Selection Ring
        this.selectRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32), this.selectRingMat);
        this.selectRing.rotation.x = -Math.PI / 2;
        this.selectRing.position.y = 0.12;
        this.selectRing.visible = false;
        this.boardGroup.add(this.selectRing);
    }

    createPieceMesh(type, color) {
        const group = new THREE.Group();
        const material = color === 'white' ? this.whitePieceMat : this.darkPieceMat;

        // Common Base
        const baseGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.15, 32);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.075;
        group.add(base);

        const addPart = (geometry, y, scale = 1) => {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = y;
            mesh.scale.setScalar(scale);
            group.add(mesh);
            return mesh;
        };

        if (type === 'pawn') {
            addPart(new THREE.CylinderGeometry(0.15, 0.35, 0.6, 16), 0.45);
            addPart(new THREE.TorusGeometry(0.15, 0.05, 16, 32), 0.75).rotation.x = Math.PI / 2;
            addPart(new THREE.SphereGeometry(0.25, 32, 32), 0.95);
        } else if (type === 'rook') {
            addPart(new THREE.CylinderGeometry(0.35, 0.4, 0.8, 32), 0.55);
            addPart(new THREE.CylinderGeometry(0.45, 0.35, 0.3, 32), 1.05);
            for (let i = 0; i < 4; i++) {
                const block = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), material);
                block.position.y = 1.25;
                const angle = (i / 4) * Math.PI * 2;
                block.position.x = Math.cos(angle) * 0.25;
                block.position.z = Math.sin(angle) * 0.25;
                group.add(block);
            }
        } else if (type === 'knight') {
            addPart(new THREE.CylinderGeometry(0.3, 0.4, 0.4, 32), 0.35);
            const shape = new THREE.Shape();
            shape.moveTo(0, 0); shape.lineTo(0.2, 0.1); shape.lineTo(0.25, 0.3);
            shape.lineTo(0.15, 0.5); shape.lineTo(0.1, 0.7); shape.lineTo(0, 0.6);
            shape.lineTo(-0.15, 0.4); shape.lineTo(-0.2, 0); shape.lineTo(0, 0);
            const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 };
            const headGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const head = new THREE.Mesh(headGeo, material);
            head.position.set(0, 0.55, -0.1);
            head.rotation.y = color === 'white' ? Math.PI / 2 : -Math.PI / 2;
            head.geometry.center();
            head.position.y = 0.9;
            group.add(head);
        } else if (type === 'bishop') {
            addPart(new THREE.CylinderGeometry(0.15, 0.35, 0.9, 32), 0.6);
            addPart(new THREE.TorusGeometry(0.2, 0.05, 16, 32), 1.05).rotation.x = Math.PI / 2;
            const head = addPart(new THREE.SphereGeometry(0.25, 32, 32), 1.25);
            head.scale.set(0.8, 1.2, 0.8);
            addPart(new THREE.SphereGeometry(0.08, 16, 16), 1.6);
        } else if (type === 'queen') {
            addPart(new THREE.CylinderGeometry(0.2, 0.4, 1.2, 32), 0.75);
            addPart(new THREE.TorusGeometry(0.25, 0.05, 16, 32), 1.35).rotation.x = Math.PI / 2;
            addPart(new THREE.CylinderGeometry(0.3, 0.15, 0.3, 16), 1.5);
            const points = addPart(new THREE.TorusGeometry(0.25, 0.05, 16, 6), 1.65);
            points.rotation.x = Math.PI / 2;
            addPart(new THREE.SphereGeometry(0.15, 32, 32), 1.7);
        } else if (type === 'king') {
            addPart(new THREE.CylinderGeometry(0.25, 0.45, 1.3, 32), 0.8);
            addPart(new THREE.TorusGeometry(0.25, 0.08, 16, 32), 1.45).rotation.x = Math.PI / 2;
            addPart(new THREE.CylinderGeometry(0.35, 0.2, 0.2, 32), 1.6);
            addPart(new THREE.BoxGeometry(0.1, 0.35, 0.1), 1.9);
            addPart(new THREE.BoxGeometry(0.3, 0.1, 0.1), 1.95);
        }

        group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        return group;
    }

    initInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer.domElement.addEventListener('pointermove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.squares);

            if (intersects.length > 0) {
                const hit = intersects[0].object;
                this.marker.position.x = hit.position.x;
                this.marker.position.z = hit.position.z;
                this.marker.visible = true;
            } else {
                this.marker.visible = false;
            }
        });

        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.boardGroup.children, true);

            let clickedPiece = null;
            let clickedSquare = null;

            for (let hit of intersects) {
                let obj = hit.object;
                while (obj.parent && obj.parent !== this.boardGroup) {
                    obj = obj.parent;
                }

                if (obj.userData.type === 'piece') {
                    clickedPiece = obj;
                    break;
                } else if (obj.userData.type === 'square') {
                    clickedSquare = obj;
                }
            }

            if (clickedPiece) {
                // Pass logic to game controller
                if (this.callbacks.onSelect) {
                    this.callbacks.onSelect(clickedPiece.userData.gridPos);
                }
            } else if (clickedSquare) {
                if (this.callbacks.onMove) {
                    const pos = this.gridToAlg(clickedSquare.userData.gridX, clickedSquare.userData.gridZ);
                    this.callbacks.onMove(pos);
                }
            }
        });
    }

    // Convert grid (0,0) to algebraic "a1"
    gridToAlg(x, z) {
        const file = String.fromCharCode('a'.charCodeAt(0) + x);
        const rank = 8 - z; // z=0 is top (rank 8), z=7 is bottom (rank 1)
        return file + rank;
    }

    // Convert "a1" to grid {x, z}
    algToGrid(pos) {
        const file = pos.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = parseInt(pos[1]);
        const z = 8 - rank;
        return { x: file, z: z };
    }

    // --- Public API ---

    updateBoard(boardState, playerColor) {
        // Clear existing pieces
        Object.values(this.pieces).forEach(p => this.boardGroup.remove(p));
        this.pieces = {};

        // Re-create pieces based on state
        for (const [pos, piece] of Object.entries(boardState)) {
            // Blind Chess Logic:
            // If it's my piece, show it.
            // If it's opponent's piece, ONLY show if revealed (not implemented in state yet?)
            // For now, let's assume standard visibility, but we can filter here.

            // NOTE: In Blind Chess, you usually don't see opponent pieces unless revealed.
            // But for now let's just render everything passed in 'boardState'.
            // The game logic should filter what 'boardState' is passed if needed, 
            // OR we handle visibility flags here.

            const { x, z } = this.algToGrid(pos);
            const mesh = this.createPieceMesh(piece.type, piece.color);

            mesh.position.x = x * this.squareSize - this.offset;
            mesh.position.z = z * this.squareSize - this.offset;
            mesh.userData = { type: 'piece', gridPos: pos, color: piece.color };

            this.boardGroup.add(mesh);
            this.pieces[pos] = mesh;
        }
    }

    highlightSquare(pos) {
        if (!pos) {
            this.selectRing.visible = false;
            return;
        }
        const { x, z } = this.algToGrid(pos);
        this.selectRing.position.x = x * this.squareSize - this.offset;
        this.selectRing.position.z = z * this.squareSize - this.offset;
        this.selectRing.visible = true;
    }

    animate() {
        requestAnimationFrame(this.animate);
        const time = performance.now() * 0.001;

        this.mainGroup.position.y = Math.sin(time * 0.5) * 0.2;
        this.decorGroup.rotation.y = time * 0.05;

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
