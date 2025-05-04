// import { submitDarkChessSetup } from './firebase.js';

// export function enterDarkChessSetup(roomId, playerColor) {
//   const board = {}; // 初始为空棋盘
//   const container = document.createElement("div");
//   container.innerHTML = `<h3>${playerColor.toUpperCase()} 布局棋盘</h3>`;
//   document.body.appendChild(container);

//   const table = document.createElement("table");
//   table.style.borderCollapse = "collapse";

//   const files = ['a','b','c','d','e','f','g','h'];
//   const ranks = playerColor === "white" ? [1,2] : [7,8];

//   // 可选棋子池
//   const piecePool = [
//     "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
//     "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn"
//   ];

//   let selectedPiece = null;
//   let selectedSquare = null;

//   // 显示棋子选择区
//   const poolDiv = document.createElement("div");
//   poolDiv.innerHTML = "<p>点击棋子，再点击棋盘放置：</p>";
//   piecePool.forEach((type, i) => {
//     const btn = document.createElement("button");
//     btn.textContent = getPieceSymbol(type, playerColor);
//     btn.onclick = () => {
//       selectedPiece = { type, color: playerColor, id: `${playerColor}_${i}` };
//     };
//     poolDiv.appendChild(btn);
//   });
//   container.appendChild(poolDiv);

//   // 渲染棋盘
//   for (let r of ranks.reverse()) {
//     const row = document.createElement("tr");
//     for (let f = 0; f < 8; f++) {
//       const pos = files[f] + r;
//       const cell = document.createElement("td");
//       cell.dataset.pos = pos;
//       cell.style.width = "50px";
//       cell.style.height = "50px";
//       cell.style.border = "1px solid black";
//       cell.style.textAlign = "center";
//       cell.style.fontSize = "24px";
//       cell.style.cursor = "pointer";

//       cell.onclick = () => {
//         if (selectedPiece) {
//           board[pos] = selectedPiece;
//           updateBoardUI();
//           selectedPiece = null;
//         } else if (board[pos]) {
//           delete board[pos]; // 再次点击移除
//           updateBoardUI();
//         }
//       };

//       row.appendChild(cell);
//     }
//     table.appendChild(row);
//   }

//   container.appendChild(table);

//   // 更新显示
//   function updateBoardUI() {
//     for (const td of table.querySelectorAll("td")) {
//       const pos = td.dataset.pos;
//       const piece = board[pos];
//       td.textContent = piece ? getPieceSymbol(piece.type, piece.color) : "";
//     }
//   }

//   // 提交按钮
//   const submitBtn = document.createElement("button");
//   submitBtn.textContent = "✅ 提交我的棋子布局";
//   submitBtn.onclick = () => {
//     submitDarkChessSetup(roomId, playerColor, board);
//     alert("已提交！");
//     container.remove();
//   };
//   container.appendChild(submitBtn);
// }
