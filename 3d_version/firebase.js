
export function onStateChange(callback) {
  roomRef.on('value', snapshot => callback(snapshot.val()));
}

export let db, roomRef;

export function initFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyDVjCCy7j80N7-VbPTicZeIqK2bu9Gik3c",
    authDomain: "blindchess-fa5f0.firebaseapp.com",
    databaseURL: "https://blindchess-fa5f0-default-rtdb.firebaseio.com",
    projectId: "blindchess-fa5f0",
    storageBucket: "blindchess-fa5f0.firebasestorage.app",
    messagingSenderId: "971675007996",
    appId: "1:971675007996:web:cb3e58abbea388aadc5079"
  };

  if (!firebase.apps.length) {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database(app);
  } else {
    db = firebase.database(); // Use existing app
  }
}

export function createOrJoinRoom(roomId, onData) {
  roomRef = db.ref("rooms/" + roomId);
  roomRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) onData(data);
  });
}

export function sendState(state) {
  if (!roomRef) return;

  roomRef.child("game").transaction((current) => {
    if (!current) current = {};
    // 初始化历史数组
    if (!current.history) current.history = [];

    const nextState = {
      board: state.board,
      turn: state.turn,
      lastMove: state.lastMove || null
    };

    // 把这一步加入历史
    current.history.push(nextState);
    current.board = nextState.board;
    current.turn = nextState.turn;
    current.lastMove = nextState.lastMove;

    return current;
  });
}

export async function assignPlayerColor(roomId) {
  const roomRootRef = firebase.database().ref("rooms/" + roomId);
  const playersRef = roomRootRef.child("players");
  const snapshot = await playersRef.once("value");
  const players = snapshot.val() || {};

  if (!players.player1) {
    // ✅ 首次加入 → 设置创建时间
    await Promise.all([
      playersRef.child("player1").set("white"),
      roomRootRef.child("createdAt").set(Date.now())
    ]);
    return { slot: "player1", color: "white" };
  } else if (!players.player2) {
    await playersRef.child("player2").set("black");
    return { slot: "player2", color: "black" };
  } else {
    return null; // 房间已满
  }
}

export function onBothKingsSelected(roomId, callback) {
  const hiddenRef = firebase.database().ref(`rooms/${roomId}/hiddenKings`);

  hiddenRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data && data.white && data.black) {
      callback(data); // 两人都已选择，触发回调
    }
  });
}

export function submitPlayerModeChoice(roomId, playerSlot, mode) {
  firebase.database().ref(`rooms/${roomId}/selections/${playerSlot}`).set(mode);
}

export function onBothModesSelectedAndMatched(roomId, callback) {
  const ref = firebase.database().ref(`rooms/${roomId}/selections`);
  ref.on("value", snapshot => {
    const selections = snapshot.val();
    if (selections?.player1 && selections?.player2) {
      if (selections.player1 === selections.player2) {
        callback(selections.player1); // 开始游戏
      }
      // ⚠️ 不一致时什么都不做
    }
  });
}

export function submitDarkChessSetup(roomId, playerColor, board) {
  const ref = firebase.database().ref(`rooms/${roomId}/setup/${playerColor}`);
  ref.set(board);
}

export function onBothSetupsReady(roomId, callback) {
  const ref = firebase.database().ref(`rooms/${roomId}/setup`);
  ref.on("value", snapshot => {
    const setups = snapshot.val();
    if (setups?.white && setups?.black) {
      callback(setups); // 双方都提交了布局，启动游戏
    }
  });
}

export function requestRematch(roomId, color) {
  firebase.database().ref(`rooms/${roomId}/rematch/${color}`).set(true);
}

export function onRematchStateChange(roomId, callback) {
  const ref = firebase.database().ref(`rooms/${roomId}/rematch`);
  ref.on("value", snapshot => {
    const data = snapshot.val();
    if (data && data.white && data.black) {
      // Both accepted rematch
      callback();
      // Reset rematch flags
      ref.set(null);
    }
  });
}

export function resetRoomForRematch(roomId) {
  // Clear game state, setups, and selections to restart flow
  const updates = {};
  updates[`rooms/${roomId}/game`] = null;
  updates[`rooms/${roomId}/setup`] = null;
  // updates[`rooms/${roomId}/selections`] = null; // Keep mode selection for rematch
  updates[`rooms/${roomId}/rematch`] = null;
  // Note: We keep players to maintain connection, but might swap colors locally
  firebase.database().ref().update(updates);
}