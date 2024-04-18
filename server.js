import express from 'express'
const app = express()
import { Server as HttpServer } from 'http';
const server = new HttpServer(app);
import { Server as SocketIOServer } from 'socket.io';
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:3000',
  },
});

app.use(express.json());

import db from './utils/mysql2_connect.js';
import cors from "cors";
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
  let points = 100;
  let source = "頭像獎勵"

  const sql = `INSERT INTO tyler_get_point (user_id, has_point, source, time_has_point) VALUES (?, ?, ?, CURRENT_TIMESTAMP())`
  let [rows] = await db.query(sql, [userId, points, source])
  res.json(rows)
})

// 刪除點數
app.post('/use-point', async (req, res) => {

  const { userId, points, source } = req.body
  console.log(req.body);

  const sql = `INSERT INTO tyler_use_point (user_id, point_use, effect_id, time_use_point) VALUES (?, ?, ?, CURRENT_TIMESTAMP())`
  let [rows] = await db.query(sql, [userId, points, source])
  res.json(rows)
})

// 確認連線
io.on('connection', socket => {
  // console.log(`用戶ID ${socket.id} 已連線`);
  // 聊天室
  const handleJoinRoom = (room) => {
    socket.join(room)
    updateLiveStatus(room);
  }

  const handleSendComment = (newComment, room) => {
    io.to(room).emit('receiveComment', newComment)
  }

  const handlePinnedComment = (pinI, pinP, pinN, pinC) => {
    io.emit('pinnedAll', pinI, pinP, pinN, pinC)
  }

  const handleUnpinComment = () => {
    io.emit("unpinAll")
  }

  // const handleGiveGift = (createGiftArray) => {
  //   socket.broadcast.emit('giveGiftToRoom', createGiftArray)
  // }

  const updateLiveStatus = (room) => {
    const users = io.sockets.adapter.rooms.get(room);
    if (users) {
      const liveNum = users.size;
      console.log(` 目前 '${room}' 中有 ${liveNum} 人`);
      io.to(room).emit("updateLiveNum", liveNum)
    } else {
      console.log(`房間 ${room} 没有用戶`);
    }
  }

  socket.on('joinRoom', handleJoinRoom);
  socket.on('sendComment', handleSendComment)
  socket.on('pinnedComment', handlePinnedComment)
  socket.on('unpinComment', handleUnpinComment)
  // socket.on('giveGive', handleGiveGift)

  // 視訊
  const handleJoinVideoRoom = (room, id, role) => {

    socket.join(room);
    console.log({ room });

    if (role === 'isStreamer') {
      socket.emit('streamerStart', id)
      console.log(`主播 ${id} 加入房間 ${room}`);
    } else {
      socket.emit('viewerGo', id)
      console.log(`觀眾 ${id} 加入房間 ${room}`)
    }
  };

  socket.on('join-room', handleJoinVideoRoom)
})

let port = process.env.WEB_PORT || 3010

server.listen(port, () => {
  console.log(`正在連線伺服器 ${port}`)
})