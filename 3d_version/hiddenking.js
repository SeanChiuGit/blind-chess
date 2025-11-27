// hiddenKing.js
import { setCustomGameOver } from './rules.js';

let hiddenKings = {
  white: null,
  black: null
};

export function selectHiddenKing(player, pieceId) {
  hiddenKings[player] = pieceId;
}

export function isHiddenKingDead(board) {
  return Object.entries(hiddenKings).some(([player, id]) => {
    return !Object.values(board).some(p => p.id === id);
  });
}

export function registerHiddenKingRule() {
  setCustomGameOver(isHiddenKingDead);
}

// import { set } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js";

// 假设你已初始化 Firebase 并有 `db` 和 roomId 全局变量
export function selectKing(playerColor, board, roomId) {
  const div = document.createElement("div");
  div.id = "selectKingUI";
  div.style.border = "1px solid black";
  div.style.padding = "10px";
  div.style.margin = "10px";

  const myPieces = Object.entries(board).filter(([pos, piece]) => piece.color === playerColor);

  let html = `<h3>You are <span style="color: ${playerColor === 'white' ? 'black' : 'gray'}">${playerColor.toUpperCase()}</span></h3>`;
  html += `<p>Select your hidden king:</p>`;

  myPieces.forEach(([pos, piece]) => {
    html += `<button data-id="${piece.id}">${piece.type} @ ${pos}</button> `;
  });

  div.innerHTML = html;
  document.body.appendChild(div);

  // 按钮点击处理
  div.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      const selectedId = btn.dataset.id;
      firebase.database().ref(`rooms/${roomId}/hiddenKings/${playerColor}`).set(selectedId);

      div.innerHTML = `<p>You selected <b>${selectedId}</b> as your hidden king.</p>`;
    };
  });
}
