document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in and is admin
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const token = localStorage.getItem("token")

  if (!currentUser || !token || !currentUser.isAdmin) {
    window.location.href = "login.html"
    return
  }

  // Initialize admin dashboard
  loadAdminData()
  setupEventListeners()
  loadUsers()
  loadTransactions()
  loadOTPCodes()

  function loadAdminData() {
    // Display infinite admin balances
    document.getElementById("adminBtcBalance").textContent = "∞"
    document.getElementById("adminEthBalance").textContent = "∞"
    document.getElementById("adminUsdtBalance").textContent = "∞"
    document.getElementById("adminBalanceAmount").textContent = "∞"
  }

  function setupEventListeners() {
    // Logout button
    document.getElementById("logoutBtnAdmin").addEventListener("click", () => {
      localStorage.removeItem("currentUser")
      localStorage.removeItem("token")
      window.location.href = "login.html"
    })

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        // Remove active class from all tabs
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"))
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))

        // Add active class to clicked tab
        this.classList.add("active")
        document.getElementById(this.getAttribute("data-tab") + "-tab").classList.add("active")
      })
    })

    // Quick action buttons
    document.getElementById("fundUserBtn").addEventListener("click", () => {
      document.getElementById("fundUserModal").classList.add("active")
    })

    document.getElementById("generateOtpBtn").addEventListener("click", () => {
      document.getElementById("generateOtpModal").classList.add("active")
    })

    document.getElementById("viewUsersBtn").addEventListener("click", () => {
      // Switch to users tab
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"))
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))
      document.querySelector('[data-tab="users"]').classList.add("active")
      document.getElementById("users-tab").classList.add("active")
    })

    // Close modals
    document.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", function () {
        this.closest(".modal").classList.remove("active")
      })
    })

    // Fund user form
    document.getElementById("fundUserForm").addEventListener("submit", handleFundUser)

    // Generate OTP form
    document.getElementById("generateOtpForm").addEventListener("submit", handleGenerateOTP)

    // User address lookup
    document.getElementById("userAddress").addEventListener("input", debounce(lookupUser, 500))

    // Search functionality
    document.getElementById("userSearch").addEventListener("input", function () {
      filterUsers(this.value)
    })
  }

  function handleFundUser(e) {
    e.preventDefault()

    const userAddress = document.getElementById("userAddress").value
    const tokenType = document.getElementById("tokenType").value
    const amount = Number.parseFloat(document.getElementById("fundAmount").value)
    const errorElement = document.getElementById("fundError")

    errorElement.textContent = ""

    if (!userAddress || !tokenType || !amount || amount <= 0) {
      errorElement.textContent = "Please fill in all fields with valid values"
      return
    }

    // Make API request to fund user
    fetch("/api/admin/fund-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipientAddress: userAddress,
        amount: amount,
        tokenType: tokenType,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          document.getElementById("fundUserModal").classList.remove("active")
          alert("User funded successfully!")
          loadUsers()
          loadTransactions()

          // Reset form
          document.getElementById("fundUserForm").reset()
          document.getElementById("userInfo").style.display = "none"
        } else {
          errorElement.textContent = data.message || "Failed to fund user"
        }
      })
      .catch((error) => {
        console.error("Fund user error:", error)
        errorElement.textContent = "An error occurred. Please try again."
      })
  }

  function handleGenerateOTP(e) {
    e.preventDefault()

    const userEmail = document.getElementById("otpUserEmail").value
    const expiry = Number.parseInt(document.getElementById("otpExpiry").value)
    const errorElement = document.getElementById("otpError")

    errorElement.textContent = ""

    if (!userEmail || !expiry || expiry < 1) {
      errorElement.textContent = "Please fill in all fields with valid values"
      return
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Make API request to save OTP
    fetch("/api/admin/generate-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userEmail: userEmail,
        otpCode: otpCode,
        expiryMinutes: expiry,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Show generated OTP
          document.getElementById("otpCode").textContent = otpCode
          document.getElementById("otpExpiryTime").textContent = expiry
          document.getElementById("generatedOtp").style.display = "block"

          // Hide form
          document.getElementById("generateOtpForm").style.display = "none"

          // Reload OTP list
          loadOTPCodes()
        } else {
          errorElement.textContent = data.message || "Failed to generate OTP"
        }
      })
      .catch((error) => {
        console.error("Generate OTP error:", error)
        errorElement.textContent = "An error occurred. Please try again."
      })
  }

  function lookupUser(address) {
    if (!address || address.length < 10) {
      document.getElementById("userInfo").style.display = "none"
      return
    }

    // Make API request to lookup user by address
    fetch(`/api/admin/lookup-user?address=${encodeURIComponent(address)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.user) {
          const user = data.user
          document.getElementById("userName").textContent = user.name
          document.getElementById("userEmail").textContent = user.email
          document.getElementById("userBalance").textContent = `Balance: $${formatNumber(user.balance)}`
          document.getElementById("userInfo").style.display = "block"
        } else {
          document.getElementById("userInfo").style.display = "none"
        }
      })
      .catch((error) => {
        console.error("User lookup error:", error)
        document.getElementById("userInfo").style.display = "none"
      })
  }

  function loadUsers() {
    const usersList = document.getElementById("usersList")
    const loading = document.getElementById("usersLoading")

    fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        loading.style.display = "none"

        if (data.success && data.users.length > 0) {
          usersList.innerHTML = ""
          data.users.forEach((user) => {
            if (!user.isAdmin) {
              const userElement = createUserElement(user)
              usersList.appendChild(userElement)
            }
          })
        } else {
          usersList.innerHTML = '<div class="no-data">No users found</div>'
        }
      })
      .catch((error) => {
        console.error("Load users error:", error)
        loading.style.display = "none"
        usersList.innerHTML = '<div class="no-data">Error loading users</div>'
      })
  }

  function loadTransactions() {
    const transactionsList = document.getElementById("adminTransactionsList")
    const loading = document.getElementById("adminTransactionsLoading")

    fetch("/api/admin/transactions", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        loading.style.display = "none"

        if (data.success && data.transactions.length > 0) {
          transactionsList.innerHTML = ""
          data.transactions.forEach((transaction) => {
            const transactionElement = createTransactionElement(transaction)
            transactionsList.appendChild(transactionElement)
          })
        } else {
          transactionsList.innerHTML = '<div class="no-data">No transactions found</div>'
        }
      })
      .catch((error) => {
        console.error("Load transactions error:", error)
        loading.style.display = "none"
        transactionsList.innerHTML = '<div class="no-data">Error loading transactions</div>'
      })
  }

  function loadOTPCodes() {
    const otpList = document.getElementById("otpList")
    const loading = document.getElementById("otpLoading")

    fetch("/api/admin/otp-codes", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        loading.style.display = "none"

        if (data.success && data.otpCodes.length > 0) {
          otpList.innerHTML = ""
          data.otpCodes.forEach((otp) => {
            const otpElement = createOTPElement(otp)
            otpList.appendChild(otpElement)
          })
        } else {
          otpList.innerHTML = '<div class="no-data">No OTP codes found</div>'
        }
      })
      .catch((error) => {
        console.error("Load OTP codes error:", error)
        loading.style.display = "none"
        otpList.innerHTML = '<div class="no-data">Error loading OTP codes</div>'
      })
  }

  function createUserElement(user) {
    const div = document.createElement("div")
    div.className = "user-item"

    div.innerHTML = `
      <div class="user-header">
        <div class="user-info">
          <h4>${user.name}</h4>
          <p>${user.email}</p>
          <p>Balance: $${formatNumber(user.balance || 0)}</p>
        </div>
        <div class="user-actions">
          <button class="user-action-btn edit" onclick="editUser('${user.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="user-action-btn delete" onclick="deleteUser('${user.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="user-wallets">
        <div>BTC: ${user.btcWalletAddress || "N/A"}</div>
        <div>ETH: ${user.ethWalletAddress || "N/A"}</div>
        <div>USDT: ${user.usdtWalletAddress || "N/A"}</div>
      </div>
    `

    return div
  }

  function createTransactionElement(transaction) {
    const div = document.createElement("div")
    div.className = "transaction-item"

    div.innerHTML = `
      <div class="transaction-header">
        <div class="transaction-type">${transaction.type}</div>
        <div class="transaction-amount">$${formatNumber(transaction.amount)}</div>
      </div>
      <div class="transaction-details">
        <div>From: ${transaction.fromName || "N/A"}</div>
        <div>To: ${transaction.toName || "N/A"}</div>
        <div>Date: ${formatDate(transaction.createdAt)}</div>
        <div>Status: ${transaction.status}</div>
      </div>
    `

    return div
  }

  function createOTPElement(otp) {
    const div = document.createElement("div")
    div.className = "otp-item"

    const now = new Date()
    const expiry = new Date(otp.expiresAt)
    const isExpired = now > expiry
    const isUsed = otp.used

    let status = "active"
    if (isUsed) status = "used"
    else if (isExpired) status = "expired"

    div.innerHTML = `
      <div class="otp-header">
        <div class="otp-code-display">${otp.code}</div>
        <div class="otp-status ${status}">${status}</div>
      </div>
      <div class="otp-details">
        <div>User: ${otp.userEmail}</div>
        <div>Generated: ${formatDate(otp.createdAt)}</div>
        <div>Expires: ${formatDate(otp.expiresAt)}</div>
        ${isUsed ? `<div>Used: ${formatDate(otp.usedAt)}</div>` : ""}
      </div>
    `

    return div
  }

  function filterUsers(searchTerm) {
    const userItems = document.querySelectorAll(".user-item")
    const term = searchTerm.toLowerCase()

    userItems.forEach((item) => {
      const name = item.querySelector("h4").textContent.toLowerCase()
      const email = item.querySelector("p").textContent.toLowerCase()

      if (name.includes(term) || email.includes(term)) {
        item.style.display = "block"
      } else {
        item.style.display = "none"
      }
    })
  }

  // Utility functions
  function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  function formatNumber(num) {
    if (num === undefined || num === null) return "0.00"
    return Number(num).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  // Global functions for user actions
  window.editUser = (userId) => {
    alert("Edit user functionality - Coming soon!")
  }

  window.deleteUser = (userId) => {
    if (confirm("Are you sure you want to delete this user?")) {
      fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            loadUsers()
            alert("User deleted successfully!")
          } else {
            alert(data.message || "Failed to delete user")
          }
        })
        .catch((error) => {
          console.error("Delete user error:", error)
          alert("An error occurred. Please try again.")
        })
    }
  }
})
