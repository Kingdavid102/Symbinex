document.addEventListener("DOMContentLoaded", () => {
  // Add some interactive animations
  const sSymbol = document.querySelector(".s-symbol")
  const particles = document.querySelectorAll(".particle")

  // Add click animation to S symbol
  if (sSymbol) {
    sSymbol.addEventListener("click", () => {
      sSymbol.style.transform = "rotate(-10deg) scale(1.2)"
      setTimeout(() => {
        sSymbol.style.transform = "rotate(-10deg) scale(1)"
      }, 200)
    })
  }

  // Add random movement to particles
  particles.forEach((particle, index) => {
    setInterval(
      () => {
        const randomX = Math.random() * 20 - 10
        const randomY = Math.random() * 20 - 10
        particle.style.transform = `translate(${randomX}px, ${randomY}px)`
      },
      3000 + index * 500,
    )
  })
})
