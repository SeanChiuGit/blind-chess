import { submitDarkChessSetup } from './firebase.js';
import { getPieceSymbol } from './game.js'; // 假设你有一个函数来获取棋子符号

export function enterDarkChessSetup(roomId, playerColor) {
  const board = {};
  const usedPieceIds = new Set();
  const container = document.createElement("div");
  container.innerHTML = `<h3>${playerColor.toUpperCase()} 自由布子</h3>`;
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
      cell.style.width = "50px";
      cell.style.height = "50px";
      cell.style.border = "1px solid black";
      cell.style.textAlign = "center";
      cell.style.fontSize = "24px";
      cell.style.verticalAlign = "middle";
      cell.style.backgroundColor = "#f0f0f0";
      cell.style.cursor = "pointer";

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

  container.appendChild(table);

  // ✅ 可选棋子池
  const piecePoolDiv = document.createElement("div");
  piecePoolDiv.innerHTML = "<p>拖动棋子到棋盘上：</p>";
  container.appendChild(piecePoolDiv);

  const pieceList = [
    "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
    "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn"
  ];

  const piecePool = {}; // id → element

  pieceList.forEach((type, index) => {
    const id = `${playerColor}_${index}`;
    const btn = document.createElement("span");
    btn.textContent = getPieceSymbol(type, playerColor);
    btn.style.fontSize = "24px";
    btn.style.margin = "5px";
    btn.style.cursor = "grab";
    btn.draggable = true;

    btn.ondragstart = (e) => {
        e.dataTransfer.setData("piece-id", id);
        e.dataTransfer.setData("type", type);
      
        // ✅ 创建一个临时的拖动图像
        const ghost = document.createElement("div");
        ghost.textContent = getPieceSymbol(type, playerColor);
        ghost.style.fontSize = "24px";
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
  const submitBtn = document.createElement("button");
  submitBtn.textContent = "✅ 提交我的棋子布局";
  submitBtn.onclick = () => {
    submitDarkChessSetup(roomId, playerColor, board);
    alert("已提交！");
    container.remove();
  };
  container.appendChild(submitBtn);
}
