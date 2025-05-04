// game.js
import { getValidMoves } from './rules.js';
import { selectKing } from './hiddenking.js';
import { roomId, myTurn } from './main.js'; // 引入 roomId
import { sendState } from './firebase.js'; // 引入 sendState 函数
import { showGuessMenu, localGuesses } from './darkChessSetup.js'; // 引入 showGuessMenu 函数

export let board, turn, playerColor;
// export const localGuesses = {}; // { e4: "knight", g7: "queen" }

export function initGame(color) {
  // TODO
    playerColor = color; // 'white' or 'black'
    board = initBoard();
    turn = 'white';
  
    // // 👑 启动选择隐藏国王界面
    // selectKing(playerColor, board, roomId);
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

  return { board, turn, lastMove: { from, to } };
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

export function renderBoard(board, currentColor, hiddenKingId = null, hiddenOpponent = false, lastMove = null)
{
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

      cell.style.width = "80px";
      cell.style.height = "80px";
      cell.style.textAlign = "center";
      cell.style.verticalAlign = "middle";
      cell.style.fontSize = "40px";
      cell.style.cursor = "pointer";

      const isDark = (f + rank) % 2 === 1;
      const baseColor = isDark ? "#769656" : "#eeeed2";
      cell.style.backgroundColor = baseColor;

      // 设置棋子文本
      if (board[pos]) {
        const piece = board[pos];
      
        // 👀 若启用隐藏模式，且该棋子不是我方，隐藏它
        const shouldHide = hiddenOpponent && piece.color !== currentColor;
      
        if (shouldHide) {
          // ✅ 渲染本地猜测
          if (localGuesses[pos]) {
            const opponentColor = currentColor === "white" ? "black" : "white";
            cell.textContent = getPieceSymbol(localGuesses[pos], opponentColor); // 用己方颜色显示猜测
            cell.style.opacity = 0.4; // 可视化区别
          } else {
            cell.textContent = "？";
          }
        } else {
          cell.textContent = getPieceSymbol(piece.type, piece.color);
          if (piece.id === hiddenKingId) {
            cell.textContent = "★" + getPieceSymbol(piece.type, piece.color);
          }
        }
      }

      // 点击事件
      cell.onclick = () => {
        const piece = board[pos];
        const isOpponentHidden = hiddenOpponent && piece && piece.color !== currentColor;

        if (isOpponentHidden) {
          if (selected && board[selected] && board[selected].color === currentColor) {
            // ✅ 当前选中了我方棋子 → 发起移动（吃掉对方）
            onMove(selected, pos);
            selected = null;
            clearHighlights();
            return;
          } else {
          const existing = document.getElementById("guessMenu");
        
          // ✅ 如果菜单已存在且当前就是点击它的位置 → 收起
          if (existing && existing.dataset.pos === pos) {
            existing.remove();
            return;
          }
        
          // ✅ 否则显示新的
          showGuessMenu(pos, board, currentColor, hiddenOpponent, lastMove);
          return;
        }
        }

        // 清除所有高亮
        clearHighlights();

        if (!selected && board[pos] && board[pos].color === currentColor) {
          if (!myTurn) return; // ❌ 非我方回合 → 不可选中
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
          const validMoves = getValidMoves(selected, board[selected], board);
          if (!validMoves.includes(pos)) {
            // ❌ 点击了非法格子
            clearHighlights(); // 清除高亮
            selected = null;   // 取消选中状态
            renderBoard(board, currentColor, null, hiddenOpponent, lastMove);
            return;
          }
        
          // ✅ 合法走法才继续
          onMove(selected, pos);
          selected = null;
        }
      };

      row.appendChild(cell);

       // 高亮上一步的起点和终点
    if (lastMove) {
      if (pos === lastMove.from) {
        cell.style.backgroundColor = "#fdd835"; // 淡黄，起点
      }
      if (pos === lastMove.to) {
        // cell.innerHTML += " ➤"; // 或用 SVG 更美观
        cell.style.backgroundColor = "#f44336"; // 红色，终点
      }
    }
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

export function getPieceSymbol(type, color) {
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
  if (!newState) {
    console.warn("⛔ 无效走法，忽略发送");
    return; // ❌ 不合法移动，不发状态
  }

  sendState(newState); // ✅ 只有合法移动才同步
}
