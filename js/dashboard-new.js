document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const token = localStorage.getItem("token")

  if (!currentUser || !token) {
    window.location.href = "index.html"
    return
  }

  // Load user data and balances
  loadUserData()

  // Set up polling for balance updates
  setInterval(() => {
    refreshBalances()
  }, 10000)

  // Token item click handlers
  const tokenItems = document.querySelectorAll(".token-item")
  tokenItems.forEach((item) => {
    item.addEventListener("click", function () {
      const tokenType = this.getAttribute("data-token")
      // Store selected token and redirect to balance page
      localStorage.setItem("selectedToken", tokenType)
      window.location.href = "balance.html"
    })
  })

  function loadUserData() {
    // Calculate total balance based on BTC (main currency)
    const btcBalance = currentUser.btcBalance || 0
    const btcPrice = 85977.41
    const totalBalance = btcBalance * btcPrice

    // Update total balance display
    const totalBalanceElement = document.getElementById("totalBalance")
    if (totalBalanceElement) {
      totalBalanceElement.textContent = formatLargeNumber(totalBalance)
    }

    // Update individual token balances
    updateTokenBalance("btc", currentUser.btcBalance || 0, 85977.41)
    updateTokenBalance("eth", currentUser.ethBalance || 0, 2204.4)
    updateTokenBalance("usdt", currentUser.usdtBalance || 0, 1.0)
  }

  function updateTokenBalance(token, balance, price) {
    const amountElement = document.getElementById(`${token}Amount`)
    const valueElement = document.getElementById(`${token}Value`)

    if (amountElement) {
      amountElement.textContent = formatCryptoAmount(balance)
    }

    if (valueElement) {
      const value = balance * price
      valueElement.textContent = `= $ ${formatLargeNumber(value)}`
    }
  }

  function refreshBalances() {
    fetch("/api/users/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const updatedUser = data.user
          if (JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
            localStorage.setItem("currentUser", JSON.stringify(updatedUser))
            loadUserData()
          }
        }
      })
      .catch((error) => {
        console.error("Error refreshing balances:", error)
      })
  }

  function formatLargeNumber(num) {
    if (num === 0) return "0.00"
    if (num < 1000) return num.toFixed(2)
    if (num < 1000000) return (num / 1000).toFixed(2) + "K"
    if (num < 1000000000) return (num / 1000000).toFixed(3) + "M"
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function formatCryptoAmount(amount) {
    if (amount === 0) return "0.00000000"
    return Number(amount).toFixed(8)
  }
})
