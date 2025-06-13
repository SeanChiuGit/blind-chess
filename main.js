import { initFirebase, createOrJoinRoom, sendState, assignPlayerColor, onStateChange} from './firebase.js';
import { initGame, movePiece, getGameState, applyGameState, checkGameOver } from './game.js';
import { onBothKingsSelected } from './firebase.js';
import { renderBoard } from './game.js';
import { initBoard, board, turn, playerColor} from './game.js'; // 假设你用这个初始化函数
import { checkVictoryCondition } from './rules.js'; 
import { submitPlayerModeChoice, onBothModesSelectedAndMatched} from './firebase.js';
import { showModeButtons } from './ui.js';
import { enterDarkChessSetup } from './darkChessSetup.js'; 
import { selectKing } from './hiddenking.js'; // 假设你有一个函数来选择隐藏国王
import { onBothSetupsReady } from './firebase.js';
import { playReplay } from './replay.js'; // 假设你有一个函数来播放复盘



// Store global variables for the game state
export let roomId = null;
export let myTurn = turn === playerColor;
export let game_mode = null; // 玩法

initFirebase();

// 清理过期房间
firebase.database().ref("rooms").once("value").then(snapshot => {
  const now = Date.now();
  const rooms = snapshot.val();
  for (const roomId in rooms) {
    const created = rooms[roomId].createdAt;
    const maxAge = 1000 * 60 * 60 * 12; // 12小时
    if (created && now - created > maxAge) {
      firebase.database().ref("rooms/" + roomId).remove(); // 删除
    }
  }
});

// 房间加入逻辑
document.getElementById('joinBtn').onclick = async () => {
  roomId = document.getElementById('roomInput').value.trim();
  if (!roomId) return alert("Please enter a room ID");

  document.getElementById("status").innerText = `Connected to Room: ${roomId}`;
  const result = await assignPlayerColor(roomId);
  if (!result) {
    alert("房间已满，请换一个");
    return;
  }
  const { slot, color } = result;
  document.getElementById("status").innerText = `你是 ${color} 方 (${slot})`;

  createOrJoinRoom(roomId, (roomData) => {
  });


  // 玩家加入房间后 选择玩法
  firebase.database().ref(`rooms/${roomId}/selections/${slot}`)
  .once("value")
  .then(snapshot => {
    if (!snapshot.exists()) {
      // 只在玩家没选过时显示按钮
      showModeButtons((chosenMode) => {
        submitPlayerModeChoice(roomId, slot, chosenMode);
      });
    }
  });


  // 模式选择后 开始游戏
  onBothModesSelectedAndMatched(roomId, (mode) => {
  // startWithMode(mode);
    game_mode = mode;
    console.log("游戏模式：", game_mode);
    initGame(color); // 🎮 初始化棋盘

    // **********************************************************
    if (game_mode === "classic") {
      console.log("游戏模式：经典");
      // 进入经典棋局
      renderBoard(board, playerColor); // 渲染棋盘

      // 发送初始状态
      if (playerColor === "white"){
        sendState(getGameState());
        console.log("白方已初始化棋盘，发送状态：", getGameState());
      } 

      // 监听状态变化
      onStateChange((remoteState) => {
        const gameState = remoteState?.game;
        if (!gameState || !gameState.board) {
          console.log("等待白方初始化棋盘...");
          return;
        }
        
        console.log("接收到远程状态：", gameState);
        applyGameState(gameState); // 应用 game 下的状态
        myTurn = gameState.turn === playerColor;
        renderBoard(gameState.board, playerColor);

        const winner = checkVictoryCondition(gameState.board);
        if (winner) {
          alert(`${winner.toUpperCase()} wins!`);
          // 可选：禁用进一步点击，比如通过设置 myTurn = false
        }
      });

    }
    // **********************************************************
    else if (game_mode === "hidden_king") {
            console.log("游戏模式：隐藏国王");

            // initGame(color); // 🎮 初始化棋盘并开始“选隐藏国王”界面
            // 👑 启动选择隐藏国王界面
        selectKing(playerColor, board, roomId);
        onBothKingsSelected(roomId, (hiddenKings) => {
          console.log("双方都已选定隐藏国王：", hiddenKings);
          // console.log(playerColor);
          // console.log(color);
          renderBoard(board, hiddenKings[playerColor]); // 渲染棋盘

          // 白方初始化棋盘
        if (playerColor === "white"){
          sendState(getGameState());
          console.log("白方已初始化棋盘，发送状态：", getGameState());
        } 

        onStateChange((remoteState) => {
          const gameState = remoteState?.game;
          if (!gameState || !gameState.board) {
            console.log("等待白方初始化棋盘...");
            return;
          }
          
          console.log("接收到远程状态：", gameState);
          applyGameState(gameState); // 应用 game 下的状态
          myTurn = gameState.turn === playerColor;
          renderBoard(gameState.board, playerColor, hiddenKings[playerColor]);

          const winner = checkVictoryCondition(gameState.board, "hidden_king", {hiddenKings});
          if (winner) {
            alert(`${winner.toUpperCase()} wins!`);
            // 可选：禁用进一步点击，比如通过设置 myTurn = false
          }
        });
        });

    } 
    // **********************************************************
    else if (game_mode === "blind_chess") {
      console.log("游戏模式：暗棋");
      enterDarkChessSetup(roomId, color); // 进入暗棋设置界面
      onBothSetupsReady(roomId, (setups) => {
        const mergedBoard = { ...setups.white, ...setups.black };
        console.log("✅ 双方布局完成，进入游戏！");
      
        sendState({
          board: mergedBoard,
          turn: "white"
        }); // ✅ 加上这句，上传正式对局状态
      
        // 本地预览第一次渲染（可选）
        renderBoard(mergedBoard, playerColor, null, true);
      
        onStateChange((remoteState) => {
          const gameState = remoteState?.game;
          if (!gameState || !gameState.board) {
            console.log("等待棋盘初始化...");
            return;
          }
      
          console.log("接收到远程状态：", gameState);
          applyGameState(gameState);
          myTurn = gameState.turn === playerColor;
      
          renderBoard(gameState.board, playerColor, null, true, gameState.lastMove);
      
          const winner = checkVictoryCondition(gameState.board, "blind_chess");
          if (winner) {
            alert(`${winner.toUpperCase()} wins!`);
            myTurn = false;
          
            showReplayButton(); // ✅ 添加复盘按钮
          }
        });
      });
    } 
    // **********************************************************
    else {
      console.error("未知的游戏模式！");
    }
  });

};

function showReplayButton() {
  const btn = document.createElement("button");
  btn.textContent = "🎬 查看复盘";
  btn.onclick = playReplay;
  document.body.appendChild(btn);
}