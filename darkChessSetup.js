import { submitDarkChessSetup } from './firebase.js';
import { getPieceSymbol } from './game.js'; // 假设你有一个函数来获取棋子符号
import { renderBoard } from './game.js'; // 假设你有一个函数来渲染棋盘

export const localGuesses = {};

export function enterDarkChessSetup(roomId, playerColor) {
  const board = {};
  const usedPieceIds = new Set();
  const container = document.createElement("div");
  container.className = `setup-container ${playerColor}`;

  const label = document.createElement("h3");
  label.innerText = `${playerColor.toUpperCase()} 自由布子`;
  label.className = "setup-title";

  container.className = `setup-container ${playerColor}`;

  document.body.appendChild(container);

  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = playerColor === "white" ? [1, 2] : [7, 8];
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";

  // 渲染棋盘格
  for (let r of ranks.slice().reverse()) {
    const row = document.createElement("tr");
    for (let f = 0; f < 8; f++) {
      const pos = files[f] + r;
      const cell = document.createElement("td");
      cell.dataset.pos = pos;
      
      
      cell.style.textAlign = "center";
      cell.style.verticalAlign = "middle";
      cell.style.cursor = "pointer";
      cell.classList.add("setup-cell"); // ✅ 添加这一行

      cell.ondragover = (e) => e.preventDefault();
      cell.ondrop = (e) => {
        const pieceId = e.dataTransfer.getData("piece-id");
        const type = e.dataTransfer.getData("type");

        // 如果已有棋子 → 替换（把之前的还回去）
        const existing = board[pos];
        if (existing) {
          addPieceToPool(existing); // 放回
        }

        board[pos] = { type, color: playerColor, id: pieceId };
        usedPieceIds.add(pieceId);
        updateBoardUI();
        removePieceFromPool(pieceId);
      };

      // 点击清除
      cell.onclick = () => {
        const piece = board[pos];
        if (piece) {
          delete board[pos];
          addPieceToPool(piece); // 放回可选池
          updateBoardUI();
        }
      };

      row.appendChild(cell);
    }
    table.appendChild(row);
  }

 

  // ✅ 可选棋子池
  const piecePoolDiv = document.createElement("div");
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
    
    btn.style.margin = "5px";
    btn.style.cursor = "grab";
    btn.draggable = true;

    btn.ondragstart = (e) => {
        e.dataTransfer.setData("piece-id", id);
        e.dataTransfer.setData("type", type);
      
        // ✅ 创建一个临时的拖动图像
        const ghost = document.createElement("div");
        ghost.textContent = getPieceSymbol(type, playerColor);
        
        ghost.style.padding = "5px";
        ghost.style.opacity = "0.8";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 12, 12); // 设置图像和偏移
        setTimeout(() => document.body.removeChild(ghost), 0); // 移除
      };

    piecePool[id] = btn;
    piecePoolDiv.appendChild(btn);
  });

  function removePieceFromPool(id) {
    const el = piecePool[id];
    if (el && el.parentElement) el.parentElement.removeChild(el);
  }

  function addPieceToPool(piece) {
    if (piece && !usedPieceIds.has(piece.id)) return; // 不应重复添加
    if (!piecePool[piece.id]) return;

    usedPieceIds.delete(piece.id);
    piecePoolDiv.appendChild(piecePool[piece.id]);
  }

  // ♟️ 棋盘更新显示
  function updateBoardUI() {
    for (const td of table.querySelectorAll("td")) {
      const pos = td.dataset.pos;
      td.textContent = board[pos] ? getPieceSymbol(board[pos].type, board[pos].color) : "";
    }
  }

  // ✅ 提交按钮
  const randomBtn = document.createElement("button");
  randomBtn.textContent = "🎲 随机布置";
  randomBtn.onclick = () => {
    randomizeSetup();
  };
  

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "✅ 提交我的棋子布局";
  submitBtn.onclick = () => {
    submitDarkChessSetup(roomId, playerColor, board);
    alert("已提交！");
    container.remove();
  };
  
  // ✅ 根据颜色决定显示顺序
  if (playerColor === "black") {
    container.appendChild(label);          // ✅ 黑方标题在最上
    container.appendChild(piecePoolDiv);
    container.appendChild(randomBtn);
    container.appendChild(submitBtn);
    container.appendChild(table);
  } else {
    container.appendChild(table);
    container.appendChild(label);         // ✅ 白方标题在棋盘下
    container.appendChild(piecePoolDiv);
    container.appendChild(randomBtn);
    container.appendChild(submitBtn);
  }
  


  function randomizeSetup() {
    // 清空棋盘与候选池
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
    if (existing) existing.remove(); // 移除旧菜单
  
    // ✅ 找到棋子当前所在的格子（通过 ID）
    const pos = Object.keys(board).find(p => board[p].id === pieceId);
    if (!pos) return; // 棋子已不在棋盘上，取消显示
  
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
        localGuesses[pieceId] = type; // ✅ 以 ID 存储标记
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
  