import { roomRef } from './firebase.js';
import { playerColor, renderBoard } from './game.js';

let history = [];
let currentIndex = 0;

export async function playReplay() {
  const snapshot = await roomRef.child("game/history").once("value");
  history = snapshot.val();

  if (!history || history.length === 0) {
    alert("没有复盘数据");
    return;
  }

  currentIndex = 0;

  // 初始化 UI
  renderReplayControls();
  renderReplayStep(currentIndex);
}

function renderReplayControls() {
  // ✅ 若已存在旧控件，先移除
  const old = document.getElementById("replay-controls");
  if (old) old.remove();

  const container = document.createElement("div");
  container.id = "replay-controls";
  container.style.margin = "20px auto";
  container.style.textAlign = "center";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "⬅ 上一步";
  prevBtn.style.marginRight = "10px";

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "➡ 下一步";

  // ✅ 切换棋子可见性的开关
  const toggleBtn = document.createElement("button");
  toggleBtn.textContent = "👁️ 隐藏对手棋子";
  toggleBtn.style.marginLeft = "20px";

  let hideOpponent = false;
  toggleBtn.onclick = () => {
    hideOpponent = !hideOpponent;
    toggleBtn.textContent = hideOpponent ? "👁️‍🗨️ 显示对手棋子" : "👁️ 隐藏对手棋子";
    renderReplayStep(currentIndex, hideOpponent);
  };

  prevBtn.onclick = () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderReplayStep(currentIndex, hideOpponent);
    }
  };

  nextBtn.onclick = () => {
    if (currentIndex < history.length - 1) {
      currentIndex++;
      renderReplayStep(currentIndex, hideOpponent);
    }
  };

  container.appendChild(prevBtn);
  container.appendChild(nextBtn);
  container.appendChild(toggleBtn);
  document.body.appendChild(container);
}


function renderReplayStep(index, hideOpponent = false) {
  const step = history[index];
  // 当前回放，不区分己方，只传 null，按按钮切换是否隐藏
  renderBoard(step.board, playerColor, null, hideOpponent, step.lastMove);
}
