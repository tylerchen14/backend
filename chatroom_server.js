const io = require('socket.io')(4020, {
  cors: {
    origin: ["http://localhost:3001"],
  }
});

// 確認連線
io.on('connection', socket => {
  console.log(socket.id);

  socket.on('sendComment', comment => {
    io.emit('receiveComment', comment)
  })
})