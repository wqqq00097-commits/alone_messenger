import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'http'

const app = express()
const port = process.env.PORT ? Number(process.env.PORT) : 3000
const host = process.env.HOST || '0.0.0.0'

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const peers = new Set()

app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.send('Messenger relay server is running.')
})

wss.on('connection', (socket) => {
  peers.add(socket)
  console.log('Peer connected', peers.size)

  socket.on('message', (message) => {
    const data = message.toString()
    for (const peer of peers) {
      if (peer !== socket && peer.readyState === peer.OPEN) {
        peer.send(data)
      }
    }
  })

  socket.on('close', () => {
    peers.delete(socket)
    console.log('Peer disconnected', peers.size)
  })
})

server.listen(port, host, () => {
  console.log(`Messenger relay server listening at http://${host}:${port}`)
  console.log('Use this server as the relay endpoint for remote chat clients.')
})
