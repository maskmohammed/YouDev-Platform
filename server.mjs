import { createServer } from "node:http"
import next from "next"
import { Server } from "socket.io"

const dev = process.env.NODE_ENV !== "production"
const hostname = process.env.HOSTNAME || "localhost"
const port = Number.parseInt(process.env.PORT || "3000", 10)

const app = next({
  dev,
  hostname,
  port,
})

const handle = app.getRequestHandler()

await app.prepare()

const httpServer = createServer((request, response) => {
  handle(request, response)
})

const io = new Server(httpServer, {
  path: "/api/socket",
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
})

globalThis.__youdevIO = io

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`)

  socket.emit("youdev.connected", {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  })

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected: ${socket.id} | ${reason}`)
  })
})

httpServer.listen(port, () => {
  console.log(`> YouDev ready on http://${hostname}:${port}`)
  console.log(`> Socket.IO ready on path /api/socket`)
})