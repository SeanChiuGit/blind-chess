import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import TWEEN from 'https://unpkg.com/@tweenjs/tween.js@23.1.2/dist/tween.esm.js';

// Import Game Logic
import { initFirebase, createOrJoinRoom, sendState, assignPlayerColor, onStateChange, submitPlayerModeChoice, onBothModesSelectedAndMatched, onBothKingsSelected, onBothSetupsReady } from './firebase.js';
import { initGame, getGameState, applyGameState, checkGameOver, turn, playerColor } from './game.js';
import { checkVictoryCondition } from './rules.js';
import { enterDarkChessSetup } from './darkChessSetup.js';
import { selectKing } from './hiddenking.js';

// --- Global Variables ---
let scene, camera, renderer, cssRenderer;
let controls;
let mainGroup, boardGroup, decorGroup;
const pieces = []; // 3D Piece Objects
const squares = []; // 3D Square Objects
let selectedPiece = null;
let myTurn = false;
let currentTurnColor = 'white';
let gameMode = null;
let roomId = null;
let myColor = null;

// --- Materials ---
const darkPieceMat = new THREE.MeshPhysicalMaterial({
    color: 0x3a5a7a, metalness: 0.1, roughness: 0.05, transmission: 0.8, thickness: 1.5, ior: 1.5, clearcoat: 1.0
});
const whitePieceMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0.1, roughness: 0.1, transmission: 0.9, thickness: 1.5, ior: 1.5, clearcoat: 1.0
});
const darkBoardMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e2b39, roughness: 0.2, metalness: 0.1, clearcoat: 0.5
});
const whiteBoardMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.1, metalness: 0.0, transmission: 0.05, thickness: 0.5
});
const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0.1, roughness: 0.05, transmission: 0.9, thickness: 1.0, transparent: true, opacity: 1.0
});

// --- Debug Logger ---
function logToScreen(msg, type = 'info') {
    const consoleDiv = document.getElementById('debug-console');
    if (consoleDiv) {
        const span = document.createElement('div');
        span.style.color = type === 'error' ? '#ff5555' : '#55ff55';
        span.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        consoleDiv.appendChild(span);
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }
}
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => { originalLog(...args); logToScreen(args.join(' ')); };
console.error = (...args) => { originalError(...args); logToScreen(args.join(' '), 'error'); };

// --- Initialization ---
init();
animate();

function init() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f7fa);
    scene.fog = new THREE.Fog(0xf5f7fa, 10, 50);

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 12, 18); // Initial view for menu
    camera.lookAt(0, 0, 0);

    // 2. Renderers
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.zIndex = '0';
    document.body.appendChild(renderer.domElement);

    cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.zIndex = '1'; // On top for interaction
    document.getElementById('css-container').appendChild(cssRenderer.domElement);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 4. Controls
    // Attach to renderer.domElement to allow dragging the scene.
    // CSS3D elements will still be clickable because they are 'on top' and have pointer-events: auto.
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    // 5. Build World
    buildBoard();
    create3DUI();

    // 6. Firebase Init
    initFirebase();

    // 7. Event Listeners
    window.addEventListener('resize', onWindowResize);
}

// --- 3D UI Construction ---
function create3DUI() {
    const div = document.createElement('div');
    div.style.width = '400px';
    div.style.padding = '20px';
    div.style.background = 'rgba(30, 43, 57, 0.85)';
    div.style.backdropFilter = 'blur(10px)';
    div.style.borderRadius = '15px';
    div.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    div.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    div.style.textAlign = 'center';
    div.style.color = 'white';
    div.style.fontFamily = "'Inter', sans-serif";
    div.style.pointerEvents = 'auto'; // Ensure clickable

    div.innerHTML = `
        <h1 style="margin: 0 0 20px 0; font-weight: 300; letter-spacing: 2px;">BLIND CHESS 3D</h1>
        <input id="roomInput" type="text" placeholder="Enter Room ID" style="
            width: 80%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: none; outline: none; background: rgba(255,255,255,0.9); color: #333;">
        <br>
        <button id="joinBtn" style="
            padding: 10px 30px; background: #00aaff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s;">
            JOIN ROOM
        </button>
        <p id="status" style="margin-top: 15px; font-size: 0.9em; color: #aaa;">Ready to connect...</p>
    `;

    const object = new CSS3DObject(div);
    object.position.set(0, 5, -2); // Floating above/behind the board
    object.rotation.x = -0.1;
    object.scale.set(0.02, 0.02, 0.02);
    scene.add(object);

    // Attach Logic
    const btn = div.querySelector('#joinBtn');
    const input = div.querySelector('#roomInput');
    const status = div.querySelector('#status');

    // Add Enter key support
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            btn.click();
        }
    });

    const handleJoin = async () => {
        const rId = input.value.trim();
        try {
            if (!rId) {
                status.innerText = "Please enter a Room ID.";
                return;
            }
            status.innerText = `Connecting to ${rId}...`;
            console.log(`Attempting to join room: ${rId}`);

            const result = await assignPlayerColor(rId);
            console.log("Assign result:", result);

            if (!result) {
                status.innerText = "Room is full.";
                return;
            }

            roomId = rId;
            myColor = result.color;
            const slot = result.slot;
            status.innerText = `Joined as ${myColor} (${slot})`;

            // Animate UI away
            new TWEEN.Tween(object.position)
                .to({ y: 15, z: -10 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
            new TWEEN.Tween(div.style)
                .to({ opacity: 0 }, 1000)
                .onComplete(() => scene.remove(object))
                .start();

            // Move Camera to Game Position
            const targetPos = myColor === 'white' ? { x: 0, y: 10, z: 12 } : { x: 0, y: 10, z: -12 };
            new TWEEN.Tween(camera.position)
                .to(targetPos, 1500)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();

            // Start Game Logic
            startGameFlow(roomId, slot, myColor);

        } catch (error) {
            console.error("Join Error:", error);
            status.innerText = "Error: " + error.message;
        }
    };

    btn.addEventListener('click', handleJoin);
}

function show3DModeSelection(roomId, slot) {
    const div = document.createElement('div');
    div.style.width = '400px';
    div.style.padding = '20px';
    div.style.background = 'rgba(30, 43, 57, 0.85)';
    div.style.backdropFilter = 'blur(10px)';
    div.style.borderRadius = '15px';
    div.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    div.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    div.style.textAlign = 'center';
    div.style.color = 'white';
    div.style.fontFamily = "'Inter', sans-serif";
    div.style.pointerEvents = 'auto';

    div.innerHTML = `
        <h2 style="margin: 0 0 20px 0; font-weight: 300;">SELECT GAME MODE</h2>
        <button id="btnClassic" style="
            width: 100%; padding: 12px; margin-bottom: 10px; background: #00aaff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
            CLASSIC CHESS
        </button>
        <button id="btnBlind" style="
            width: 100%; padding: 12px; margin-bottom: 10px; background: #aa00ff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
            BLIND CHESS (Hidden)
        </button>
    `;

    const object = new CSS3DObject(div);
    object.position.set(0, 2, 0);
    object.scale.set(0.02, 0.02, 0.02);
    object.rotation.y = myColor === 'white' ? 0 : Math.PI;

    scene.add(object);

    const btnClassic = div.querySelector('#btnClassic');
    const btnBlind = div.querySelector('#btnBlind');

    const selectMode = (mode) => {
        submitPlayerModeChoice(roomId, slot, mode);
        // Animate away
        new TWEEN.Tween(object.scale)
            .to({ x: 0, y: 0, z: 0 }, 500)
            .onComplete(() => scene.remove(object))
            .start();
    };

    btnClassic.onclick = () => selectMode('classic');
    btnBlind.onclick = () => selectMode('blind_chess');
}

// --- Game Flow Logic ---
function startGameFlow(roomId, slot, color) {
    createOrJoinRoom(roomId, (roomData) => { });

    // Check for Mode Selection
    firebase.database().ref(`rooms/${roomId}/selections/${slot}`).once("value").then(snapshot => {
        if (!snapshot.exists()) {
            show3DModeSelection(roomId, slot);
        }
    });

    onBothModesSelectedAndMatched(roomId, (mode) => {
        gameMode = mode;
        console.log("Game Mode:", mode);
        initGame(color);

        if (mode === 'classic') {
            startClassicGame();
        } else if (mode === 'blind_chess') {
            startBlindGame();
        }
    });
}

function startClassicGame() {
    // Initial Render
    update3DBoard(getGameState().board);

    if (myColor === 'white') {
        sendState(getGameState());
    }

    onStateChange((remoteState) => {
        const gameState = remoteState?.game;
        if (!gameState || !gameState.board) return;

        applyGameState(gameState);
        myTurn = gameState.turn === myColor;
        update3DBoard(gameState.board);
    });
}

function startBlindGame() {
    // Placeholder for Blind Logic
    console.log("Starting Blind Chess Logic...");
}

// --- 3D Board Construction ---
function buildBoard() {
    mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Platform
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(9, 8, 0.5, 64), glassMat);
    platform.position.y = -0.5;
    platform.receiveShadow = true;
    mainGroup.add(platform);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.05, 16, 100), new THREE.MeshBasicMaterial({ color: 0x00aaff }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.5;
    mainGroup.add(ring);

    // Board Squares
    boardGroup = new THREE.Group();
    const squareSize = 1.4;
    const boardSize = 8 * squareSize;
    const offset = (boardSize - squareSize) / 2;

    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const isDark = (x + z) % 2 === 1;
            const geometry = new THREE.BoxGeometry(squareSize * 0.95, 0.2, squareSize * 0.95);
            const material = isDark ? darkBoardMat : whiteBoardMat;
            const square = new THREE.Mesh(geometry, material);
            square.position.set(x * squareSize - offset, 0, z * squareSize - offset);
            square.receiveShadow = true;
            square.castShadow = true;
            square.userData = { type: 'square', gridX: x, gridZ: z };
            boardGroup.add(square);
            squares.push(square);
        }
    }
    mainGroup.add(boardGroup);
}

