const express = require('express');
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
  },
});

// 確認連線
io.on('connection', socket => {
  console.log(`用戶ID是 ${socket.id}`);

  // 聊天室
  const handleJoinRoom = (room) => {
    socket.join(room)
    console.log(`房間是 ${room}`);
    updateLiveStatus(room);
  }

  const handleSendComment = (newComment, room) => {
    io.to(room).emit('receiveComment', newComment)
    console.log({ newComment }, { room });
  }

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

  // 視訊
  socket.on('join-room', (room, id) => {
    socket.join(room)
    socket.broadcast.to(room).emit('user-connected', id)
  })
})

server.listen(3001, () => {
  console.log(`正在連線伺服器 3001`)
})
