document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const token = localStorage.getItem("token")

  if (!currentUser || !token) {
    window.location.href = "index.html"
    return
  }

  // Get selected token from localStorage or default to BTC
  let selectedToken = localStorage.getItem("selectedToken") || "BTC"

  // Token data
  const tokenData = {
    BTC: {
      name: "BTC",
      fullName: "Bitcoin",
      price: 85994.93,
      icon: '<i class="fab fa-bitcoin"></i>',
      iconClass: "btc",
      balance: currentUser.btcBalance || 0,
      address: currentUser.btcWalletAddress || "1Sj30fi54aZGN2QXzPYILSFKRWjvMCEhUju6cx",
    },
    ETH: {
      name: "ETH",
      fullName: "Ethereum",
      price: 2204.4,
      icon: '<i class="fab fa-ethereum"></i>',
      iconClass: "eth",
      balance: currentUser.ethBalance || 0,
      address: currentUser.ethWalletAddress || "0x742d35Cc6634C0532925a3b8D404fAbCe4649681",
    },
    USDT: {
      name: "USDT",
      fullName: "Tether",
      price: 1.0,
      icon: '<span class="usdt-icon">₮</span>',
      iconClass: "usdt",
      balance: currentUser.usdtBalance || 0,
      address: currentUser.usdtWalletAddress || "0x742d35Cc6634C0532925a3b8D404fAbCe4649681",
    },
  }

  // Initialize page
  updateBalanceDisplay()
  setupEventListeners()

  function updateBalanceDisplay() {
    const token = tokenData[selectedToken]
    if (!token) return

    // Update header
    const cryptoSelector = document.querySelector(".selected-crypto")
    if (cryptoSelector) {
      cryptoSelector.innerHTML = `
        <div class="crypto-icon ${token.iconClass}">
          ${token.icon}
        </div>
        <div class="crypto-info">
          <span class="crypto-label">Select Crypto</span>
          <span class="crypto-name">${token.name}</span>
          <span class="crypto-value">= $${token.price.toFixed(2)}</span>
        </div>
        <i class="fas fa-chevron-down"></i>
      `
    }

    // Update account title and address
    document.getElementById("accountTitle").textContent = `${token.name} - Main Account`
    document.getElementById("walletAddress").textContent = token.address

    // Update balance display
    const balance = token.balance
    const fiatValue = balance * token.price

    document.getElementById("mainBalance").textContent = formatCryptoAmount(balance)
    document.getElementById("balanceFiat").textContent = `≈ $${formatLargeNumber(fiatValue)}`
    document.getElementById("availableBalance").textContent = formatCryptoAmount(balance)
    document.getElementById("unconfirmedBalance").textContent = "0.00"
  }

  function setupEventListeners() {
    // Crypto selector click
    document.getElementById("cryptoSelector").addEventListener("click", () => {
      document.getElementById("cryptoModal").classList.add("active")
    })

    // Close modal
    document.querySelector(".close-modal").addEventListener("click", () => {
      document.getElementById("cryptoModal").classList.remove("active")
    })

    // Crypto option selection
    document.querySelectorAll(".crypto-option").forEach((option) => {
      option.addEventListener("click", function () {
        selectedToken = this.getAttribute("data-crypto")
        localStorage.setItem("selectedToken", selectedToken)
        updateBalanceDisplay()
        document.getElementById("cryptoModal").classList.remove("active")
      })
    })

    // Copy address button
    document.getElementById("copyAddressBtn").addEventListener("click", () => {
      const address = tokenData[selectedToken].address
      navigator.clipboard.writeText(address).then(() => {
        alert("Address copied to clipboard!")
      })
    })

    // Send button with OTP check
    document.getElementById("sendBtn").addEventListener("click", async () => {
      try {
        // Check if user needs OTP validation
        const response = await fetch("/api/auth/check-otp-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await response.json()

        if (data.success && !data.needsOtp) {
          // User is already validated, go directly to send page
          window.location.href = `send.html?token=${selectedToken}`
        } else {
          // User needs OTP validation
          localStorage.setItem(
            "pendingTransaction",
            JSON.stringify({
              type: "send",
              token: selectedToken,
              timestamp: Date.now(),
            }),
          )
          window.location.href = "otp-validation.html"
        }
      } catch (error) {
        console.error("Error checking OTP status:", error)
        // Default to requiring OTP on error
        localStorage.setItem(
          "pendingTransaction",
          JSON.stringify({
            type: "send",
            token: selectedToken,
            timestamp: Date.now(),
          }),
        )
        window.location.href = "otp-validation.html"
      }
    })

    // Receive button
    document.getElementById("receiveBtn").addEventListener("click", () => {
      window.location.href = `receive.html?token=${selectedToken}`
    })
  }

  function formatCryptoAmount(amount) {
    if (amount === 0) return "0.00000000"
    return Number(amount).toFixed(8)
  }

  function formatLargeNumber(num) {
    if (num === 0) return "0.00"
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
})
