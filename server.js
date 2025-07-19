const express = require("express")
const bodyParser = require("body-parser")
const fs = require("fs")
const path = require("path")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const { v4: uuidv4 } = require("uuid")

const app = express()
const PORT = process.env.PORT || 7860
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// Middleware
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname)))

// Helper functions for file operations
function readJSONFile(filePath) {
  try {
    const data = fs.readFileSync(filePath)
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

function writeJSONFile(filePath, data) {
  const dirPath = path.dirname(filePath)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

// File paths
const USERS_FILE = path.join(__dirname, "data", "users.json")
const TRANSACTIONS_FILE = path.join(__dirname, "data", "transactions.json")
const OTP_CODES_FILE = path.join(__dirname, "data", "otp-codes.json")

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"))
}

// Initialize files if they don't exist
if (!fs.existsSync(USERS_FILE)) {
  const adminUser = {
    id: uuidv4(),
    name: "Admin User",
    email: "admin@symbitex.com",
    password: bcrypt.hashSync("admin123", 10),
    balance: 500000000.0,
    isAdmin: true,
    status: "active",
    createdAt: new Date().toISOString(),
    btcWalletAddress: generateWalletAddress("btc"),
    ethWalletAddress: generateWalletAddress("eth"),
    usdtWalletAddress: generateWalletAddress("usdt"),
    btcBalance: 500000.0,
    ethBalance: 500000.0,
    usdtBalance: 500000000.0,
    otpValidated: true,
  }
  writeJSONFile(USERS_FILE, [adminUser])
}

if (!fs.existsSync(TRANSACTIONS_FILE)) {
  writeJSONFile(TRANSACTIONS_FILE, [])
}

if (!fs.existsSync(OTP_CODES_FILE)) {
  writeJSONFile(OTP_CODES_FILE, [])
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ success: false, message: "Access denied" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid or expired token" })
    }
    req.user = user
    next()
  })
}

// Admin middleware
function isAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ success: false, message: "Admin access required" })
  }
  next()
}

// Helper function to generate wallet address
function generateWalletAddress(tokenType) {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  let result = ""

  if (tokenType === "btc") {
    // Bitcoin address format
    result = "1"
    for (let i = 0; i < 33; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  } else if (tokenType === "eth" || tokenType === "usdt") {
    // Ethereum address format
    result = "0x"
    const hexChars = "0123456789abcdef"
    for (let i = 0; i < 40; i++) {
      result += hexChars.charAt(Math.floor(Math.random() * hexChars.length))
    }
  }

  return result
}

// Auth routes
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" })
  }

  const users = readJSONFile(USERS_FILE)
  if (users.some((user) => user.email === email)) {
    return res.status(400).json({ success: false, message: "Email already in use" })
  }

  const newUser = {
    id: uuidv4(),
    name,
    email,
    password: bcrypt.hashSync(password, 10),
    balance: 0,
    isAdmin: false,
    status: "active",
    createdAt: new Date().toISOString(),
    btcWalletAddress: generateWalletAddress("btc"),
    ethWalletAddress: generateWalletAddress("eth"),
    usdtWalletAddress: generateWalletAddress("usdt"),
    btcBalance: 0,
    ethBalance: 0,
    usdtBalance: 0,
    otpValidated: false,
  }

  users.push(newUser)
  writeJSONFile(USERS_FILE, users)

  const token = jwt.sign({ id: newUser.id, email: newUser.email, isAdmin: newUser.isAdmin }, JWT_SECRET, {
    expiresIn: "24h",
  })

  const { password: _, ...userWithoutPassword } = newUser
  res.status(201).json({ success: true, user: userWithoutPassword, token })
})

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" })
  }

  const users = readJSONFile(USERS_FILE)
  const user = users.find((user) => user.email === email)

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ success: false, message: "Invalid email or password" })
  }

  const token = jwt.sign({ id: user.id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: "24h" })

  const { password: _, ...userWithoutPassword } = user
  res.json({ success: true, user: userWithoutPassword, token })
})

