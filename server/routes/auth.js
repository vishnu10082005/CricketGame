const express = require("express")
const User = require("../models/User")
const router = express.Router()

// User registration endpoint with validation
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body

    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" })
    }

    const user = new User({ username, password })
    await user.save()

    res.status(201).json({ message: "User registered successfully", username })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// User login endpoint with credentials
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    const user = await User.findOne({ username, password })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    res.json({ message: "Login successful", username })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
