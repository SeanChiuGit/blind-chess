// ui.js

export function showModeButtons(onSelect) {
  // ✅ 隐藏封面页
  const cover = document.querySelector(".container");
  if (cover) cover.style.display = "none";

  // ✅ 创建选择 UI
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
      div.remove();
      onSelect(mode); // ✅ 关键：传回 main.js → submitPlayerModeChoice
    };

    div.appendChild(btn);
  });

  document.body.appendChild(div);
}