// OTP validation endpoint
app.post("/api/auth/validate-otp", authenticateToken, (req, res) => {
  const { otpCode, userId, transactionData } = req.body

  if (!otpCode || !userId) {
    return res.status(400).json({ success: false, message: "OTP code and user ID are required" })
  }

  const otpCodes = readJSONFile(OTP_CODES_FILE)
  const users = readJSONFile(USERS_FILE)
  const user = users.find((u) => u.id === userId)

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" })
  }

  // Check if user has already been validated (one-time OTP behavior)
  if (user.otpValidated) {
    return res.json({ success: true, message: "User already validated, no OTP required" })
  }

  // Find valid OTP for this user
  const validOtp = otpCodes.find(
    (otp) => otp.code === otpCode && otp.userEmail === user.email && !otp.used && new Date() < new Date(otp.expiresAt),
  )

  if (!validOtp) {
    return res.status(400).json({ success: false, message: "Invalid or expired OTP code" })
  }

  // Mark OTP as used
  validOtp.used = true
  validOtp.usedAt = new Date().toISOString()
  writeJSONFile(OTP_CODES_FILE, otpCodes)

  // Mark user as permanently OTP validated
  user.otpValidated = true
  writeJSONFile(USERS_FILE, users)

  res.json({ success: true, message: "OTP validated successfully" })
})

// Check if user needs OTP validation
app.get("/api/auth/check-otp-status", authenticateToken, (req, res) => {
  const userId = req.user.id
  const users = readJSONFile(USERS_FILE)
  const user = users.find((u) => u.id === userId)

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" })
  }

  res.json({
    success: true,
    needsOtp: !user.otpValidated,
    otpValidated: user.otpValidated || false,
  })
})

// User routes
app.get("/api/users/profile", authenticateToken, (req, res) => {
  const userId = req.user.id
  const users = readJSONFile(USERS_FILE)
  const user = users.find((user) => user.id === userId)

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" })
  }

  const { password, ...userWithoutPassword } = user
  res.json({ success: true, user: userWithoutPassword })
})

// Transaction routes
app.get("/api/transactions", authenticateToken, (req, res) => {
  const transactions = readJSONFile(TRANSACTIONS_FILE)
  const userId = req.user.id

  const userTransactions = transactions.filter(
    (transaction) =>
      (transaction.fromUserId === userId || transaction.toUserId === userId) &&
      (transaction.type !== "admin-funding" || transaction.toUserId === userId),
  )

  const formattedTransactions = userTransactions.map((transaction) => {
    const isReceived = transaction.toUserId === userId

    return {
      id: transaction.id,
      type: isReceived ? "received" : "sent",
      amount: transaction.amount,
      token: transaction.tokenType || "USD",
      from: transaction.fromName,
      to: transaction.toName,
      date: transaction.createdAt,
      status: transaction.status,
      note: transaction.note,
    }
  })

  res.json({ success: true, transactions: formattedTransactions })
})

// User-to-user token transfer
app.post("/api/transactions/send", authenticateToken, (req, res) => {
  const { recipientAddress, amount, tokenType, note } = req.body
  const senderId = req.user.id

  if (!recipientAddress || !amount || amount <= 0 || !tokenType) {
    return res.status(400).json({
      success: false,
      message: "Valid recipient address, amount, and token type are required",
    })
  }

  const users = readJSONFile(USERS_FILE)
  const sender = users.find((user) => user.id === senderId)

  if (!sender) {
    return res.status(404).json({ success: false, message: "Sender not found" })
  }

  // Find recipient by wallet address based on token type
  const walletAddressField = `${tokenType.toLowerCase()}WalletAddress`
  const recipient = users.find((user) => user[walletAddressField] === recipientAddress)

  if (!recipient) {
    return res.status(404).json({ success: false, message: "Recipient wallet address not found" })
  }

  if (recipient.id === senderId) {
    return res.status(400).json({ success: false, message: "Cannot send to yourself" })
  }

  const balanceField = `${tokenType.toLowerCase()}Balance`

  // Check if sender has sufficient balance
  if (!sender[balanceField] || sender[balanceField] < amount) {
    return res.status(400).json({
      success: false,
      message: `Insufficient ${tokenType} balance. Available: ${sender[balanceField] || 0}`,
    })
  }

  // Update balances
  sender[balanceField] -= amount
  recipient[balanceField] = (recipient[balanceField] || 0) + amount

  writeJSONFile(USERS_FILE, users)

  // Create transaction record
  const transactions = readJSONFile(TRANSACTIONS_FILE)
  const transactionId = uuidv4()
  const newTransaction = {
    id: transactionId,
    type: "user-transfer",
    amount,
    tokenType,
    fromUserId: sender.id,
    toUserId: recipient.id,
    fromName: sender.name,
    toName: recipient.name,
    fromAddress: sender[walletAddressField],
    toAddress: recipientAddress,
    note: note || `${tokenType} transfer`,
    status: "completed",
    createdAt: new Date().toISOString(),
  }

  transactions.push(newTransaction)
  writeJSONFile(TRANSACTIONS_FILE, transactions)

  res.json({
    success: true,
    message: `Successfully sent ${amount} ${tokenType} to ${recipient.name}`,
    transactionId,
    transaction: {
      id: transactionId,
      type: "user-transfer",
      amount,
      tokenType,
      fromName: sender.name,
      toName: recipient.name,
      fromAddress: sender[walletAddressField],
      toAddress: recipientAddress,
      note: note || `${tokenType} transfer`,
      status: "completed",
      createdAt: new Date().toISOString(),
    },
  })
})

