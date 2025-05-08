// ui.js
// ui.js

export function showModeButtons(onSelect) {
  // ✅ 隐藏封面页
  const cover = document.querySelector(".container");
  if (cover) cover.style.display = "none";

  // ✅ 保证 status 提示还可见
  const status = document.getElementById("status");
  if (status) {
    status.innerText = "请选择玩法以开始游戏";
    status.style.display = "block";
    status.style.color = "white";
    status.style.fontSize = "1.5rem";
    status.style.margin = "2rem";
  }

  // ✅ 显示模式选择按钮
  const div = document.createElement("div");
  div.id = "modeSelectUI";
  div.innerHTML = "<p style='color: white; font-size: 2rem;'>选择玩法：</p>";

  ["hidden_king", "blind_chess", "fog"].forEach((mode) => {
    const btn = document.createElement("button");
    btn.textContent = mode;
    btn.style.marginRight = "10px";
    btn.style.padding = "0.6rem 1.2rem";
    btn.style.fontSize = "1.5rem";
    btn.style.background = "transparent";
    btn.style.color = "white";
    btn.style.border = "1px solid white";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      div.remove();           // 选择后移除按钮 UI
      if (status) status.innerText = `已选择模式：${mode}，等待对手...`;
      onSelect(mode);         // 通知 main.js 用户选择了哪个模式
    };
    div.appendChild(btn);
  });

  document.body.appendChild(div);
}
