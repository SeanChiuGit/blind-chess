// rules.js
let customGameOver = null;

export function isValidMove(piece, from, to, board) {
  // 简化处理：验证 piece 的基本走法逻辑
  return true;
}

// export function isGameOver(board) {
//   if (customGameOver) return customGameOver(board);
//   // 默认规则：查找 king 是否死亡
//   return !Object.values(board).some(p => p.type === 'king');
// }

export function setCustomGameOver(func) {
  customGameOver = func;
}

// 检查胜负函数
export function checkVictoryCondition(board, hiddenKings) {
  const whiteAlive = Object.values(board).some(p => p.id === hiddenKings.white);
  const blackAlive = Object.values(board).some(p => p.id === hiddenKings.black);

  if (!whiteAlive) return "black";
  if (!blackAlive) return "white";
  return null;
}