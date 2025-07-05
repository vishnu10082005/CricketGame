"use client"

import { useState } from "react"
import "./Dashboard.css"

// Dashboard component for room management
const Dashboard = ({ user, onLogout, onJoinRoom }) => {
  const [roomCode, setRoomCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Create new room function
  const handleCreateRoom = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("http://localhost:5000/api/rooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: user }),
      })

      const data = await response.json()

      if (response.ok) {
        onJoinRoom(data.roomCode)
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError("Failed to create room. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Join existing room function
  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`http://localhost:5000/api/rooms/${roomCode}`)
      const data = await response.json()

      if (response.ok) {
        onJoinRoom(roomCode)
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError("Failed to join room. Please check the room code.")
    } finally {
      setLoading(false)
    }
  }

  // Handle room code input change
  const handleRoomCodeChange = (e) => {
    setRoomCode(e.target.value.toUpperCase())
    setError("")
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h2>Welcome, {user}! 🏏</h2>
            <p>Ready to select your cricket team?</p>
          </div>
          <button className="btn btn-danger logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>

        <div className="dashboard-content">
          <div className="game-info">
            <h3>Cricket Team Selection</h3>
            <p>Create a new room or join an existing one to start playing</p>
          </div>

          <div className="room-actions">
            <div className="create-room-section">
              <div className="action-card">
                <h4>🆕 Create New Room</h4>
                <p>Start a new game and invite friends</p>
                <button className="btn btn-primary action-btn" onClick={handleCreateRoom} disabled={loading}>
                  {loading ? "Creating..." : "Create Room"}
                </button>
              </div>
            </div>

            <div className="join-room-section">
              <div className="action-card">
                <h4>🚪 Join Existing Room</h4>
                <p>Enter room code to join a game</p>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Enter room code (e.g., ABC123)"
                    value={roomCode}
                    onChange={handleRoomCodeChange}
                    maxLength={6}
                    className="room-code-input"
                  />
                </div>
                <button
                  className="btn btn-secondary action-btn"
                  onClick={handleJoinRoom}
                  disabled={loading || !roomCode.trim()}
                >
                  {loading ? "Joining..." : "Join Room"}
                </button>
              </div>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="game-rules">
            <h4>🎮 How to Play</h4>
            <ul>
              <li>Each player selects 5 cricket players</li>
              <li>Take turns in random order</li>
              <li>10 seconds per turn to select</li>
              <li>Auto-selection if time runs out</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