// --- 3D Board Updates ---
function update3DBoard(boardState) {
    // Clear existing pieces
    pieces.forEach(p => boardGroup.remove(p));
    pieces.length = 0;

    const squareSize = 1.4;
    const boardSize = 8 * squareSize;
    const offset = (boardSize - squareSize) / 2;

    // Iterate board state (8x8 array)
    for (let z = 0; z < 8; z++) {
        for (let x = 0; x < 8; x++) {
            const pieceData = boardState[z][x];
            if (pieceData) {
                const pieceObj = createPiece(pieceData.type, pieceData.color);
                const worldX = x * squareSize - offset;
                const worldZ = z * squareSize - offset;
                pieceObj.position.set(worldX, 0.1, worldZ);
                boardGroup.add(pieceObj);
                pieces.push(pieceObj);
            }
        }
    }
}

function createPiece(type, color) {
    // Reuse the piece creation logic from demo
    // Simplified for brevity, assume standard shapes
    const group = new THREE.Group();
    const material = color === 'white' ? whitePieceMat : darkPieceMat;

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.1, 32), material);
    base.position.y = 0.05;
    group.add(base);

    // Simple representation for now
    let geo;
    if (type === 'pawn') geo = new THREE.SphereGeometry(0.3, 32, 32);
    else if (type === 'rook') geo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
    else if (type === 'knight') geo = new THREE.ConeGeometry(0.3, 0.8, 32);
    else if (type === 'bishop') geo = new THREE.CylinderGeometry(0.1, 0.3, 0.9, 32);
    else if (type === 'queen') geo = new THREE.TorusKnotGeometry(0.2, 0.05, 64, 8);
    else if (type === 'king') geo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 32);

    if (geo) {
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.y = 0.5;
        group.add(mesh);
    }

    return group;
}

// --- Animation & Resize ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
}
