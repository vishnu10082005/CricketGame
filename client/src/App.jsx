"use client"

import { useState, useEffect } from "react"
import Login from "./components/Login/Login.jsx"
import Register from "./components/Register/Register.jsx"
import Dashboard from "./components/Dashboard/Dashboard.jsx"
import RoomPage from "./components/RoomPage/RoomPage.jsx"
import "./App.css"

// Main application component with routing
function App() {
  const [currentPage, setCurrentPage] = useState("login")
  const [user, setUser] = useState(null)
  const [roomCode, setRoomCode] = useState("")

  // Check for existing user session
  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      setUser(savedUser)
      setCurrentPage("dashboard")
    }
  }, [])

  // Handle user logout and cleanup
  const handleLogout = () => {
    localStorage.removeItem("user")
    setUser(null)
    setCurrentPage("login")
  }

  // Navigate to room page function
  const handleJoinRoom = (code) => {
    setRoomCode(code)
    setCurrentPage("room")
  }

  // Render current page based on state
  const renderCurrentPage = () => {
    switch (currentPage) {
      case "login":
        return <Login setCurrentPage={setCurrentPage} setUser={setUser} />
      case "register":
        return <Register setCurrentPage={setCurrentPage} />
      case "dashboard":
        return <Dashboard user={user} onLogout={handleLogout} onJoinRoom={handleJoinRoom} />
      case "room":
        return <RoomPage user={user} roomCode={roomCode} onLeaveRoom={() => setCurrentPage("dashboard")} />
      default:
        return <Login setCurrentPage={setCurrentPage} setUser={setUser} />
    }
  }

  return <div className="App">{renderCurrentPage()}</div>
}

export default App
