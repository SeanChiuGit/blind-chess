export function showModeButtons(onSelect) {
  // ✅ 隐藏封面页
  const cover = document.querySelector(".container");
  if (cover) cover.style.display = "none";

  // 创建容器
  const div = document.createElement("div");
  div.id = "modeSelectUI";
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.alignItems = "center";
  div.style.marginTop = "100px";

  // 标题
  const title = document.createElement("h1");
  title.textContent = "Game Modes";
  title.style.fontFamily = "'Playfair Display', serif";
  title.style.fontSize = "4rem";
  title.style.color = "#1e2b39";
  title.style.marginBottom = "40px";
  div.appendChild(title);

  // 模式按钮
  const modes = [
    { label: "Classic", value: "classic" },
    { label: "Hidden King", value: "hidden_king" },
    { label: "Blind", value: "blind_chess" },
    // { label: "Fog", value: "fog" },
  ];

  for (const { label, value } of modes) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.background = "none";
    btn.style.border = "none";
    btn.style.color = "#1e2b39";
    btn.style.fontSize = "2.2rem";
    btn.style.fontFamily = "'Playfair Display', serif";
    btn.style.margin = "10px";
    btn.style.cursor = "pointer";
    btn.style.transition = "opacity 0.2s ease";

    btn.onmouseover = () => (btn.style.opacity = "0.7");
    btn.onmouseleave = () => (btn.style.opacity = "1");

    btn.onclick = () => {
      div.remove();
      onSelect(value);
    };

    div.appendChild(btn);
  }

  document.body.appendChild(div);
}
