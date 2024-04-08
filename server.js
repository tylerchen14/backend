const express = require('express');
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server, {
  cors: {
    origin: ["http://localhost:3000"],
  }
})

const { v4: uuidV4 } = require('uuid')

app.get('/05-streaming', (req, res) => {
  res.redirect(`/05-streaming/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  return room = req.params.room
})

// 確認連線
io.on('connection', socket => {

  socket.on('sendComment', comment => {
    io.emit('receiveComment', comment)
  })

  socket.on('join-room', (room, user) => {
    socket.join(room)
    socket.to(room).broadcast.emit('user-connect', user)
  })

})

server.listen(3001, () => {
  console.log('listening on port 3001')
})

// const io = require('socket.io')(4020, {
//   cors: {
//     origin: ["http://localhost:3000"],
//   }
// });

// // 確認連線
// io.on('connection', socket => {
//   console.log(socket.id);

//   socket.on('sendComment', comment => {
//     io.emit('receiveComment', comment)
//   })
// })