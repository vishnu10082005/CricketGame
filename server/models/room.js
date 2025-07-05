const mongoose = require("mongoose")

// Room schema for game session
const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
    },
    host: {
      type: String,
      required: true,
    },
    players: [
      {
        username: String,
        selectedPlayers: [String],
        isReady: Boolean,
      },
    ],
    gameState: {
      isStarted: Boolean,
      currentTurn: String,
      turnOrder: [String],
      availablePlayers: [String],
      turnStartTime: Date,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Room", roomSchema)
