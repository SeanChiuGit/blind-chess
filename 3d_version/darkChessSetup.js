import { submitDarkChessSetup } from './firebase.js';
import { getPieceSymbol } from './game.js';

export const localGuesses = {};

function injectStyles() {
  const styleId = 'dark-chess-setup-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
        .setup-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(30, 43, 57, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            color: white;
            font-family: 'Inter', sans-serif;
        }
        .setup-board {
            border-collapse: collapse;
            margin: 20px;
            background: rgba(255, 255, 255, 0.1);
        }
        .setup-cell {
            width: 50px;
            height: 50px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            text-align: center;
            vertical-align: middle;
            font-size: 30px;
            user-select: none;
        }
        .setup-cell.dark {
            background: rgba(0, 0, 0, 0.2);
        }
        .setup-cell.light {
            background: rgba(255, 255, 255, 0.1);
        }
        .setup-cell.my-zone {
            background: rgba(0, 255, 0, 0.1);
            cursor: pointer;
        }
        .setup-cell.opponent-zone {
            background: rgba(255, 0, 0, 0.1);
            color: #aaa;
        }
        .piece-pool {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            max-width: 600px;
            margin: 10px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            min-height: 60px;
        }
        .pool-piece {
            font-size: 30px;
            margin: 5px;
            cursor: grab;
            transition: transform 0.2s;
        }
        .pool-piece:hover {
            transform: scale(1.2);
        }
        .setup-btn {
            padding: 10px 20px;
            margin: 10px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            background: #00aaff;
            color: white;
            font-weight: bold;
        }
        .setup-btn:hover {
            background: #0088cc;
        }
    `;
  document.head.appendChild(style);
}

export function enterDarkChessSetup(roomId, playerColor) {
  injectStyles();

  const board = {};
  const usedPieceIds = new Set();

  // Create Overlay
  const container = document.createElement("div");
  container.className = "setup-overlay";
  document.body.appendChild(container);

  const label = document.createElement("h2");
  label.innerText = `SETUP PHASE (${playerColor.toUpperCase()})`;
  container.appendChild(label);

  const subLabel = document.createElement("p");
  subLabel.innerText = "Drag and drop pieces to your side (Green). Opponent is Red.";
  container.appendChild(subLabel);

  // Determine Board Orientation
  // If White: Show 8 down to 1. My zone: 1, 2. Opponent: 7, 8.
  // If Black: Show 1 up to 8. My zone: 7, 8. Opponent: 1, 2.
  const rows = playerColor === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  const myRanks = playerColor === 'white' ? [1, 2] : [7, 8];
  const opponentRanks = playerColor === 'white' ? [7, 8] : [1, 2];

  const table = document.createElement("table");
  table.className = "setup-board";

  rows.forEach((r, rIndex) => {
    const tr = document.createElement("tr");
    files.forEach((f, fIndex) => {
      const pos = f + r;
      const td = document.createElement("td");
      td.className = "setup-cell";
      td.dataset.pos = pos;

      // Checkerboard pattern
      // Standard chess: a1 is black (dark). 
      // 'a' is 0, '1' is 1. (0+1)%2 != 0 -> Light? Wait.
      // a1 (0,0 if 0-indexed) is usually dark in Three.js logic (x+z)%2==1.
      // Let's stick to simple visual: (fIndex + r) % 2 === 1 ? dark : light
      const isDark = (fIndex + r) % 2 === 1;
      td.classList.add(isDark ? 'dark' : 'light');

      // Zones
      if (myRanks.includes(r)) {
        td.classList.add('my-zone');

        // Drag & Drop Logic
        td.ondragover = (e) => e.preventDefault();
        td.ondrop = (e) => {
          const pieceId = e.dataTransfer.getData("piece-id");
          const type = e.dataTransfer.getData("type");
          if (!pieceId) return;

          const existing = board[pos];
          if (existing) addPieceToPool(existing);

          board[pos] = { type, color: playerColor, id: pieceId };
          usedPieceIds.add(pieceId);
          updateBoardUI();
          removePieceFromPool(pieceId);
        };
        td.onclick = () => {
          const piece = board[pos];
          if (piece) {
            delete board[pos];
            addPieceToPool(piece);
            updateBoardUI();
          }
        };

      } else if (opponentRanks.includes(r)) {
        td.classList.add('opponent-zone');
        td.textContent = '?';
      }

      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.appendChild(table);

  // Piece Pool
  const piecePoolDiv = document.createElement("div");
  piecePoolDiv.className = "piece-pool";
  container.appendChild(piecePoolDiv);

  const pieceList = [
    "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
    "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn"
  ];

  const piecePool = {}; // id -> element

  pieceList.forEach((type, index) => {
    const id = `${playerColor}_${index}`;
    const span = document.createElement("span");
    span.className = "pool-piece";
    span.textContent = getPieceSymbol(type, playerColor);
    span.draggable = true;

    span.ondragstart = (e) => {
      e.dataTransfer.setData("piece-id", id);
      e.dataTransfer.setData("type", type);
    };

    piecePool[id] = span;
    piecePoolDiv.appendChild(span);
  });

  function removePieceFromPool(id) {
    const el = piecePool[id];
    if (el) el.remove();
  }

  function addPieceToPool(piece) {
    if (piece && !usedPieceIds.has(piece.id)) return;
    if (!piecePool[piece.id]) return;
    usedPieceIds.delete(piece.id);
    piecePoolDiv.appendChild(piecePool[piece.id]);
  }

  function updateBoardUI() {
    // Only update my zone
    for (const td of table.querySelectorAll(".my-zone")) {
      const pos = td.dataset.pos;
      td.textContent = board[pos] ? getPieceSymbol(board[pos].type, board[pos].color) : "";
    }
  }

  // Buttons
  const btnContainer = document.createElement("div");

  const randomBtn = document.createElement("button");
  randomBtn.textContent = "🎲 Randomize";
  randomBtn.className = "setup-btn";
  randomBtn.onclick = randomizeSetup;
  btnContainer.appendChild(randomBtn);

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "✅ Submit Setup";
  submitBtn.className = "setup-btn";
  submitBtn.onclick = () => {
    // Validate: Must place King? Or all pieces?
    // Let's require King at least.
    const hasKing = Object.values(board).some(p => p.type === 'king');
    if (!hasKing) {
      alert("You must place your King!");
      return;
    }

    submitDarkChessSetup(roomId, playerColor, board);
    container.innerHTML = "<h2>Waiting for opponent...</h2>";
    // Don't remove container yet, wait for game start
  };
  btnContainer.appendChild(submitBtn);

  container.appendChild(btnContainer);

  function randomizeSetup() {
    // Clear board
    Object.keys(board).forEach(pos => delete board[pos]);
    usedPieceIds.clear();
    piecePoolDiv.innerHTML = '';
    for (const id in piecePool) {
      piecePoolDiv.appendChild(piecePool[id]);
    }

    const emptyPositions = [];
    for (const r of myRanks) {
      for (const f of files) {
        emptyPositions.push(f + r);
      }
    }

    const shuffled = emptyPositions.sort(() => 0.5 - Math.random());

    pieceList.forEach((type, i) => {
      if (i < shuffled.length) {
        const pos = shuffled[i];
        const id = `${playerColor}_${i}`;
        board[pos] = { type, color: playerColor, id };
        usedPieceIds.add(id);
        removePieceFromPool(id);
      }
    });
    updateBoardUI();
  }
}

// Helper for Guess Menu (if needed later)
export function showGuessMenu() {
  // ... existing logic if needed ...
}