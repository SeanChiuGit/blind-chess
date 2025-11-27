// rules.js
let customGameOver = null;

export function setCustomGameOver(func) {
  customGameOver = func;
}

// 检查胜负函数
export function checkVictoryCondition(board, mode = "classic", extra = {}) {
  switch (mode) {
    case "classic":
      return checkClassicVictory(board);
    case "hidden_king":
      return checkHiddenKingVictory(board, extra.hiddenKings);
    case "blind_chess":
      // return checkBlindVictory(board);
      return checkClassicVictory(board);
    default:
      console.warn("未知玩法模式，跳过胜负判断");
      return null;
  }
}

function checkClassicVictory(board) {
  // 示例：某方 King 不在了就输
  const kings = Object.values(board).filter(p => p.type === "king");
  if (!kings.find(p => p.color === "white")) return "black";
  if (!kings.find(p => p.color === "black")) return "white";
  return null;
}

function checkHiddenKingVictory(board, hiddenKings) {
  const whiteAlive = Object.values(board).some(p => p.id === hiddenKings.white);
  const blackAlive = Object.values(board).some(p => p.id === hiddenKings.black);
  if (!whiteAlive) return "black";
  if (!blackAlive) return "white";
  return null;
}

function checkBlindVictory(board) {
  const whiteLeft = Object.values(board).some(p => p.color === "white");
  const blackLeft = Object.values(board).some(p => p.color === "black");
  if (!whiteLeft) return "black";
  if (!blackLeft) return "white";
  return null;
}


// 计算某个棋子的所有合法走法
export function getValidMoves(pos, piece, board) {
  const type = piece.type;
  switch (type) {
    case 'pawn':
      return getPawnMoves(pos, piece, board);
    case 'rook':
      return getRookMoves(pos, piece, board);
    case 'knight':
      return getKnightMoves(pos, piece, board);
    case 'bishop':
      return getBishopMoves(pos, piece, board);
    case 'queen':
      return getQueenMoves(pos, piece, board);
    case 'king':
      return getKingMoves(pos, piece, board);
    default:
      return [];
  }
}

function getPawnMoves(pos, piece, board) {
  const [x, y] = posToCoord(pos);
  const dir = piece.color === 'white' ? 1 : -1;
  const moves = [];

  const forward1 = coordToPos(x, y + dir);
  if (forward1 && isEmpty(forward1, board)) moves.push(forward1);

  // 首次走两格
  const startRow = piece.color === 'white' ? 1 : 6;
  if (y === startRow) {
    const forward2 = coordToPos(x, y + dir * 2);
    if (forward1 && forward2 && isEmpty(forward1, board) && isEmpty(forward2, board)) {
      moves.push(forward2);
    }
  }

  // 斜吃
  for (const dx of [-1, 1]) {
    const attack = coordToPos(x + dx, y + dir);
    if (attack && isEnemy(attack, piece.color, board)) {
      moves.push(attack);
    }
  }

  return moves;
}

function getRookMoves(pos, piece, board) {
  return getLinearMoves(pos, piece.color, board, [[1,0],[0,1],[-1,0],[0,-1]]);
}

function getBishopMoves(pos, piece, board) {
  return getLinearMoves(pos, piece.color, board, [[1,1],[1,-1],[-1,1],[-1,-1]]);
}

function getQueenMoves(pos, piece, board) {
  return getLinearMoves(pos, piece.color, board, [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
}

function getKnightMoves(pos, piece, board) {
  const [x, y] = posToCoord(pos);
  const offsets = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
  const moves = [];

  for (const [dx, dy] of offsets) {
    const target = coordToPos(x + dx, y + dy);
    if (target && (!board[target] || isEnemy(target, piece.color, board))) {
      moves.push(target);
    }
  }
  return moves;
}

function getKingMoves(pos, piece, board) {
  const [x, y] = posToCoord(pos);
  const moves = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const target = coordToPos(x + dx, y + dy);
      if (target && (!board[target] || isEnemy(target, piece.color, board))) {
        moves.push(target);
      }
    }
  }

  return moves;
}

function getLinearMoves(pos, color, board, directions) {
  const [x, y] = posToCoord(pos);
  const moves = [];

  for (const [dx, dy] of directions) {
    let cx = x + dx;
    let cy = y + dy;

    while (true) {
      const next = coordToPos(cx, cy);
      if (!next) break;

      if (!board[next]) {
        moves.push(next);
      } else {
        if (board[next].color !== color) moves.push(next);
        break;
      }

      cx += dx;
      cy += dy;
    }
  }

  return moves;
}


// 棋盘坐标转换
const files = ['a','b','c','d','e','f','g','h'];

function posToCoord(pos) {
  const file = files.indexOf(pos[0]);
  const rank = parseInt(pos[1], 10) - 1;
  return [file, rank]; // [x, y]
}

function coordToPos(x, y) {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return files[x] + (y + 1);
}

function isEmpty(pos, board) {
  return !board[pos];
}

function isEnemy(pos, color, board) {
  return board[pos] && board[pos].color !== color;
}