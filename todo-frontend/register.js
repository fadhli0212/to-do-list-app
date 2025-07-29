const registerForm = document.getElementById("register-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const registerBtn = document.getElementById("register-btn");
const themeToggle = document.getElementById("toggle-theme");
const card = document.querySelector(".card");
const apiBaseURL = window.apiBaseURL || "http://localhost:3000";

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function triggerBackgroundAnimation() {
  card.classList.remove("animate-bg");
  void card.offsetWidth;
  card.classList.add("animate-bg");
}

function clearInvalid(input) {
  input.classList.remove("is-invalid");
}

function showInvalid(input) {
  input.classList.add("is-invalid");
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  themeToggle.textContent = document.body.classList.contains("dark-mode")
    ? "☀️ Mode Terang"
    : "🌙 Mode Gelap";
});

emailInput.addEventListener("input", () => {
  if (validateEmail(emailInput.value.trim())) {
    clearInvalid(emailInput);
  }
});

passwordInput.addEventListener("input", () => {
  if (passwordInput.value.trim().length >= 6) {
    clearInvalid(passwordInput);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const successSound = document.getElementById("success-sound");
  if (successSound) {
    successSound.load();
    console.log("🎧 Audio success preloaded");
  }
});

registerForm.addEventListener("submit", async (e) => {
  console.log("📄 Form ditemukan:", registerForm);
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  let valid = true;

  if (!validateEmail(email)) {
    showInvalid(emailInput);
    valid = false;
  }

  if (!password || password.length < 6) {
    showInvalid(passwordInput);
    valid = false;
  }

  if (!valid) return;

  triggerBackgroundAnimation();

  const registerSound = document.getElementById("register-sound");
  if (registerSound) registerSound.play();

  registerBtn.disabled = true;
  registerBtn.textContent = "Mendaftar...";

  try {
    const response = await fetch(`${apiBaseURL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    console.log("✅ Register response:", result);

    if (!response.ok) {
      const failSound = document.getElementById("fail-sound");
      if (failSound) failSound.play();

      alert(result.message || "Gagal mendaftar.");
      registerBtn.disabled = false;
      registerBtn.textContent = "Daftar";
      return;
    }

    const successSound = document.getElementById("success-sound");

    try {
      if (successSound) {
        await successSound.play();
        console.log("✅ Success sound played");
      }
    } catch (err) {
      console.warn("⚠️ Gagal play success sound:", err);
    }

    showToast("Pendaftaran berhasil! 🎉", "success");

    setTimeout(() => {
      localStorage.setItem("currentUser", JSON.stringify({ email }));
      window.location.href = "login.html";
    }, 1000);
  } catch (error) {
    console.error("❌ Register error:", error);

    const failSound = document.getElementById("fail-sound");
    if (failSound) failSound.play();

    setTimeout(() => {
      showToast("Gagal mendaftar. Coba lagi.", "error");

      registerBtn.disabled = false;
      registerBtn.textContent = "Daftar";
    }, 500);
  }
});

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `custom-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10); // trigger animasi
  setTimeout(() => toast.remove(), 3000);
}
