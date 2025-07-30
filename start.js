// Simple start script for production
require("dotenv").config()

console.log("Starting Lendsqr Wallet Service...")
console.log("Environment:", process.env.NODE_ENV)
console.log("Port:", process.env.PORT)

// Start the main server
require("./dist/server.js")
