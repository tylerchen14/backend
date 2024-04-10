const express = require('express');
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

io.origins(["*:*"]);

const { v4: uuidV4 } = require('uuid')

app.get('/05-streaming', (req, res) => {
  res.redirect(`/05-streaming/${uuidV4()}`)
})

app.get('/05-streaming/:room', (req, res) => {
  res.render('05-streaming', { room: req.params.room })
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

server.listen(3001)

