import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import TWEEN from 'https://unpkg.com/@tweenjs/tween.js@23.1.2/dist/tween.esm.js';

// Import Game Logic
import { initFirebase, createOrJoinRoom, sendState, assignPlayerColor, onStateChange, submitPlayerModeChoice, onBothModesSelectedAndMatched, onBothKingsSelected, onBothSetupsReady } from './firebase.js';
import { initGame, getGameState, applyGameState, turn, playerColor, setBoard, movePiece } from './game.js';
import { checkVictoryCondition, getValidMoves } from './rules.js';
import { enterDarkChessSetup, localGuesses } from './darkChessSetup.js';
import { selectKing } from './hiddenking.js';

// --- Global Variables ---
let scene, camera, renderer, cssRenderer;
let controls;
let mainGroup, boardGroup, decorGroup;
const pieces = []; // 3D Piece Objects
const squares = []; // 3D Square Objects
let selectedPiece = null;
let validMoves = [];
let lastMoveStart = null;
let lastMoveEnd = null;
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
    window.addEventListener('click', onMouseClick);
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
    div.style.pointerEvents = 'none'; // Allow clicks to pass through background

    div.innerHTML = `
        <h1 style="margin: 0 0 20px 0; font-weight: 300; letter-spacing: 2px;">BLIND CHESS 3D</h1>
        <input id="roomInput" type="text" placeholder="Enter Room ID" style="
            width: 80%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: none; outline: none; background: rgba(255,255,255,0.9); color: #333; pointer-events: auto;">
        <br>
        <button id="joinBtn" style="
            padding: 10px 30px; background: #00aaff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; pointer-events: auto;">
            JOIN ROOM
        </button>
        <p id="status" style="margin-top: 15px; font-size: 0.9em; color: #aaa;">Ready to connect...</p>
    `;

    const object = new CSS3DObject(div);
    object.position.set(0, 5, -2); // Floating above/behind the board
    object.rotation.x = -0.1;
    object.scale.set(0.02, 0.02, 0.02);
    scene.add(object);

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
    div.style.pointerEvents = 'none';

    div.innerHTML = `
        <h2 style="margin: 0 0 20px 0; font-weight: 300;">SELECT GAME MODE</h2>
        <button id="btnClassic" style="
            width: 100%; padding: 12px; margin-bottom: 10px; background: #00aaff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; pointer-events: auto;">
            CLASSIC CHESS
        </button>
        <button id="btnBlind" style="
            width: 100%; padding: 12px; margin-bottom: 10px; background: #aa00ff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; pointer-events: auto;">
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
    console.log("Starting Blind Chess Setup...");
    enterDarkChessSetup(roomId, myColor);

    onBothSetupsReady(roomId, (setups) => {
        console.log("Both setups ready!", setups);

        // Remove setup UI
        const setupOverlay = document.querySelector('.setup-overlay');
        if (setupOverlay) setupOverlay.remove();
        const style = document.getElementById('dark-chess-setup-styles');
        if (style) style.remove();

        // Merge setups
        const initialBoard = { ...setups.white, ...setups.black };

        // Initialize game
        setBoard(initialBoard);

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
    });
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
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    // Iterate board state (Object: "e2" -> piece)
    for (let z = 0; z < 8; z++) {
        for (let x = 0; x < 8; x++) {
            // Convert grid to algebraic
            // z=0 -> rank 8, z=7 -> rank 1
            const rank = 8 - z;
            const file = files[x];
            const pos = file + rank;

            const pieceData = boardState[pos];

            if (pieceData) {
                let renderType = pieceData.type;
                const isOpponent = pieceData.color !== myColor;

                // Blind Chess Logic
                if (gameMode === 'blind_chess' && isOpponent) {
                    const guess = localGuesses[pieceData.id];
                    if (guess) {
                        renderType = guess;
                    } else {
                        renderType = 'hidden';
                    }
                }

                const pieceObj = createPiece(renderType, pieceData.color);
                const worldX = x * squareSize - offset;
                const worldZ = z * squareSize - offset;
                pieceObj.position.set(worldX, 0.1, worldZ);

                // Store metadata for interaction
                pieceObj.userData = {
                    id: pieceData.id,
                    type: 'piece',
                    realType: pieceData.type,
                    renderType: renderType,
                    color: pieceData.color
                };

                boardGroup.add(pieceObj);
                pieces.push(pieceObj);
            }
        }
    }

    // Highlight Last Move
    if (getGameState().lastMove) {
        const { from, to } = getGameState().lastMove;
        highlightSquare(from, 0xaaaa00, 0.5); // Yellowish for start
        highlightSquare(to, 0xffff00, 0.5);   // Bright yellow for end
    }
}

function highlightSquare(pos, colorHex, opacity = 0.5) {
    // Convert algebraic to grid
    const file = pos.charAt(0);
    const rank = parseInt(pos.charAt(1));
    const x = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].indexOf(file);
    const z = 8 - rank;

    const square = squares.find(s => s.userData.gridX === x && s.userData.gridZ === z);
    if (square) {
        const highlight = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.25, 1.4),
            new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: opacity })
        );
        highlight.position.copy(square.position);
        highlight.position.y = 0.05; // Slightly above board
        highlight.userData.isHighlight = true;
        boardGroup.add(highlight);
    }
}

function clearHighlights() {
    for (let i = boardGroup.children.length - 1; i >= 0; i--) {
        if (boardGroup.children[i].userData.isHighlight) {
            boardGroup.remove(boardGroup.children[i]);
        }
    }
}

// --- Detailed Piece Generation ---
function createQuestionMark(color) {
    const group = new THREE.Group();
    // Use the opponent's color for the question mark, or a specific "mystery" color blended with it
    const baseColor = color === 'white' ? 0xffffff : 0x3a5a7a;

    const material = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.6,
        thickness: 1.5,
        ior: 1.5,
        clearcoat: 1.0,
        transparent: true,
        opacity: 0.8,
        emissive: baseColor,
        emissiveIntensity: 0.2
    });

    // Top Curve (Torus segment)
    const curve = new THREE.TorusGeometry(0.3, 0.1, 16, 32, Math.PI * 1.5);
    const curveMesh = new THREE.Mesh(curve, material);
    curveMesh.rotation.z = Math.PI / 4;
    curveMesh.position.set(0, 0.8, 0);
    group.add(curveMesh);

    // Vertical Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.4, 16), material);
    stem.position.set(0, 0.5, 0);
    group.add(stem);

    // Dot
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), material);
    dot.position.set(0, 0.15, 0);
    group.add(dot);

    // Floating Animation Helper
    group.userData.isFloating = true;

    return group;
}

function createPiece(type, color) {
    if (type === 'hidden') {
        return createQuestionMark(color);
    }

    const group = new THREE.Group();
    const material = color === 'white' ? whitePieceMat : darkPieceMat;

    // Common Base for all pieces
    const baseGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.15, 32);
    const base = new THREE.Mesh(baseGeo, material);
    base.position.y = 0.075;
    group.add(base);

    // Helper to add parts
    function addPart(geometry, y, scale = 1) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = y;
        mesh.scale.setScalar(scale);
        group.add(mesh);
        return mesh;
    }

    if (type === 'pawn') {
        // Tapered body
        addPart(new THREE.CylinderGeometry(0.15, 0.35, 0.6, 16), 0.45);
        // Collar
        addPart(new THREE.TorusGeometry(0.15, 0.05, 16, 32), 0.75).rotation.x = Math.PI / 2;
        // Head
        addPart(new THREE.SphereGeometry(0.25, 32, 32), 0.95);

    } else if (type === 'rook') {
        // Column
        addPart(new THREE.CylinderGeometry(0.35, 0.4, 0.8, 32), 0.55);
        // Top rim
        addPart(new THREE.CylinderGeometry(0.45, 0.35, 0.3, 32), 1.05);
        // Crenellations (4 blocks)
        for (let i = 0; i < 4; i++) {
            const block = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), material);
            block.position.y = 1.25;
            const angle = (i / 4) * Math.PI * 2;
            block.position.x = Math.cos(angle) * 0.25;
            block.position.z = Math.sin(angle) * 0.25;
            group.add(block);
        }

    } else if (type === 'knight') {
        // Base stand
        addPart(new THREE.CylinderGeometry(0.3, 0.4, 0.4, 32), 0.35);

        // Horse Head Shape (Extruded)
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.2, 0.1); // nose bottom
        shape.lineTo(0.25, 0.3); // nose tip
        shape.lineTo(0.15, 0.5); // forehead
        shape.lineTo(0.1, 0.7); // ear tip
        shape.lineTo(0, 0.6); // ear base
        shape.lineTo(-0.15, 0.4); // neck back
        shape.lineTo(-0.2, 0); // neck base
        shape.lineTo(0, 0);

        const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 };
        const headGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const head = new THREE.Mesh(headGeo, material);
        head.position.set(0, 0.55, -0.1);
        head.rotation.y = color === 'white' ? Math.PI / 2 : -Math.PI / 2; // Face opponent
        // Center the extrusion
        head.geometry.center();
        // Adjust position after centering
        head.position.y = 0.9;
        group.add(head);

    } else if (type === 'bishop') {
        // Tall body
        addPart(new THREE.CylinderGeometry(0.15, 0.35, 0.9, 32), 0.6);
        // Collar
        addPart(new THREE.TorusGeometry(0.2, 0.05, 16, 32), 1.05).rotation.x = Math.PI / 2;
        // Mitre Head
        const head = addPart(new THREE.SphereGeometry(0.25, 32, 32), 1.25);
        head.scale.set(0.8, 1.2, 0.8);
        // Small ball on top
        addPart(new THREE.SphereGeometry(0.08, 16, 16), 1.6);

    } else if (type === 'queen') {
        // Body
        addPart(new THREE.CylinderGeometry(0.2, 0.4, 1.2, 32), 0.75);
        // Collar
        addPart(new THREE.TorusGeometry(0.25, 0.05, 16, 32), 1.35).rotation.x = Math.PI / 2;
        // Crown
        const crown = addPart(new THREE.CylinderGeometry(0.3, 0.15, 0.3, 16), 1.5);
        // Crown points
        const points = addPart(new THREE.TorusGeometry(0.25, 0.05, 16, 6), 1.65);
        points.rotation.x = Math.PI / 2;
        // Top ball
        addPart(new THREE.SphereGeometry(0.15, 32, 32), 1.7);

    } else if (type === 'king') {
        // Body
        addPart(new THREE.CylinderGeometry(0.25, 0.45, 1.3, 32), 0.8);
        // Collar
        addPart(new THREE.TorusGeometry(0.25, 0.08, 16, 32), 1.45).rotation.x = Math.PI / 2;
        // Top Flare
        addPart(new THREE.CylinderGeometry(0.35, 0.2, 0.2, 32), 1.6);
        // Cross
        const v = addPart(new THREE.BoxGeometry(0.1, 0.35, 0.1), 1.9);
        const h = addPart(new THREE.BoxGeometry(0.3, 0.1, 0.1), 1.95);
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

    return group;
}

// --- Interaction Logic ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boardGroup.children, true);

    let clickedPiece = null;

    for (let hit of intersects) {
        let obj = hit.object;
        while (obj.parent && obj.parent !== boardGroup) {
            obj = obj.parent;
        }

        if (obj.userData.type === 'piece') {
            clickedPiece = obj;
            break;
        }
    }

    if (clickedPiece) {
        // 1. Handle Guessing (Opponent Hidden Pieces)
        if (clickedPiece.userData.renderType === 'hidden' || (clickedPiece.userData.color !== myColor && gameMode === 'blind_chess')) {
            showGuessMenu3D(clickedPiece, event.clientX, event.clientY);
            return;
        }

        // 2. Handle Selection (My Pieces)
        if (clickedPiece.userData.color === myColor && myTurn) {
            // Select Piece
            selectedPiece = clickedPiece;
            clearHighlights();
            highlightSquare(getPosFromObj(selectedPiece), 0x00ff00); // Green for selected

            // Calculate Valid Moves
            const moves = getValidMoves(getPosFromObj(selectedPiece), { type: selectedPiece.userData.realType, color: selectedPiece.userData.color }, getGameState().board);
            moves.forEach(pos => {
                highlightSquare(pos, 0x0000ff, 0.3); // Blue for valid moves
            });

            return;
        }

        // 3. Handle Capture (Clicking opponent piece to capture)
        if (selectedPiece && clickedPiece.userData.color !== myColor && myTurn) {
            const from = getPosFromObj(selectedPiece);
            const to = getPosFromObj(clickedPiece);
            attemptMove(from, to);
            return;
        }
    }

    // 4. Handle Move to Empty Square
    // Raycast for squares
    const squareIntersects = raycaster.intersectObjects(squares, true);
    if (squareIntersects.length > 0 && selectedPiece && myTurn) {
        const squareObj = squareIntersects[0].object;
        const from = getPosFromObj(selectedPiece);
        const to = getPosFromSquare(squareObj);

        // Don't move to self
        if (from !== to) {
            attemptMove(from, to);
        }
    }
}

function getPosFromObj(pieceObj) {
    // Reverse engineer position from 3D coordinates or use stored ID if it maps to pos
    // But pieces move, so grid coords are better.
    // Actually, we can just find the closest square.
    const x = Math.round((pieceObj.position.x + 4.9) / 1.4);
    const z = Math.round((pieceObj.position.z + 4.9) / 1.4);
    // Wait, let's use the logic from update3DBoard reversed:
    // worldX = x * 1.4 - 4.9
    // x = (worldX + 4.9) / 1.4
    const gridX = Math.round((pieceObj.position.x + 4.9) / 1.4);
    const gridZ = Math.round((pieceObj.position.z + 4.9) / 1.4);

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const file = files[gridX];
    const rank = 8 - gridZ;
    return file + rank;
}

function getPosFromSquare(squareObj) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const file = files[squareObj.userData.gridX];
    const rank = 8 - squareObj.userData.gridZ;
    return file + rank;
}

function attemptMove(from, to) {
    const result = movePiece(from, to);
    if (result) {
        // Move successful locally
        selectedPiece = null;
        clearHighlights();

        // Update Board
        update3DBoard(getGameState().board);

        // Send State
        sendState(getGameState());

        // Check Game Over
        const gameOver = checkVictoryCondition(getGameState().board, gameMode);
        if (gameOver) {
            alert("Game Over! Winner: " + gameOver);
        }
    } else {
        console.log("Invalid Move");
        // Optional: Shake piece or show error
    }
}

function showGuessMenu3D(pieceObj, x, y) {
    // Remove existing menu
    const existing = document.getElementById('guess-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'guess-menu';
    menu.style.position = 'absolute';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.background = 'rgba(30, 43, 57, 0.95)';
    menu.style.padding = '15px';
    menu.style.borderRadius = '12px';
    menu.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    menu.style.display = 'grid';
    menu.style.gridTemplateColumns = 'repeat(3, 1fr)';
    menu.style.gap = '8px';
    menu.style.zIndex = '1000';
    menu.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    menu.style.backdropFilter = 'blur(10px)';

    const options = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

    options.forEach(type => {
        const btn = document.createElement('button');
        // Simple text for now, could be icons
        btn.innerText = type.charAt(0).toUpperCase() + type.slice(1);
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
        btn.style.color = 'white';
        btn.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        btn.style.padding = '8px';
        btn.style.cursor = 'pointer';
        btn.style.borderRadius = '6px';
        btn.style.fontFamily = "'Inter', sans-serif";
        btn.style.transition = 'background 0.2s';

        btn.onmouseover = () => btn.style.background = 'rgba(255, 255, 255, 0.2)';
        btn.onmouseout = () => btn.style.background = 'rgba(255, 255, 255, 0.1)';

        btn.onclick = () => {
            localGuesses[pieceObj.userData.id] = type;
            menu.remove();
            // Refresh board to show the guess
            update3DBoard(getGameState().board);
        };
        menu.appendChild(btn);
    });

    // Clear Guess Button
    const clearBtn = document.createElement('button');
    clearBtn.innerText = 'Clear Guess';
    clearBtn.style.gridColumn = '1 / -1';
    clearBtn.style.background = 'rgba(255, 100, 100, 0.2)';
    clearBtn.style.color = '#ffaaaa';
    clearBtn.style.border = '1px solid rgba(255, 100, 100, 0.3)';
    clearBtn.style.padding = '8px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.style.borderRadius = '6px';
    clearBtn.style.marginTop = '5px';

    clearBtn.onclick = () => {
        delete localGuesses[pieceObj.userData.id];
        menu.remove();
        update3DBoard(getGameState().board);
    };
    menu.appendChild(clearBtn);

    // Close on click outside
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                window.removeEventListener('click', closeHandler);
            }
        };
        window.addEventListener('click', closeHandler);
    }, 100);

    document.body.appendChild(menu);
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

    // Animate Floating Question Marks
    const time = Date.now() * 0.001;
    pieces.forEach(p => {
        if (p.userData.renderType === 'hidden') {
            p.position.y = 0.1 + Math.sin(time * 2 + p.position.x) * 0.05;
            p.rotation.y = time;
        }
    });

    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
}