// User main wallet transfer
app.post("/api/transactions/send-main", authenticateToken, (req, res) => {
  const { recipientAddress, amount, note } = req.body
  const senderId = req.user.id

  if (!recipientAddress || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid recipient address and amount are required",
    })
  }

  const users = readJSONFile(USERS_FILE)
  const sender = users.find((user) => user.id === senderId)

  if (!sender) {
    return res.status(404).json({ success: false, message: "Sender not found" })
  }

  // Find recipient by main wallet address
  const recipient = users.find((user) => user.mainWalletAddress === recipientAddress)

  if (!recipient) {
    return res.status(404).json({ success: false, message: "Recipient main wallet address not found" })
  }

  if (recipient.id === senderId) {
    return res.status(400).json({ success: false, message: "Cannot send to yourself" })
  }

  // Check if sender has sufficient balance
  if (!sender.balance || sender.balance < amount) {
    return res.status(400).json({
      success: false,
      message: `Insufficient main wallet balance. Available: ${sender.balance || 0}`,
    })
  }

  // Update balances
  sender.balance -= amount
  recipient.balance = (recipient.balance || 0) + amount

  writeJSONFile(USERS_FILE, users)

  // Create transaction record
  const transactions = readJSONFile(TRANSACTIONS_FILE)
  const transactionId = uuidv4()
  const newTransaction = {
    id: transactionId,
    type: "main-transfer",
    amount,
    tokenType: "MAIN",
    fromUserId: sender.id,
    toUserId: recipient.id,
    fromName: sender.name,
    toName: recipient.name,
    fromAddress: sender.mainWalletAddress,
    toAddress: recipientAddress,
    note: note || "Main wallet transfer",
    status: "completed",
    createdAt: new Date().toISOString(),
  }

  transactions.push(newTransaction)
  writeJSONFile(TRANSACTIONS_FILE, transactions)

  res.json({
    success: true,
    message: `Successfully sent ${amount} from main wallet to ${recipient.name}`,
    transactionId,
    transaction: {
      id: transactionId,
      type: "main-transfer",
      amount,
      tokenType: "MAIN",
      fromName: sender.name,
      toName: recipient.name,
      fromAddress: sender.mainWalletAddress,
      toAddress: recipientAddress,
      note: note || "Main wallet transfer",
      status: "completed",
      createdAt: new Date().toISOString(),
    },
  })
})

// Fund token wallet from main wallet
app.post("/api/transactions/fund-token", authenticateToken, (req, res) => {
  const { tokenType, amount, note } = req.body
  const userId = req.user.id

  if (!tokenType || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid token type and amount are required",
    })
  }

  const users = readJSONFile(USERS_FILE)
  const user = users.find((u) => u.id === userId)

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" })
  }

  // Check if user has sufficient main wallet balance
  if (!user.balance || user.balance < amount) {
    return res.status(400).json({
      success: false,
      message: `Insufficient main wallet balance. Available: ${user.balance || 0}`,
    })
  }

  const balanceField = `${tokenType.toLowerCase()}Balance`

  // Update balances
  user.balance -= amount
  user[balanceField] = (user[balanceField] || 0) + amount

  writeJSONFile(USERS_FILE, users)

  // Create transaction record
  const transactions = readJSONFile(TRANSACTIONS_FILE)
  const transactionId = uuidv4()
  const newTransaction = {
    id: transactionId,
    type: "main-to-token",
    amount,
    tokenType,
    fromUserId: userId,
    toUserId: userId,
    fromName: user.name,
    toName: user.name,
    fromAddress: user.mainWalletAddress,
    toAddress: user[`${tokenType.toLowerCase()}WalletAddress`],
    note: note || `Funded ${tokenType} wallet from main wallet`,
    status: "completed",
    createdAt: new Date().toISOString(),
  }

  transactions.push(newTransaction)
  writeJSONFile(TRANSACTIONS_FILE, transactions)

  res.json({
    success: true,
    message: `Successfully funded ${tokenType} wallet with ${amount}`,
    transactionId,
    transaction: {
      id: transactionId,
      type: "main-to-token",
      amount,
      tokenType,
      fromName: user.name,
      toName: user.name,
      fromAddress: user.mainWalletAddress,
      toAddress: user[`${tokenType.toLowerCase()}WalletAddress`],
      note: note || `Funded ${tokenType} wallet from main wallet`,
      status: "completed",
      createdAt: new Date().toISOString(),
    },
  })
})

