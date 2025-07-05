"use client"

import { useState, useEffect, useCallback } from "react"
import io from "socket.io-client"
import "./RoomPage.css"

// Room page component for game
const RoomPage = ({ user, roomCode, onLeaveRoom }) => {
  const [socket, setSocket] = useState(null)
  const [roomData, setRoomData] = useState(null)
  const [gameState, setGameState] = useState({
    isStarted: false,
    currentTurn: "",
    turnOrder: [],
    availablePlayers: [],
    timeLeft: 10,
  })
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [message, setMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  // Add state for countdown timer
  const [redirectCountdown, setRedirectCountdown] = useState(0)

  // Initialize socket connection on mount
  useEffect(() => {
    const newSocket = io("http://localhost:5000")
    setSocket(newSocket)

    // Connection event handlers
    newSocket.on("connect", () => {
      setIsConnected(true)
      newSocket.emit("join-room", { roomCode, username: user })
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
    })

    // Game event listeners setup
    newSocket.on("room-updated", (room) => {
      setRoomData(room)
    })

    newSocket.on("selection-started", (data) => {
      setGameState({
        isStarted: true,
        currentTurn: data.currentTurn,
        turnOrder: data.turnOrder,
        availablePlayers: data.availablePlayers,
        timeLeft: 10,
      })
      setMessage(`🎮 Game started! Turn order: ${data.turnOrder.join(" → ")}`)
    })

    newSocket.on("player-selected", (data) => {
      setGameState((prev) => ({
        ...prev,
        currentTurn: data.nextTurn,
        availablePlayers: data.availablePlayers,
        timeLeft: 10, // Reset timer for next player
      }))
      setRoomData(data.roomState)

      const autoText = data.isAutoSelected ? " (Auto-selected ⏰)" : ""
      setMessage(`✅ ${data.selectedBy} selected ${data.playerName}${autoText}`)
    })

    // Update the selection-ended event handler
    newSocket.on("selection-ended", () => {
      setGameState((prev) => ({ ...prev, isStarted: false, timeLeft: 0 }))
      setMessage("🎉 Game completed! Final teams displayed below.")
      setRedirectCountdown(5) // Start 5 second countdown
    })

    newSocket.on("game-completed", (data) => {
      setMessage(data.message)
      setRedirectCountdown(1) // Final 1 second countdown
      setTimeout(() => {
        onLeaveRoom()
      }, 1000)
    })

    newSocket.on("error", (data) => {
      setMessage(`❌ Error: ${data.message}`)
    })

    return () => {
      newSocket.close()
    }
  }, [roomCode, user, onLeaveRoom])

  // Timer countdown effect for turns - Fixed to count down properly
  useEffect(() => {
    let timer
    if (gameState.isStarted && gameState.currentTurn === user && gameState.timeLeft > 0) {
      timer = setInterval(() => {
        setGameState((prev) => {
          const newTimeLeft = prev.timeLeft - 1
          return {
            ...prev,
            timeLeft: Math.max(0, newTimeLeft), // Ensure it doesn't go below 0
          }
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [gameState.isStarted, gameState.currentTurn, gameState.timeLeft, user])

  // Add countdown effect after game completion
  useEffect(() => {
    let countdownTimer
    if (redirectCountdown > 0) {
      countdownTimer = setInterval(() => {
        setRedirectCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(countdownTimer)
  }, [redirectCountdown])

  // Start game function for host
  const handleStartGame = useCallback(() => {
    if (socket && isConnected) {
      socket.emit("start-selection", { roomCode })
    }
  }, [socket, isConnected, roomCode])

  // Select player function for turn
  const handleSelectPlayer = useCallback(() => {
    if (socket && selectedPlayer && isConnected) {
      socket.emit("select-player", { roomCode, playerName: selectedPlayer })
      setSelectedPlayer("")
    }
  }, [socket, selectedPlayer, isConnected, roomCode])

  // Handle player selection change
  const handlePlayerChange = (e) => {
    setSelectedPlayer(e.target.value)
  }

  // Check if current user is host
  const isHost = roomData && roomData.host === user
  const isMyTurn = gameState.currentTurn === user

  // Check if any player has completed their team (5 players)
  const hasCompletedTeams = roomData?.players.some((p) => p.selectedPlayers.length >= 5) || false

  // Check if current user's team is complete
  const myTeamComplete = roomData?.players.find((p) => p.username === user)?.selectedPlayers.length >= 5

  return (
    <div className="room-container">
      <div className="room-header">
        <div className="room-info">
          <h2>🏏 Room: {roomCode}</h2>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}>
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onLeaveRoom}>
          Leave Room
        </button>
      </div>

      {message && (
        <div className="message-banner">
          <p>{message}</p>
          {redirectCountdown > 0 && (
            <div className="countdown-timer">Redirecting to dashboard in {redirectCountdown} seconds...</div>
          )}
        </div>
      )}

      <div className="room-content">
        <div className="players-section">
          <h3>👥 Players in Room ({roomData?.players.length || 0})</h3>
          <div className="players-list">
            {roomData?.players.map((player, index) => (
              <div key={index} className={`player-card ${player.username === user ? "current-user" : ""}`}>
                <div className="player-header">
                  <h4>
                    {player.username === user ? "👤 You" : player.username}
                    {player.username === roomData.host && " 👑"}
                    {gameState.currentTurn === player.username && gameState.isStarted && " ⏰"}
                  </h4>
                </div>
                <div className="selected-players">
                  <h5>Selected Players ({player.selectedPlayers.length}/5):</h5>
                  {player.selectedPlayers.length > 0 ? (
                    <div className="player-tags">
                      {player.selectedPlayers.map((p, i) => (
                        <span key={i} className="player-tag">
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="no-players">No players selected yet</p>
                  )}
                </div>
                {/* Show completion status */}
                {player.selectedPlayers.length === 5 && <div className="team-complete">✅ Team Complete!</div>}
                {/* Show progress for incomplete teams */}
                {player.selectedPlayers.length < 5 && gameState.isStarted && (
                  <div className="team-progress">
                    Need {5 - player.selectedPlayers.length} more player
                    {5 - player.selectedPlayers.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="game-section">
          {!gameState.isStarted && roomData?.players.every((p) => p.selectedPlayers.length === 5) ? (
            <div className="game-completed">
              <h3>🎉 Game Completed!</h3>
              <div className="final-teams">
                <h4>🏆 Final Teams:</h4>
                {roomData.players.map((player, index) => (
                  <div key={index} className="final-team">
                    <h5>{player.username}'s Team:</h5>
                    <div className="final-team-players">
                      {player.selectedPlayers.map((p, i) => (
                        <span key={i} className="final-player-tag">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={onLeaveRoom}>
                🏠 Return to Dashboard
              </button>
            </div>
          ) : !gameState.isStarted ? (
            <div className="game-controls">
              <h3>🎮 Game Setup</h3>
              {isHost ? (
                <div className="host-controls">
                  {hasCompletedTeams ? (
                    <div className="game-disabled">
                      <p>⚠️ Cannot start game - some teams are already completed!</p>
                      <p>All players must have 0 players to start a new game.</p>
                    </div>
                  ) : (
                    <>
                      <p>You are the host. Start the game when ready!</p>
                      <button className="btn btn-primary start-btn" onClick={handleStartGame}>
                        🚀 Start Team Selection
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="waiting-message">
                  {hasCompletedTeams ? (
                    <p>⚠️ Game cannot start - teams already completed</p>
                  ) : (
                    <p>⏳ Waiting for host to start the game...</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="game-active">
              <div className="turn-info">
                <h3>{isMyTurn ? "🎯 Your Turn!" : `⏳ ${gameState.currentTurn}'s Turn`}</h3>
                {isMyTurn && !myTeamComplete && (
                  <div className="timer">
                    ⏰ Time left: {gameState.timeLeft}s
                    {gameState.timeLeft === 0 && <span className="auto-select-warning"> - Auto-selecting...</span>}
                  </div>
                )}
                {myTeamComplete && isMyTurn && (
                  <div className="team-complete-message">✅ Your team is complete! Waiting for others...</div>
                )}
              </div>

              {isMyTurn && !myTeamComplete && (
                <div className="player-selection">
                  <h4>🏏 Select a Cricket Player:</h4>
                  <div className="selection-controls">
                    <select value={selectedPlayer} onChange={handlePlayerChange} className="player-select">
                      <option value="">Choose a player...</option>
                      {gameState.availablePlayers.map((player, index) => (
                        <option key={index} value={player}>
                          {player}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary select-btn"
                      onClick={handleSelectPlayer}
                      disabled={!selectedPlayer}
                    >
                      ✅ Select Player
                    </button>
                  </div>
                </div>
              )}

              <div className="available-players">
                <h4>🏏 Available Players ({gameState.availablePlayers.length}):</h4>
                <div className="players-grid">
                  {gameState.availablePlayers.map((player, index) => (
                    <div
                      key={index}
                      className={`available-player ${selectedPlayer === player ? "selected" : ""}`}
                      onClick={() => isMyTurn && !myTeamComplete && setSelectedPlayer(player)}
                    >
                      {player}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoomPage
