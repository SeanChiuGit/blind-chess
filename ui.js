export function showModeButtons(onSelect) {
    const div = document.createElement("div");
    div.id = "modeSelectUI";
    div.innerHTML = "<p>选择玩法：</p>";
  
    ["hidden_king", "blind_chess", "fog"].forEach(mode => {
      const btn = document.createElement("button");
      btn.textContent = mode;
      btn.style.marginRight = "10px";
      btn.onclick = () => {
        div.remove(); // 选择后移除按钮
        onSelect(mode);
      };
      div.appendChild(btn);
    });
  
    document.body.appendChild(div);
  }
  