// Admin routes
app.get("/api/admin/users", authenticateToken, isAdmin, (req, res) => {
  const users = readJSONFile(USERS_FILE)
  const usersWithoutPasswords = users.map(({ password, ...user }) => user)
  res.json({ success: true, users: usersWithoutPasswords })
})

app.get("/api/admin/transactions", authenticateToken, isAdmin, (req, res) => {
  const transactions = readJSONFile(TRANSACTIONS_FILE)
  res.json({ success: true, transactions })
})

app.get("/api/admin/otp-codes", authenticateToken, isAdmin, (req, res) => {
  const otpCodes = readJSONFile(OTP_CODES_FILE)
  res.json({ success: true, otpCodes })
})

app.get("/api/admin/lookup-user", authenticateToken, isAdmin, (req, res) => {
  const { address } = req.query

  if (!address) {
    return res.status(400).json({ success: false, message: "Address is required" })
  }

  const users = readJSONFile(USERS_FILE)
  const user = users.find(
    (u) => u.btcWalletAddress === address || u.ethWalletAddress === address || u.usdtWalletAddress === address,
  )

  if (!user) {
    return res.json({ success: false, message: "User not found" })
  }

  const { password, ...userWithoutPassword } = user
  res.json({ success: true, user: userWithoutPassword })
})

app.post("/api/admin/generate-otp", authenticateToken, isAdmin, (req, res) => {
  const { userEmail, otpCode, expiryMinutes } = req.body

  if (!userEmail || !otpCode || !expiryMinutes) {
    return res.status(400).json({ success: false, message: "All fields are required" })
  }

  const users = readJSONFile(USERS_FILE)
  const user = users.find((u) => u.email === userEmail)

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" })
  }

  const otpCodes = readJSONFile(OTP_CODES_FILE)
  const newOtp = {
    id: uuidv4(),
    code: otpCode,
    userEmail: userEmail,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString(),
    used: false,
    usedAt: null,
  }

  otpCodes.push(newOtp)
  writeJSONFile(OTP_CODES_FILE, otpCodes)

  res.json({ success: true, message: "OTP generated successfully", otpCode })
})

app.post("/api/admin/fund-user", authenticateToken, isAdmin, (req, res) => {
  const { recipientAddress, amount, tokenType } = req.body
  const adminId = req.user.id

  if (!recipientAddress || !amount || amount <= 0 || !tokenType) {
    return res
      .status(400)
      .json({ success: false, message: "Valid recipient address, amount, and token type are required" })
  }

  const users = readJSONFile(USERS_FILE)
  const admin = users.find((user) => user.id === adminId)

  // Find recipient by wallet address based on token type
  const walletAddressField = `${tokenType.toLowerCase()}WalletAddress`
  const recipient = users.find((user) => user[walletAddressField] === recipientAddress)

  if (!recipient) {
    return res.status(404).json({ success: false, message: "Recipient not found" })
  }

  const balanceField = `${tokenType.toLowerCase()}Balance`

  if (admin[balanceField] < amount) {
    return res.status(400).json({ success: false, message: "Insufficient admin balance" })
  }

  // Update balances
  admin[balanceField] -= amount
  recipient[balanceField] += amount

  writeJSONFile(USERS_FILE, users)

  // Create transaction record
  const transactions = readJSONFile(TRANSACTIONS_FILE)
  const newTransaction = {
    id: uuidv4(),
    type: "admin-funding",
    amount,
    tokenType,
    fromUserId: admin.id,
    toUserId: recipient.id,
    fromName: "Admin",
    toName: recipient.name,
    toAddress: recipientAddress,
    note: "Admin funding",
    status: "completed",
    createdAt: new Date().toISOString(),
  }

  transactions.push(newTransaction)
  writeJSONFile(TRANSACTIONS_FILE, transactions)

  res.json({ success: true, message: "User funded successfully" })
})

app.delete("/api/admin/users/:userId", authenticateToken, isAdmin, (req, res) => {
  const { userId } = req.params

  const users = readJSONFile(USERS_FILE)
  const userIndex = users.findIndex((u) => u.id === userId)

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "User not found" })
  }

  if (users[userIndex].isAdmin) {
    return res.status(400).json({ success: false, message: "Cannot delete admin user" })
  }

  users.splice(userIndex, 1)
  writeJSONFile(USERS_FILE, users)

  res.json({ success: true, message: "User deleted successfully" })
})

// Serve HTML files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

app.get("*", (req, res) => {
  const filePath = path.join(__dirname, req.path)

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.sendFile(filePath)
  } else {
    res.redirect("/")
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
