const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")
const mongoose = require("mongoose")
const authRoutes = require("./routes/auth")
const roomRoutes = require("./routes/rooms")
const socketHandler = require("./socket/sockethandler")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// Middleware setup for request parsing
app.use(cors())
app.use(express.json())

// MongoDB connection with error handling
mongoose
  .connect("mongodb+srv://Vishnu:vishnu2005@cluster0.z1rrgh7.mongodb.net/CricketApp")
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Route handlers for authentication endpoints
app.use("/api/auth", authRoutes)
app.use("/api/rooms", roomRoutes)

// Socket.IO connection handler for real-time
socketHandler(io)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
