document.addEventListener("DOMContentLoaded", async () => {
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const token = localStorage.getItem("token")

  if (!currentUser || !token) {
    window.location.href = "index.html"
    return
  }

  // Check if user is already OTP validated
  try {
    const response = await fetch("/api/auth/check-otp-status", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await response.json()

    if (data.success && !data.needsOtp) {
      // User is already validated, redirect to intended destination
      const pendingTransaction = JSON.parse(localStorage.getItem("pendingTransaction"))
      localStorage.removeItem("pendingTransaction")

      if (pendingTransaction && pendingTransaction.type === "send") {
        window.location.href = `send.html?token=${pendingTransaction.token}`
      } else {
        window.location.href = "balance.html"
      }
      return
    }
  } catch (error) {
    console.error("Error checking OTP status:", error)
  }

  // Check if there's a pending transaction
  const pendingTransaction = JSON.parse(localStorage.getItem("pendingTransaction"))
  if (!pendingTransaction) {
    window.location.href = "balance.html"
    return
  }

  // Handle OTP form submission
  document.getElementById("otpForm").addEventListener("submit", (e) => {
    e.preventDefault()

    const otpCode = document.getElementById("otpCode").value
    const errorElement = document.getElementById("otpError")

    // Clear previous errors
    errorElement.textContent = ""

    // Validate OTP (6 digits)
    if (!/^\d{6}$/.test(otpCode)) {
      errorElement.textContent = "Please enter a valid 6-digit OTP code"
      return
    }

    // Validate OTP with server
    validateOTP(otpCode)
  })

  function validateOTP(otpCode) {
    const errorElement = document.getElementById("otpError")

    // Show loading state
    const submitBtn = document.querySelector(".validate-btn")
    const originalText = submitBtn.textContent
    submitBtn.textContent = "Validating..."
    submitBtn.disabled = true

    // Make API request to validate OTP
    fetch("/api/auth/validate-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        otpCode,
        userId: currentUser.id,
        transactionData: pendingTransaction,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // OTP validated successfully - user is now permanently validated
          localStorage.removeItem("pendingTransaction")

          // Update current user data to reflect OTP validation
          const updatedUser = { ...currentUser, otpValidated: true }
          localStorage.setItem("currentUser", JSON.stringify(updatedUser))

          // Redirect based on transaction type
          if (pendingTransaction && pendingTransaction.type === "send") {
            window.location.href = `send.html?token=${pendingTransaction.token}`
          } else {
            window.location.href = "balance.html"
          }
        } else {
          errorElement.textContent = data.message || "Invalid OTP code. Please try again."

          // Reset button
          submitBtn.textContent = originalText
          submitBtn.disabled = false
        }
      })
      .catch((error) => {
        console.error("OTP validation error:", error)
        errorElement.textContent = "An error occurred. Please try again."

        // Reset button
        submitBtn.textContent = originalText
        submitBtn.disabled = false
      })
  }

  // Auto-focus on OTP input
  document.getElementById("otpCode").focus()

  // Only allow numbers in OTP input
  document.getElementById("otpCode").addEventListener("input", function (e) {
    this.value = this.value.replace(/[^0-9]/g, "")
  })
})
