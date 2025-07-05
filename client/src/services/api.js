// API service functions for server communication

const API_BASE_URL = "http://localhost:5000/api"

// Create fetch wrapper with error handling
const fetchWithErrorHandling = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Request failed")
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Authentication API calls
export const authAPI = {
  // Login user with credentials
  login: async (credentials) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  },

  // Register new user account
  register: async (userData) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      body: JSON.stringify(userData),
    })
  },
}

// Room management API calls
export const roomAPI = {
  // Create new game room
  createRoom: async (username) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/rooms/create`, {
      method: "POST",
      body: JSON.stringify({ username }),
    })
  },

  // Get room details by code
  getRoomDetails: async (roomCode) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/rooms/${roomCode}`)
  },
}
