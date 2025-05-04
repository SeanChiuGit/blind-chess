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




// Store global variables for the game state
export let roomId = null;
export let myTurn = turn === playerColor;
export let game_mode = null; // 玩法

initFirebase();

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

  // 玩家加入房间后（已知 roomId 和 playerSlot）
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

  // 所有玩家都监听是否匹配成功（只会触发一次）
  onBothModesSelectedAndMatched(roomId, (mode) => {
  // startWithMode(mode);
    game_mode = mode;
    console.log("游戏模式：", game_mode);
    initGame(color); // 🎮 初始化棋盘

    // **********************************************************
    if (game_mode === "hidden_king") {
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

          const winner = checkVictoryCondition(gameState.board, hiddenKings);
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
        // startDarkChessGame(mergedBoard);
        renderBoard(board, playerColor, null, true); // 渲染棋盘
      });
    } 
    // **********************************************************
    else {
      console.error("未知的游戏模式！");
    }
  });

};
