// Socket event constants and handlers

// Socket event names for consistency
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: "connect",
  DISCONNECT: "disconnect",

  // Room events
  JOIN_ROOM: "join-room",
  ROOM_UPDATED: "room-updated",

  // Game events
  START_SELECTION: "start-selection",
  SELECTION_STARTED: "selection-started",
  SELECT_PLAYER: "select-player",
  PLAYER_SELECTED: "player-selected",
  SELECTION_ENDED: "selection-ended",

  // Error events
  ERROR: "error",
}

// Import the io function from socket.io-client
import { io } from "socket.io-client"

// Socket event handler utility functions
export const createSocketHandlers = (socket, callbacks) => {
  // Setup all socket event listeners
  Object.entries(callbacks).forEach(([event, callback]) => {
    socket.on(event, callback)
  })

  // Cleanup function for removing listeners
  return () => {
    Object.keys(callbacks).forEach((event) => {
      socket.off(event)
    })
  }
}

// Socket connection utility with reconnection
export const createSocketConnection = (url, options = {}) => {
  const socket = io(url, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
    ...options,
  })

  return socket
}
