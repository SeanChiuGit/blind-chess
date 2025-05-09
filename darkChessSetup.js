import { submitDarkChessSetup } from './firebase.js';
import { getPieceSymbol } from './game.js';
import { renderBoard } from './game.js';

export const localGuesses = {};

export function enterDarkChessSetup(roomId, playerColor) {
  const board = {};
  const usedPieceIds = new Set();

  const container = document.createElement("div");
  container.className = `setup-container ${playerColor}`;
  container.innerHTML = `<h1>${playerColor.toUpperCase()} Setup</h1>`;
  document.body.appendChild(container);

  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = playerColor === "white" ? [1, 2] : [7, 8];
  const table = document.createElement("table");
  table.classList.add("setup-board");

  // ✅ 可选棋子池
  const piecePoolDiv = document.createElement("div");
  piecePoolDiv.classList.add("piece-pool");
  piecePoolDiv.innerHTML = "<p>拖动棋子到棋盘上：</p>";

  const pieceList = [
    "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
    "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn"
  ];

  const piecePool = {}; // id → element

  pieceList.forEach((type, index) => {
    const id = `${playerColor}_${index}`;
    const btn = document.createElement("span");
    btn.textContent = getPieceSymbol(type, playerColor);
    btn.classList.add("piece-option");
    btn.draggable = true;

    btn.ondragstart = (e) => {
      e.dataTransfer.setData("piece-id", id);
      e.dataTransfer.setData("type", type);

      const ghost = document.createElement("div");
      ghost.textContent = getPieceSymbol(type, playerColor);
      ghost.style.fontSize = "24px";
      ghost.style.padding = "5px";
      ghost.style.opacity = "0.8";
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 12, 12);
      setTimeout(() => document.body.removeChild(ghost), 0);
    };

    piecePool[id] = btn;
    piecePoolDiv.appendChild(btn);
  });

  const randomBtn = document.createElement("button");
  randomBtn.textContent = "🎲 随机布置";
  randomBtn.classList.add("setup-btn");
  randomBtn.onclick = () => {
    randomizeSetup();
  };

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "✅ 提交我的棋子布局";
  submitBtn.classList.add("setup-btn");
  submitBtn.onclick = () => {
    submitDarkChessSetup(roomId, playerColor, board);
    alert("已提交！");
    container.remove();
  };

  // ✅ 控制显示顺序
  if (playerColor === "black") {
    container.appendChild(piecePoolDiv);
    container.appendChild(randomBtn);
    container.appendChild(submitBtn);
    container.appendChild(table);
  } else {
    container.appendChild(table);
    container.appendChild(piecePoolDiv);
    container.appendChild(randomBtn);
    container.appendChild(submitBtn);
  }

  // 渲染棋盘格
  for (let r of ranks.slice().reverse()) {
    const row = document.createElement("tr");
    for (let f = 0; f < 8; f++) {
      const pos = files[f] + r;
      const cell = document.createElement("td");
      cell.dataset.pos = pos;
      cell.classList.add("setup-cell");

      cell.ondragover = (e) => e.preventDefault();
      cell.ondrop = (e) => {
        const pieceId = e.dataTransfer.getData("piece-id");
        const type = e.dataTransfer.getData("type");

        const existing = board[pos];
        if (existing) addPieceToPool(existing);

        board[pos] = { type, color: playerColor, id: pieceId };
        usedPieceIds.add(pieceId);
        updateBoardUI();
        removePieceFromPool(pieceId);
      };

      cell.onclick = () => {
        const piece = board[pos];
        if (piece) {
          delete board[pos];
          addPieceToPool(piece);
          updateBoardUI();
        }
      };

      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  function removePieceFromPool(id) {
    const el = piecePool[id];
    if (el && el.parentElement) el.parentElement.removeChild(el);
  }

  function addPieceToPool(piece) {
    if (piece && !usedPieceIds.has(piece.id)) return;
    if (!piecePool[piece.id]) return;
    usedPieceIds.delete(piece.id);
    piecePoolDiv.appendChild(piecePool[piece.id]);
  }

  function updateBoardUI() {
    for (const td of table.querySelectorAll("td")) {
      const pos = td.dataset.pos;
      td.textContent = board[pos] ? getPieceSymbol(board[pos].type, board[pos].color) : "";
    }
  }

  function randomizeSetup() {
    Object.keys(board).forEach(pos => delete board[pos]);
    usedPieceIds.clear();
    for (const id in piecePool) {
      piecePoolDiv.appendChild(piecePool[id]);
    }

    const emptyPositions = [];
    for (const r of ranks) {
      for (let f = 0; f < 8; f++) {
        emptyPositions.push(files[f] + r);
      }
    }

    const shuffled = shuffleArray(emptyPositions).slice(0, 16);
    pieceList.forEach((type, i) => {
      const pos = shuffled[i];
      const id = `${playerColor}_${i}`;
      board[pos] = { type, color: playerColor, id };
      usedPieceIds.add(id);
      removePieceFromPool(id);
    });

    updateBoardUI();
  }
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function showGuessMenu(pieceId, board, currentColor, hiddenOpponent, lastMove) {
  const existing = document.getElementById("guessMenu");
  if (existing) existing.remove();

  const pos = Object.keys(board).find(p => board[p].id === pieceId);
  if (!pos) return;

  const menu = document.createElement("div");
  menu.id = "guessMenu";
  menu.dataset.pieceId = pieceId;
  menu.style.position = "absolute";
  menu.style.background = "#fff";
  menu.style.border = "1px solid black";
  menu.style.padding = "5px";
  menu.style.zIndex = 100;

  const targetCell = document.querySelector(`[data-pos="${pos}"]`);
  const rect = targetCell.getBoundingClientRect();
  menu.style.left = rect.right + "px";
  menu.style.top = rect.top + "px";

  const opponentColor = currentColor === "white" ? "black" : "white";
  const pieceTypes = ["pawn", "rook", "knight", "bishop", "queen", "king"];
  pieceTypes.forEach(type => {
    const btn = document.createElement("button");
    btn.textContent = getPieceSymbol(type, opponentColor);
    btn.style.margin = "2px";
    btn.onclick = () => {
      localGuesses[pieceId] = type;
      menu.remove();
      renderBoard(board, currentColor, null, hiddenOpponent, lastMove);
    };
    menu.appendChild(btn);
  });

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "？";
  clearBtn.style.margin = "2px";
  clearBtn.onclick = () => {
    delete localGuesses[pieceId];
    menu.remove();
    renderBoard(board, currentColor, null, hiddenOpponent, lastMove);
  };
  menu.appendChild(clearBtn);

  document.body.appendChild(menu);
}
