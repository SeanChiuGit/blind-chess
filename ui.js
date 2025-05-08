// ui.js

export function showModeButtons(onSelect) {
  // ✅ 隐藏封面页
  const cover = document.querySelector(".container");
  if (cover) cover.style.display = "none";

  // ✅ 显示模式选择按钮
  const div = document.createElement("div");
  div.id = "modeSelectUI";
  div.innerHTML = "<p style='color: white; font-size: 2rem;'>选择玩法：</p>";

  ["hidden_king", "blind_chess", "fog"].forEach((mode) => {
    const btn = document.createElement("button");
    btn.textContent = mode;
    btn.style.marginRight = "10px";
    btn.onclick = () => {
      div.remove();           // 选择后移除按钮 UI
      onSelect(mode);         // 通知 main.js 用户选择了哪个模式
    };
    div.appendChild(btn);
  });

  document.body.appendChild(div);
}