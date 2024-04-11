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
  console.log(`連線成功，用戶號碼為 ${socket.id}`);

  // 聊天室

  socket.on('joinRoom', room => {
    socket.join(room)
  })

  socket.on('sendComment', (comment, room) => {
    io.to(room).emit('receiveComment', comment)
  })

  // 視訊
  socket.on('join-room', (room, id) => {
    socket.join(room)
    socket.to(room).broadcast.emit('user-connected', id)
  })
})

server.listen(3001, () => {
  console.log(`正在連線伺服器 3001`)
})
