const Room = require("../models/room")

// Main socket connection handler function
module.exports = (io) => {
  const activeTimers = new Map() // Track active timers

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

        // Check if any player already has 5 players
        const hasCompletedTeams = room.players.some((p) => p.selectedPlayers.length >= 5)
        if (hasCompletedTeams) {
          socket.emit("error", { message: "Cannot start - teams already completed" })
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

        // Check if player already has 5 players
        const currentPlayer = room.players.find((p) => p.username === socket.username)
        if (currentPlayer.selectedPlayers.length >= 5) {
          socket.emit("error", { message: "You already have 5 players" })
          return
        }

        // Clear the timer for this player
        clearTurnTimer(roomCode, socket.username)

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
    // Clear any existing timer for this user
    clearTurnTimer(roomCode, username)

    const timerKey = `${roomCode}-${username}`
    const timer = setTimeout(async () => {
      try {
        const room = await Room.findOne({ roomCode })
        if (room && room.gameState.currentTurn === username && room.gameState.isStarted) {
          // Auto-select random available player
          const availablePlayers = room.gameState.availablePlayers
          const currentPlayer = room.players.find((p) => p.username === username)

          // Only auto-select if player doesn't have 5 players yet
          if (availablePlayers.length > 0 && currentPlayer.selectedPlayers.length < 5) {
            const randomPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)]
            await processPlayerSelection(room, username, randomPlayer, io, true)
          }
        }
      } catch (error) {
        console.error("Auto-selection error:", error)
      } finally {
        // Remove timer from active timers
        activeTimers.delete(timerKey)
      }
    }, 10000) // Exactly 10 seconds (auto-select at 0)

    // Store timer reference
    activeTimers.set(timerKey, timer)
  }

  // Clear turn timer function
  const clearTurnTimer = (roomCode, username) => {
    const timerKey = `${roomCode}-${username}`
    const timer = activeTimers.get(timerKey)
    if (timer) {
      clearTimeout(timer)
      activeTimers.delete(timerKey)
    }
  }

  // Process player selection logic function
  const processPlayerSelection = async (room, username, playerName, io, isAutoSelected = false) => {
    // Remove player from available pool
    room.gameState.availablePlayers = room.gameState.availablePlayers.filter((p) => p !== playerName)

    // Add to user's selected players
    const player = room.players.find((p) => p.username === username)
    player.selectedPlayers.push(playerName)

    // Clear any active timer for this player
    clearTurnTimer(room.roomCode, username)

    // Check if ALL players have exactly 5 players
    const allPlayersHave5 = room.players.every((p) => p.selectedPlayers.length === 5)

    // Check if current player has 5 players (for individual completion)
    const currentPlayerComplete = player.selectedPlayers.length === 5

    if (allPlayersHave5) {
      // Game is completely finished
      room.gameState.isStarted = false
      room.gameState.currentTurn = ""
      await room.save()

      io.to(room.roomCode).emit("selection-ended", {
        finalTeams: room.players.map((p) => ({
          username: p.username,
          selectedPlayers: p.selectedPlayers,
        })),
      })

      // Auto-redirect users to dashboard after 5 seconds
      setTimeout(() => {
        io.to(room.roomCode).emit("game-completed", {
          message: "Game completed! Redirecting to dashboard...",
        })
      }, 5000) // Reduced to 5 seconds
    } else {
      // Game continues - find next player who doesn't have 5 players
      let nextPlayerIndex = -1
      const currentIndex = room.gameState.turnOrder.indexOf(username)

      // Find next player who needs more players
      for (let i = 1; i <= room.gameState.turnOrder.length; i++) {
        const checkIndex = (currentIndex + i) % room.gameState.turnOrder.length
        const checkUsername = room.gameState.turnOrder[checkIndex]
        const checkPlayer = room.players.find((p) => p.username === checkUsername)

        if (checkPlayer.selectedPlayers.length < 5) {
          nextPlayerIndex = checkIndex
          break
        }
      }

      if (nextPlayerIndex !== -1) {
        room.gameState.currentTurn = room.gameState.turnOrder[nextPlayerIndex]
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
      } else {
        // This shouldn't happen, but handle edge case
        room.gameState.isStarted = false
        room.gameState.currentTurn = ""
        await room.save()

        io.to(room.roomCode).emit("selection-ended", {
          finalTeams: room.players.map((p) => ({
            username: p.username,
            selectedPlayers: p.selectedPlayers,
          })),
        })
      }
    }
  }
}
