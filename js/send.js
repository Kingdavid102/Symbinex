document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const token = localStorage.getItem("token")

  if (!currentUser || !token) {
    // Redirect to login if not logged in
    window.location.href = "index.html"
    return
  }

  // Get token from URL parameters
  const urlParams = new URLSearchParams(window.location.search)
  const tokenParam = urlParams.get("token")

  // Update UI with token name
  const tokenTypeSelect = document.getElementById("tokenType")
  const fundTokenTypeSelect = document.getElementById("fundTokenType")

  if (tokenParam && tokenTypeSelect) {
    tokenTypeSelect.value = tokenParam
  }

  if (tokenParam && fundTokenTypeSelect) {
    fundTokenTypeSelect.value = tokenParam
  }

  // Handle send tabs
  const sendTabs = document.querySelectorAll(".send-tab")
  const sendForms = document.querySelectorAll(".send-form")

  sendTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      // Remove active class from all tabs and forms
      sendTabs.forEach((t) => t.classList.remove("active"))
      sendForms.forEach((form) => form.classList.remove("active"))

      // Add active class to clicked tab
      this.classList.add("active")

      // Show corresponding form
      const formId = this.getAttribute("data-form")
      document.getElementById(formId).classList.add("active")
    })
  })

  // Token Form
  const tokenForm = document.getElementById("tokenForm")
  if (tokenForm) {
    tokenForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const tokenType = document.getElementById("tokenType").value
      const recipientAddress = document.getElementById("recipientAddress").value
      const amount = document.getElementById("tokenAmount").value
      const note = document.getElementById("tokenNote").value
      const errorElement = document.getElementById("sendTokenError")

      // Clear previous errors
      errorElement.textContent = ""

      // Validate amount
      if (Number.parseFloat(amount) <= 0) {
        errorElement.textContent = "Amount must be greater than 0"
        return
      }

      // Show loading state
      const submitBtn = tokenForm.querySelector(".submit-btn")
      const originalText = submitBtn.textContent
      submitBtn.textContent = "Sending..."
      submitBtn.disabled = true

      // Make API request to send token
      fetch("/api/transactions/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientAddress,
          amount: Number.parseFloat(amount),
          tokenType,
          note,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Update current user balance immediately
            const updatedUser = JSON.parse(localStorage.getItem("currentUser"))
            const balanceField = `${tokenType.toLowerCase()}Balance`
            updatedUser[balanceField] = (updatedUser[balanceField] || 0) - Number.parseFloat(amount)
            localStorage.setItem("currentUser", JSON.stringify(updatedUser))

            // Show transaction receipt
            showTransactionReceipt({
              type: "user-transfer",
              amount: Number.parseFloat(amount),
              tokenType: tokenType,
              fromName: currentUser.name,
              toName: data.transaction.toName,
              fromAddress: data.transaction.fromAddress,
              toAddress: recipientAddress,
              note: note || `${tokenType} transfer`,
              date: new Date().toISOString(),
              txId: data.transactionId,
            })
          } else {
            errorElement.textContent = data.message || "Failed to send funds"
            // Reset button
            submitBtn.textContent = originalText
            submitBtn.disabled = false
          }
        })
        .catch((error) => {
          errorElement.textContent = "An error occurred. Please try again."
          console.error("Send funds error:", error)
          // Reset button
          submitBtn.textContent = originalText
          submitBtn.disabled = false
        })
    })
  }

  // Main Wallet Form
  const mainWalletForm = document.getElementById("mainWalletForm")
  if (mainWalletForm) {
    mainWalletForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const recipientAddress = document.getElementById("mainRecipientAddress").value
      const amount = document.getElementById("mainAmount").value
      const note = document.getElementById("mainNote").value
      const errorElement = document.getElementById("mainSendError")

      // Clear previous errors
      errorElement.textContent = ""

      // Validate amount
      if (Number.parseFloat(amount) <= 0) {
        errorElement.textContent = "Amount must be greater than 0"
        return
      }

      // Show loading state
      const submitBtn = mainWalletForm.querySelector(".submit-btn")
      const originalText = submitBtn.textContent
      submitBtn.textContent = "Sending..."
      submitBtn.disabled = true

      // Make API request to send funds from main wallet
      fetch("/api/transactions/send-main", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientAddress,
          amount: Number.parseFloat(amount),
          note,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Update the UI immediately
            const updatedUser = JSON.parse(localStorage.getItem("currentUser"))

            // Deduct from main balance
            updatedUser.balance -= Number.parseFloat(amount)

            // Update localStorage
            localStorage.setItem("currentUser", JSON.stringify(updatedUser))

            // Show transaction receipt
            showTransactionReceipt({
              type: "main-transfer",
              amount: Number.parseFloat(amount),
              tokenType: "MAIN",
              fromName: currentUser.name,
              toName: data.transaction.toName,
              fromAddress: data.transaction.fromAddress,
              toAddress: recipientAddress,
              note: note || "Main wallet transfer",
              date: new Date().toISOString(),
              txId: data.transactionId,
            })
          } else {
            errorElement.textContent = data.message || "Failed to send funds"
            // Reset button
            submitBtn.textContent = originalText
            submitBtn.disabled = false
          }
        })
        .catch((error) => {
          errorElement.textContent = "An error occurred. Please try again."
          console.error("Send funds error:", error)
          // Reset button
          submitBtn.textContent = originalText
          submitBtn.disabled = false
        })
    })
  }

  // Fund Token from Main Form
  const fundTokenForm = document.getElementById("fundTokenForm")
  if (fundTokenForm) {
    fundTokenForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const tokenType = document.getElementById("fundTokenType").value
      const amount = document.getElementById("fundAmount").value
      const note = document.getElementById("fundNote").value
      const errorElement = document.getElementById("fundTokenError")

      // Clear previous errors
      errorElement.textContent = ""

      // Validate amount
      if (Number.parseFloat(amount) <= 0) {
        errorElement.textContent = "Amount must be greater than 0"
        return
      }

      // Show loading state
      const submitBtn = fundTokenForm.querySelector(".submit-btn")
      const originalText = submitBtn.textContent
      submitBtn.textContent = "Processing..."
      submitBtn.disabled = true

      // Make API request to fund token wallet from main wallet
      fetch("/api/transactions/fund-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tokenType,
          amount: Number.parseFloat(amount),
          note: note || `Funded ${tokenType} wallet from main wallet`,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Update the UI immediately
            const updatedUser = JSON.parse(localStorage.getItem("currentUser"))

            // Deduct from main balance
            updatedUser.balance -= Number.parseFloat(amount)

            // Add to token balance
            updatedUser[`${tokenType.toLowerCase()}Balance`] =
              (updatedUser[`${tokenType.toLowerCase()}Balance`] || 0) + Number.parseFloat(amount)

            // Update localStorage
            localStorage.setItem("currentUser", JSON.stringify(updatedUser))

            // Show transaction receipt
            showTransactionReceipt({
              type: "main-to-token",
              amount: Number.parseFloat(amount),
              tokenType: tokenType,
              fromName: currentUser.name,
              toName: currentUser.name,
              fromAddress: data.transaction.fromAddress,
              toAddress: data.transaction.toAddress,
              note: note || `Funded ${tokenType} wallet from main wallet`,
              date: new Date().toISOString(),
              txId: data.transactionId,
            })
          } else {
            errorElement.textContent = data.message || "Failed to fund token wallet"
            // Reset button
            submitBtn.textContent = originalText
            submitBtn.disabled = false
          }
        })
        .catch((error) => {
          errorElement.textContent = "An error occurred. Please try again."
          console.error("Fund token error:", error)
          // Reset button
          submitBtn.textContent = originalText
          submitBtn.disabled = false
        })
    })
  }

  // Close modals
  const closeModalButtons = document.querySelectorAll(".close-modal")
  closeModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".modal").forEach((modal) => {
        modal.classList.remove("active")
      })
    })
  })

  // Helper functions
  function generateTxId() {
    return "tx_" + Math.random().toString(36).substring(2, 15)
  }

  // Function to show transaction receipt
  function showTransactionReceipt(transaction) {
    // Create receipt modal
    const modal = document.createElement("div")
    modal.className = "modal active"
    modal.id = "receiptModal"
    modal.style.zIndex = "10000"

    const formattedDate = new Date(transaction.date).toLocaleString()
    const transactionTypeDisplay = getTransactionTypeDisplay(transaction.type)
    const statusIcon = getStatusIcon(transaction.type)

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px; margin: 20px auto;">
        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0;">
          <h3 class="modal-title" style="margin: 0; font-size: 20px; font-weight: 600;">Transaction Receipt</h3>
          <button class="modal-close" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 0;">
          <div id="receiptContent">
            <!-- Transaction Status -->
            <div style="text-align: center; padding: 30px 20px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
              <div style="font-size: 48px; margin-bottom: 15px;">
                ${statusIcon}
              </div>
              <h2 style="margin: 0 0 10px; font-size: 24px; font-weight: 600;">${transactionTypeDisplay}</h2>
              <div style="font-size: 32px; font-weight: 700; margin: 15px 0;">
                ${transaction.amount} ${transaction.tokenType}
              </div>
              <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; font-weight: 500;">
                ✅ Completed Successfully
              </div>
            </div>
            
            <!-- Transaction Details -->
            <div style="padding: 25px; background: white;">
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <div style="color: #6c757d; font-weight: 500;">Transaction ID</div>
                  <div style="font-family: monospace; font-size: 14px; word-break: break-all; max-width: 200px; text-align: right;">${transaction.txId}</div>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <div style="color: #6c757d; font-weight: 500;">Date & Time</div>
                  <div style="font-weight: 500;">${formattedDate}</div>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <div style="color: #6c757d; font-weight: 500;">From</div>
                  <div style="font-weight: 500; max-width: 200px; text-align: right; word-break: break-word;">${transaction.fromName}</div>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <div style="color: #6c757d; font-weight: 500;">To</div>
                  <div style="font-weight: 500; max-width: 200px; text-align: right; word-break: break-word;">${transaction.toName}</div>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <div style="color: #6c757d; font-weight: 500;">From Address</div>
                  <div style="font-family: monospace; font-size: 12px; max-width: 200px; text-align: right; word-break: break-all;">${formatAddress(transaction.fromAddress)}</div>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <div style="color: #6c757d; font-weight: 500;">To Address</div>
                  <div style="font-family: monospace; font-size: 12px; max-width: 200px; text-align: right; word-break: break-all;">${formatAddress(transaction.toAddress)}</div>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <div style="color: #6c757d; font-weight: 500;">Network Fee</div>
                  <div style="font-weight: 500; color: #28a745;">Free</div>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                  <div style="color: #6c757d; font-weight: 500;">Note</div>
                  <div style="font-weight: 500; max-width: 200px; text-align: right; word-break: break-word;">${transaction.note}</div>
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button id="printReceiptBtn" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <i class="fas fa-print"></i> Print Receipt
                </button>
                <button id="closeReceiptBtn" style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <i class="fas fa-check"></i> Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Add event listener to close modal
    const closeBtn = modal.querySelector(".modal-close")
    const closeBtnBottom = document.getElementById("closeReceiptBtn")

    function closeModal() {
      document.body.removeChild(modal)
      // Redirect to dashboard after closing
      setTimeout(() => {
        window.location.href = "dashboard.html"
      }, 100)
    }

    closeBtn.addEventListener("click", closeModal)
    closeBtnBottom.addEventListener("click", closeModal)

    // Print receipt functionality
    const printReceiptBtn = document.getElementById("printReceiptBtn")
    if (printReceiptBtn) {
      printReceiptBtn.addEventListener("click", () => {
        const receiptContent = document.getElementById("receiptContent")
        const printWindow = window.open("", "", "width=800,height=600")
        printWindow.document.write(`
          <html>
            <head>
              <title>Transaction Receipt</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  padding: 20px; 
                  line-height: 1.6;
                  color: #333;
                }
                .receipt-header { 
                  text-align: center; 
                  margin-bottom: 30px; 
                  padding: 20px;
                  background: #f8f9fa;
                  border-radius: 8px;
                }
                .receipt-title { 
                  font-size: 24px; 
                  font-weight: bold; 
                  margin-bottom: 10px;
                }
                .receipt-amount { 
                  text-align: center; 
                  margin: 30px 0; 
                  font-size: 32px; 
                  font-weight: bold; 
                  color: #007bff;
                }
                .receipt-details {
                  background: #f8f9fa;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                }
                .receipt-row { 
                  display: flex; 
                  justify-content: space-between; 
                  padding: 10px 0; 
                  border-bottom: 1px solid #dee2e6; 
                }
                .receipt-row:last-child {
                  border-bottom: none;
                }
                .receipt-label {
                  font-weight: 600;
                  color: #6c757d;
                }
                .receipt-value {
                  font-weight: 500;
                  word-break: break-word;
                }
                .receipt-footer { 
                  text-align: center; 
                  margin-top: 30px; 
                  color: #6c757d; 
                  font-size: 14px;
                }
                .status-badge {
                  background: #28a745;
                  color: white;
                  padding: 4px 12px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: 600;
                }
              </style>
            </head>
            <body>
              <div class="receipt-header">
                <h1 class="receipt-title">Transaction Receipt</h1>
                <p>${transactionTypeDisplay}</p>
                <span class="status-badge">✅ Completed Successfully</span>
              </div>
              <div class="receipt-amount">${transaction.amount} ${transaction.tokenType}</div>
              <div class="receipt-details">
                <div class="receipt-row">
                  <div class="receipt-label">Transaction ID</div>
                  <div class="receipt-value">${transaction.txId}</div>
                </div>
                <div class="receipt-row">
                  <div class="receipt-label">Date & Time</div>
                  <div class="receipt-value">${formattedDate}</div>
                </div>
                <div class="receipt-row">
                  <div class="receipt-label">From</div>
                  <div class="receipt-value">${transaction.fromName}</div>
                </div>
                <div class="receipt-row">
                  <div class="receipt-label">To</div>
                  <div class="receipt-value">${transaction.toName}</div>
                </div>
                <div class="receipt-row">
                  <div class="receipt-label">From Address</div>
                  <div class="receipt-value">${transaction.fromAddress}</div>
                </div>
                <div class="receipt-row">
                  <div class="receipt-label">To Address</div>
                  <div class="receipt-value">${transaction.toAddress}</div>
                </div>
                <div class="receipt-row">
                  <div class="receipt-label">Network Fee</div>
                  <div class="receipt-value">Free</div>
                </div>
                <div class="receipt-row">
                  <div class="receipt-label">Note</div>
                  <div class="receipt-value">${transaction.note}</div>
                </div>
              </div>
              <div class="receipt-footer">
                <p>Thank you for using our wallet service</p>
                <p>This is an automatically generated receipt</p>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      })
    }

    // Close modal when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal()
      }
    })
  }

  // Helper functions for receipt display
  function getTransactionTypeDisplay(type) {
    switch (type) {
      case "user-transfer":
        return "Token Transfer"
      case "main-transfer":
        return "Main Wallet Transfer"
      case "main-to-token":
        return "Fund Token Wallet"
      default:
        return "Transaction"
    }
  }

  function getStatusIcon(type) {
    switch (type) {
      case "user-transfer":
        return "🔄"
      case "main-transfer":
        return "💸"
      case "main-to-token":
        return "💰"
      default:
        return "✅"
    }
  }

  function formatAddress(address) {
    if (!address) return "N/A"
    if (address.length <= 20) return address
    return address.substring(0, 10) + "..." + address.substring(address.length - 10)
  }
})
