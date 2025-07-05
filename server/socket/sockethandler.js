const Room = require("../models/room")

// Main socket connection handler function
module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Join room event handler
    socket.on("join-room", async (data) => {
      try {
        const { roomCode, username } = data
        const room = await Room.findOne({ roomCode })

        if (!room) {
          socket.emit("error", { message: "Room not found" })
          return
        }

        // Add player if not exists
        const existingPlayer = room.players.find((p) => p.username === username)
        if (!existingPlayer) {
          room.players.push({
            username,
            selectedPlayers: [],
            isReady: false,
          })
          await room.save()
        }

        socket.join(roomCode)
        socket.roomCode = roomCode
        socket.username = username

        io.to(roomCode).emit("room-updated", room)
      } catch (error) {
        socket.emit("error", { message: "Failed to join room" })
      }
    })

    // Start selection event handler
    socket.on("start-selection", async (data) => {
      try {
        const { roomCode } = data
        const room = await Room.findOne({ roomCode })

        if (!room || room.host !== socket.username) {
          socket.emit("error", { message: "Only host can start" })
          return
        }

        // Randomize turn order for fairness
        const turnOrder = [...room.players.map((p) => p.username)].sort(() => Math.random() - 0.5)

        room.gameState.isStarted = true
        room.gameState.turnOrder = turnOrder
        room.gameState.currentTurn = turnOrder[0]
        room.gameState.turnStartTime = new Date()

        await room.save()

        io.to(roomCode).emit("selection-started", {
          turnOrder,
          currentTurn: turnOrder[0],
          availablePlayers: room.gameState.availablePlayers,
        })

        // Start turn timer for player
        startTurnTimer(roomCode, turnOrder[0])
      } catch (error) {
        socket.emit("error", { message: "Failed to start selection" })
      }
    })

    // Player selection event handler
    socket.on("select-player", async (data) => {
      try {
        const { roomCode, playerName } = data
        const room = await Room.findOne({ roomCode })

        if (!room || room.gameState.currentTurn !== socket.username) {
          socket.emit("error", { message: "Not your turn" })
          return
        }

        // Process player selection and update
        await processPlayerSelection(room, socket.username, playerName, io)
      } catch (error) {
        socket.emit("error", { message: "Selection failed" })
      }
    })

    // Socket disconnection cleanup handler
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)
    })
  })

  // Turn timer function for auto-selection
  const startTurnTimer = (roomCode, username) => {
    setTimeout(async () => {
      try {
        const room = await Room.findOne({ roomCode })
        if (room && room.gameState.currentTurn === username) {
          // Auto-select random available player
          const availablePlayers = room.gameState.availablePlayers
          if (availablePlayers.length > 0) {
            const randomPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)]
            await processPlayerSelection(room, username, randomPlayer, io, true)
          }
        }
      } catch (error) {
        console.error("Auto-selection error:", error)
      }
    }, 10000) // 10 second timer
  }

  // Process player selection logic function
  const processPlayerSelection = async (room, username, playerName, io, isAutoSelected = false) => {
    // Remove player from available pool
    room.gameState.availablePlayers = room.gameState.availablePlayers.filter((p) => p !== playerName)

    // Add to user's selected players
    const player = room.players.find((p) => p.username === username)
    player.selectedPlayers.push(playerName)

    // Determine next turn in sequence
    const currentIndex = room.gameState.turnOrder.indexOf(username)
    const nextIndex = (currentIndex + 1) % room.gameState.turnOrder.length

    // Check if round is complete
    const allPlayersHave5 = room.players.every((p) => p.selectedPlayers.length === 5)

    if (allPlayersHave5) {
      room.gameState.isStarted = false
      room.gameState.currentTurn = ""
      await room.save()

      io.to(room.roomCode).emit("selection-ended", {
        finalTeams: room.players.map((p) => ({
          username: p.username,
          selectedPlayers: p.selectedPlayers,
        })),
      })

      // Auto-redirect users to dashboard after 10 seconds
      setTimeout(() => {
        io.to(room.roomCode).emit("game-completed", {
          message: "Game completed! Redirecting to dashboard...",
        })
      }, 10000) // 10 second delay to show results
    } else {
      room.gameState.currentTurn = room.gameState.turnOrder[nextIndex]
      room.gameState.turnStartTime = new Date()
      await room.save()

      io.to(room.roomCode).emit("player-selected", {
        selectedBy: username,
        playerName,
        isAutoSelected,
        nextTurn: room.gameState.currentTurn,
        availablePlayers: room.gameState.availablePlayers,
        roomState: room,
      })

      // Start timer for next player
      startTurnTimer(room.roomCode, room.gameState.currentTurn)
    }
  }
}
