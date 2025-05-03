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

// ui.js
// export function renderBoard(board) {
//   // 删除旧棋盘
//   const oldBoard = document.getElementById("chessBoard");
//   if (oldBoard) oldBoard.remove();

//   // 创建新棋盘
//   const table = document.createElement("table");
//   table.id = "chessBoard";
//   table.style.borderCollapse = "collapse";
//   table.style.margin = "20px auto";

//   const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
//   const ranks = [8, 7, 6, 5, 4, 3, 2, 1]; // 白方视角：1 在底部

//   for (const rank of ranks) {
//     const row = document.createElement("tr");
//     for (let f = 0; f < 8; f++) {
//       const file = files[f];
//       const pos = file + rank;
//       const cell = document.createElement("td");
//       cell.style.width = "50px";
//       cell.style.height = "50px";
//       cell.style.textAlign = "center";
//       cell.style.verticalAlign = "middle";
//       cell.style.fontSize = "24px";
//       cell.style.cursor = "pointer";

//       // 设置背景色
//       const isDark = (f + rank) % 2 === 1;
//       cell.style.backgroundColor = isDark ? "#769656" : "#eeeed2";

//       // 放置棋子文字（可替换成图标）
//       if (board[pos]) {
//         const piece = board[pos];
//         cell.textContent = getPieceSymbol(piece.type, piece.color);
//       }

//       row.appendChild(cell);
//     }
//     table.appendChild(row);
//   }

//   document.body.appendChild(table);
// }

export function renderBoard(board, currentColor) {
  const oldBoard = document.getElementById("chessBoard");
  if (oldBoard) oldBoard.remove();

  const table = document.createElement("table");
  table.id = "chessBoard";
  table.style.borderCollapse = "collapse";
  table.style.margin = "20px auto";

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  let selected = null;

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
      cell.style.backgroundColor = isDark ? "#769656" : "#eeeed2";

      if (board[pos]) {
        const piece = board[pos];
        cell.textContent = getPieceSymbol(piece.type, piece.color);
      }

      // 添加点击事件
      cell.onclick = () => {
        if (!selected && board[pos] && board[pos].color === currentColor) {
          selected = pos;
          cell.style.border = "2px solid red";
        } else if (selected) {
          console.log("Selected:", selected, "Target:", pos);
          onMove(selected, pos); // 发起移动回调
          selected = null;
        }
      };

      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  document.body.appendChild(table);
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


// // 初始化棋盘状态（白方调用）
// export function initGameState(initBoardFunc) {
//   board = initBoardFunc();  // 使用传入的初始化函数
//   turn = "white";
//   return { board, turn };
// }

// // 本地执行走子，更新状态并返回新状态
// export function makeMove(from, to) {
//   board[to] = board[from];
//   delete board[from];
//   turn = turn === "white" ? "black" : "white";
//   return { board, turn };
// }

// // 应用对方同步来的状态（覆盖本地）
// export function applyState(state) {
//   board = state.board;
//   turn = state.turn;
// }

// // 获取当前游戏状态（用于发给对方）
// export function getState() {
//   return { board, turn };
// }

function onMove(from, to) {
  if (!myTurn) return;

  const newState = movePiece(from, to);
  sendState(newState);
}
