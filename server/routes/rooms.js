const express = require("express")
const Room = require("../models/room")
const router = express.Router()

// Generate random room code function
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Cricket players pool for selection
const cricketPlayers = [
  "Virat Kohli",
  "Rohit Sharma",
  "MS Dhoni",
  "Hardik Pandya",
  "Jasprit Bumrah",
  "KL Rahul",
  "Rishabh Pant",
  "Ravindra Jadeja",
  "Mohammed Shami",
  "Yuzvendra Chahal",
  "Shikhar Dhawan",
  "Bhuvneshwar Kumar",
  "Dinesh Karthik",
  "Shreyas Iyer",
  "Ishan Kishan",
  "Axar Patel",
  "Deepak Chahar",
  "Suryakumar Yadav",
  "Washington Sundar",
  "Shardul Thakur",
]

// Create new room endpoint
router.post("/create", async (req, res) => {
  try {
    const { username } = req.body
    const roomCode = generateRoomCode()

    const room = new Room({
      roomCode,
      host: username,
      players: [
        {
          username,
          selectedPlayers: [],
          isReady: false,
        },
      ],
      gameState: {
        isStarted: false,
        currentTurn: "",
        turnOrder: [],
        availablePlayers: [...cricketPlayers],
        turnStartTime: null,
      },
    })

    await room.save()
    res.json({ roomCode, message: "Room created successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// Get room details by code
router.get("/:roomCode", async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode })
    if (!room) {
      return res.status(404).json({ message: "Room not found" })
    }
    res.json(room)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
