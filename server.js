import express from 'express';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
const app = express()
const server = new HttpServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:3000',
  },
});

app.use(express.json());

import cors from "cors";
import db from './utils/mysql2_connect.js';
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    callback(null, true);
  },
};
app.use(cors(corsOptions));

// 確認有連線
app.get('/try-connect', async (req, res) => {
  const sql = `SELECT * FROM mb_user`
  const [rows] = await db.query(sql)
  res.json(rows)
})

// 抓用戶資料
app.get('/05-streaming/u-info/:pid', async (req, res) => {
  let pid = req.params.pid
  const sql = `SELECT * FROM mb_user WHERE id=?`
  let [rows] = await db.query(sql, [pid])
  res.json(rows)
})

// 抓用戶圖片
app.get('/user-pic/:pid', async (req, res) => {
  let pid = req.params.pid
  const sql = `SELECT * FROM mb_user_profile WHERE user_id=?`
  let [rows] = await db.query(sql, [pid])
  res.json(rows)
})

// 計算所有點數
app.get('/05-streaming/u-point/:pid', async (req, res) => {
  let pid = req.params.pid

  // 共擁有多少點數
  const t_sql = `SELECT * FROM tyler_get_point WHERE user_id=?`
  let [t_rows] = await db.query(t_sql, [pid])
  let totalGet = t_rows.reduce((acc, row) => acc + row.has_point, 0);

  // 共消耗多少點數
  const u_sql = `SELECT * FROM tyler_use_point WHERE user_id=?`
  let [u_rows] = await db.query(u_sql, [pid])
  let totalUse = u_rows.reduce((acc, row) => acc + row.point_use, 0);

  let leftPoints = totalGet - totalUse

  res.json(leftPoints);
})

// 新增點數
app.post('/add-point', async (req, res) => {

  const { userId } = req.body
  let points = 1000;
  let source = "頭像獎勵"

  const sql = `INSERT INTO tyler_get_point (user_id, has_point, source, time_has_point) VALUES (?, ?, ?, CURRENT_TIMESTAMP())`
  let [rows] = await db.query(sql, [userId, points, source])
  res.json(rows)
})

// 刪除點數
app.post('/use-point', async (req, res) => {

  const { userId, points, source } = req.body
  console.log(req.body);

  const sql = `INSERT INTO tyler_use_point (user_id, point_use, gift, time_use_point) VALUES (?, ?, ?, CURRENT_TIMESTAMP())`
  let [rows] = await db.query(sql, [userId, points, source])
  res.json(rows)
})

// 登陸主播號碼
app.post('/stream-logon', async (req, res) => {

  const { streamId } = req.body
  const streamerName = "tyler"

  let sql = 'INSERT INTO tyler_stream (stream_code, time, streamer_name	) VALUES (?,  CURRENT_TIMESTAMP(),?)'
  let [rows] = await db.query(sql, [streamId, streamerName])
  res.json(rows)
})

app.get('/watch-stream/:name', async (req, res) => {

  const name = req.params.name

  const sql = `SELECT * FROM tyler_stream WHERE streamer_name=? ORDER BY time DESC LIMIT 1`
  let [rows] = await db.query(sql, [name])
  res.json(rows)
})

app.post('/give-streamer-point', async (req, res) => {

  const { name, gift, point } = req.body

  let sql = 'INSERT INTO tyler_streamer_get_point (streamer_name, gift, get_point, time) VALUES (?, ?, ?, CURRENT_TIMESTAMP())'
  let [rows] = await db.query(sql, [name, gift, point])
  res.json(rows)
})

app.get('/totalBonus/:name', async (req, res) => {
  const name = req.params.name

  const sql = `SELECT * FROM tyler_streamer_get_point WHERE streamer_name=?`
  let [rows] = await db.query(sql, [name])
  let totalPoints = rows.reduce((acc, row) => acc + row.get_point, 0);
  res.json(totalPoints)
})


let viewerIdList = [];
// let roomName = ""

// 確認連線
io.on('connection', socket => {

  const handleSendComment = (newComment, room) => {
    io.to(room).emit('receiveComment', newComment)
  }

  const handlePinnedComment = (pinI, pinP, pinN, pinC, roomCode) => {
    io.to(roomCode).emit('pinnedAll', pinI, pinP, pinN, pinC)
  }

  const handleUnpinComment = (roomCode) => {
    io.to(roomCode).emit("unpinAll")
  }


  // FIXME:人數在離開時對不上
  const updateLiveStatus = (room) => {
    const users = io.sockets.adapter.rooms.get(room);
    if (users) {
      const liveNum = users.size;
      console.log(` 目前 '${room}' 中有 ${liveNum} 人`);
      io.to(room).emit("updateLiveNum", liveNum)
    } else {
      console.log(`房間 ${room} 没有用戶`);
      io.to(room).emit("updateLiveNum", 0)
    }
  }

  const handleUpdateBonus = (data, roomCode) => {
    socket.to(roomCode).emit("updateBonus", data)
  }

  const handleSendTitle = (title, room) => {
    io.to(room).emit("sendTitle", title)
  }

  const handleSendDescript = (description, room) => {
    io.to(room).emit("sendDescript", description)
  }
  

  socket.on('sendComment', handleSendComment)
  socket.on('pinnedComment', handlePinnedComment)
  socket.on('unpinComment', handleUnpinComment)
  socket.on('totalBonus', handleUpdateBonus)
  socket.on('sendTitle', handleSendTitle)
  socket.on('sendDescript', handleSendDescript)

  // 視訊
  const handleCheckRole = (id, role) => {

    if (role == 'isStreamer') {
      socket.emit('streamerStart', id)
      socket.join(id)
      console.log(`主播 ${id} 登入`);
      updateLiveStatus(id);
      // roomName = id;
      // console.log({roomName});
    } else {
      socket.emit('viewerGo', id, socket.id)
      console.log(`觀眾 ${id} 登入`);
    }
  };

  const handleJoinStreamerRoom = (roomCode) => {
    socket.join(roomCode)
    updateLiveStatus(roomCode);
    console.log({roomCode});
    console.log(`一人登入 ${roomCode}`)
  }

  const handleUserEnter = (userData, roomCode) => {
    const item = viewerIdList.find(el => el.viewerId === userData.viewerId)

    if (item) {
      console.log('已經在聊天室了');
    } else if (userData.viewerId === "") {
      console.log(`你送空ID`);
    } else {
      viewerIdList.push(userData)
      io.to(roomCode).emit('userGo', viewerIdList)
      console.log({ viewerIdList });
    }
  }

  const handleShowGift = (roomCode, giftRain) => {
    io.to(roomCode).emit('showGift', giftRain)
  }

  const handleDisconnect = () => {
    const i = viewerIdList.findIndex(viewer => viewer.socketId === socket.id);
    console.log({ i });
    if (i !== -1) {
      viewerIdList.splice(i, 1)
      io.emit('userGo', viewerIdList)
    }
    // updateLiveStatus(roomName)
    // console.log(`退出房${roomName}`);
    console.log(`${socket.id}用戶退出`);
  }

  socket.on('check-role', handleCheckRole)
  socket.on('joinRoom', handleJoinStreamerRoom)
  socket.on('userEnter', handleUserEnter)
  socket.on('showGift', handleShowGift)
  socket.on('disconnecting', handleDisconnect)
})

let port = process.env.WEB_PORT || 3010

server.listen(port, () => {
  console.log(`正在連線伺服器 ${port}`)
})