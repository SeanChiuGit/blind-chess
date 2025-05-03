import { initFirebase, createOrJoinRoom, sendState, assignPlayerColor, onStateChange} from './firebase.js';
import { initGame, movePiece, getGameState, applyGameState, checkGameOver } from './game.js';
import { onBothKingsSelected } from './firebase.js';
import { renderBoard } from './game.js';
import { initBoard, board, turn, playerColor} from './game.js'; // 假设你用这个初始化函数

// Store global variables for the game state
export let roomId = null;
export let myTurn = turn === playerColor;

initFirebase();

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

  createOrJoinRoom(roomId, (state) => {
    document.getElementById("stateView").innerText = "Synced state:\n" + JSON.stringify(state, null, 2);
  });

  initGame(color); // 🎮 初始化棋盘并开始“选隐藏国王”界面
  onBothKingsSelected(roomId, (hiddenKings) => {
    console.log("双方都已选定隐藏国王：", hiddenKings);
    // console.log(playerColor);
    // console.log(color);
    renderBoard(board); 

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
    renderBoard(gameState.board, playerColor);
  });

  });
  
  

  



};
