// ui.js

export function showModeButtons(onSelect) {
  // ✅ 隐藏封面
  const cover = document.querySelector(".container");
  if (cover) cover.style.display = "none";

  // ✅ 创建模式选择 UI
  const div = document.createElement("div");
  div.id = "modeSelectUI";
  div.innerHTML = "<p style='color: white; font-size: 2rem;'>选择玩法：</p>";

  ["hidden_king", "blind_chess", "fog"].forEach(mode => {
    const btn = document.createElement("button");
    btn.textContent = mode;
    btn.style.marginRight = "10px";

    // ✅ 可选美化按钮风格
    btn.style.padding = "0.5rem 1.2rem";
    btn.style.fontSize = "1.2rem";
    btn.style.background = "transparent";
    btn.style.border = "1px solid white";
    btn.style.color = "white";
    btn.style.cursor = "pointer";

    btn.onclick = () => {
      div.remove();        // 移除按钮区域
      onSelect(mode);      // 通知 main.js，继续流程
    };

    div.appendChild(btn);
  });

  document.body.appendChild(div);
}
