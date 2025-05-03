// game.js
import { getValidMoves } from './rules.js';
import { selectKing } from './hiddenking.js';
import { roomId, myTurn } from './main.js'; // 引入 roomId
import { sendState } from './firebase.js'; // 引入 sendState 函数

export let board, turn, playerColor;

export function initGame(color) {
  // TODO
    playerColor = color; // 'white' or 'black'
    board = initBoard();
    turn = 'white';
  
    // 👑 启动选择隐藏国王界面
    selectKing(playerColor, board, roomId);
  }

export function movePiece(from, to) {
  const movingPiece = board[from];
  const targetPiece = board[to];

  if (!movingPiece || movingPiece.color !== turn) return false;

  // 不允许吃自己人
  if (targetPiece && targetPiece.color === turn) return false;

  // 🔍 新增：判断走法是否合法
  const validMoves = getValidMoves(from, movingPiece, board);
  if (!validMoves.includes(to)) return false;

  // ✅ 执行移动
  board[to] = movingPiece;
  delete board[from];

  // ✅ 轮换回合
  turn = turn === "white" ? "black" : "white";

  return { board, turn };
}

export function getGameState() {
  return { board, turn };
}

export function applyGameState(state) {
  board = state.board;
  turn = state.turn;
}

export function checkGameOver() {
  return isGameOver(board);
}

export function initBoard() {
  const board = {};
  let idCounter = { white: 0, black: 0 };

  const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  // 白方后排
  for (let i = 0; i < 8; i++) {
    const pos = files[i] + '1';
    const type = backRank[i];
    const color = 'white';
    const id = `${color}_${idCounter[color]++}`;
    board[pos] = { id, type, color };
  }

  // 白方兵
  for (let i = 0; i < 8; i++) {
    const pos = files[i] + '2';
    const color = 'white';
    const id = `${color}_${idCounter[color]++}`;
    board[pos] = { id, type: 'pawn', color };
  }

  // 黑方后排
  for (let i = 0; i < 8; i++) {
    const pos = files[i] + '8';
    const type = backRank[i];
    const color = 'black';
    const id = `${color}_${idCounter[color]++}`;
    board[pos] = { id, type, color };
  }

  // 黑方兵
  for (let i = 0; i < 8; i++) {
    const pos = files[i] + '7';
    const color = 'black';
    const id = `${color}_${idCounter[color]++}`;
    board[pos] = { id, type: 'pawn', color };
  }

  return board;
}

export function renderBoard(board, currentColor) {
  const oldBoard = document.getElementById("chessBoard");
  if (oldBoard) oldBoard.remove();

  const table = document.createElement("table");
  table.id = "chessBoard";
  table.style.borderCollapse = "collapse";
  table.style.margin = "20px auto";

  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = [8,7,6,5,4,3,2,1];

  let selected = null;
  let highlighted = [];

  for (const rank of ranks) {
    const row = document.createElement("tr");
    for (let f = 0; f < 8; f++) {
      const file = files[f];
      const pos = file + rank;
      const cell = document.createElement("td");
      cell.dataset.pos = pos;

      cell.style.width = "50px";
      cell.style.height = "50px";
      cell.style.textAlign = "center";
      cell.style.verticalAlign = "middle";
      cell.style.fontSize = "24px";
      cell.style.cursor = "pointer";

      const isDark = (f + rank) % 2 === 1;
      const baseColor = isDark ? "#769656" : "#eeeed2";
      cell.style.backgroundColor = baseColor;

      // 设置棋子文本
      if (board[pos]) {
        const piece = board[pos];
        cell.textContent = getPieceSymbol(piece.type, piece.color);
      }

      // 点击事件
      cell.onclick = () => {
        // 清除所有高亮
        clearHighlights();

        if (!selected && board[pos] && board[pos].color === currentColor) {
          selected = pos;
          cell.style.border = "2px solid red";

          // 🔍 计算并高亮所有可走位置
          const moves = getValidMoves(pos, board[pos], board);
          for (const m of moves) {
            const targetCell = document.querySelector(`[data-pos="${m}"]`);
            if (targetCell) {
              targetCell.style.backgroundColor = "#baca44"; // 高亮绿色
              highlighted.push(targetCell);
            }
          }

        } else if (selected) {
          onMove(selected, pos); // 触发移动逻辑
          selected = null;
        }
      };

      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  document.body.appendChild(table);

  function clearHighlights() {
    for (const cell of highlighted) {
      const pos = cell.dataset.pos;
      const fileIndex = files.indexOf(pos[0]);
      const rankNum = parseInt(pos[1]);
      const isDark = (fileIndex + rankNum) % 2 === 1;
      cell.style.backgroundColor = isDark ? "#769656" : "#eeeed2";
    }
    highlighted = [];
    const allCells = table.querySelectorAll("td");
    allCells.forEach(c => c.style.border = "none");
  }
}

function getPieceSymbol(type, color) {
  const symbols = {
    pawn:   { white: "♙", black: "♟︎" },
    rook:   { white: "♖", black: "♜" },
    knight: { white: "♘", black: "♞" },
    bishop: { white: "♗", black: "♝" },
    queen:  { white: "♕", black: "♛" },
    king:   { white: "♔", black: "♚" }
  };
  return symbols[type]?.[color] || "?";
}

function onMove(from, to) {
  if (!myTurn) return;

  const newState = movePiece(from, to);
  sendState(newState);
}
