const express = require('express');
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const { v4: uuidV4 } = require('uuid')

app.get('/05-streaming/', (req, res) => {
  res.redirect(`/05-streaming/${uuidV4()}`)
})

io.on('connection', socket => {
  socket.on('join-room', (room, user) => {
    socket.join(room)
    socket.to(room).broadcast.emit('user-connect', user)
  })
})

server.listen(3000, () => {
  console.log('listening on port 3030')
})