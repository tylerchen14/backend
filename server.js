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
  console.log(`用戶ID ${socket.id} 已連線`);
  let activeStreams = {};

  // 聊天室
  const handleJoinRoom = (room, id) => {
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
  // const handleJoinVideoRoom = (roomId, id, streamPath) => {
  //   socket.join(roomId)
  //   socket.broadcast.to(roomId).emit('user-connected', id)
  //   console.log(`${id} 加入視訊房 ${roomId}`);
  // }

  const handleJoinVideoRoom = (roomId, id, streamPath) => {
    socket.join(roomId);
    activeStreams[roomId] = { streamerId: id, path: streamPath };
    socket.broadcast.to(roomId).emit('user-connected', id, streamPath);
    console.log(`${id} 加入視訊房 ${roomId}`);
  };

  socket.on('request-active-streams', () => {
    socket.emit('active-streams', activeStreams);
  });

  //   if (role === 'streamer') {
  //     socket.broadcast.to(room).emit('streamer-joined', id);
  //     console.log(`Streamer ${id} joined room ${room}`);
  // } else {
  //     socket.broadcast.to(room).emit('viewer-joined', id);
  //     console.log(`Viewer ${id} joined room ${room}`);
  // }

  // const handleLeaveVideoRoom = () => {
  //   if (socket.roomId) {
  //     socket.broadcast.to(socket.roomId).emit('user-disconnected', socket.id);
  //     console.log(`${socket.id} 離開視訊房 ${socket.roomId}`);
  //   }
  // }


  socket.on('join-room', handleJoinVideoRoom)
  // socket.on('disconnect', handleLeaveVideoRoom);

})

server.listen(3001, () => {
  console.log(`正在連線伺服器 3001`)
})
