
export function onStateChange(callback) {
  roomRef.on('value', snapshot => callback(snapshot.val()));
}

let db, roomRef;

export function initFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyCP8pzO-gnYpuyLlQ5GNhtLHsNT0QJEGOM",
        authDomain: "no-king-chess.firebaseapp.com",
        databaseURL: "https://no-king-chess-default-rtdb.firebaseio.com",
        projectId: "no-king-chess",
        storageBucket: "no-king-chess.firebasestorage.app",
        messagingSenderId: "806486248636",
        appId: "1:806486248636:web:80f46e5ec92e81d6d1d4b9"
      };

  const app = firebase.initializeApp(firebaseConfig);
  db = firebase.database(app);
}

export function createOrJoinRoom(roomId, onData) {
  roomRef = db.ref("rooms/" + roomId);
  roomRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) onData(data);
  });
}

export function sendState(state) {
  console.log("Sending state:", state);
  if (roomRef) {
    roomRef.update({ game: state }); // 只更新 game 字段
  }
}

export async function assignPlayerColor(roomId) {
  const roomRef = firebase.database().ref("rooms/" + roomId + "/players");
  const snapshot = await roomRef.once("value");
  const players = snapshot.val() || {};

  if (!players.player1) {
    await roomRef.child("player1").set("white");
    return { slot: "player1", color: "white" };
  } else if (!players.player2) {
    await roomRef.child("player2").set("black");
    return { slot: "player2", color: "black" };
  } else {
    return null; // 房间满了
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


