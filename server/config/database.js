const mongoose = require("mongoose")

// Database connection configuration function
const connectDB = async () => {
  try {
    const conn = await mongoose.connect("mongodb+srv://Vishnu:vishnu2005@cluster0.z1rrgh7.mongodb.net/CricketApp")
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error("Database connection error:", error)
    process.exit(1)
  }
}

module.exports = connectDB
