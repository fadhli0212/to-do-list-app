const loginBtn = document.getElementById("login-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const loginForm = document.getElementById("login-form");
const loginCard = document.getElementById("login-card");
const apiBaseURL = window.apiBaseURL || "http://localhost:3000";

window.addEventListener("load", () => {
  loginCard.classList.add("animate-bg");
  setTimeout(() => {
    loginCard.classList.remove("animate-bg");
  }, 1500);
});

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearValidation() {
  emailInput.classList.remove("is-invalid");
  passwordInput.classList.remove("is-invalid");
  emailError.classList.add("d-none");
  passwordError.classList.add("d-none");
}

function triggerBackgroundAnimation() {
  loginCard.classList.remove("animate-bg");
  void loginCard.offsetWidth;
  loginCard.classList.add("animate-bg");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("visible");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

emailInput.addEventListener("input", () => {
  if (validateEmail(emailInput.value.trim())) {
    emailInput.classList.remove("is-invalid");
    emailError.classList.add("d-none");
  }
});

passwordInput.addEventListener("input", () => {
  if (passwordInput.value) {
    passwordInput.classList.remove("is-invalid");
    passwordError.classList.add("d-none");
  }
});

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  triggerBackgroundAnimation();
  setTimeout(() => {
    alert("Login berhasil! 🎉");
  }, 1500);
});

loginBtn.addEventListener("click", async (event) => {
  event.preventDefault();
  clearValidation();
  triggerBackgroundAnimation();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  let valid = true;

  if (!validateEmail(email)) {
    triggerShakeAndInvalid(emailInput, emailError);
    valid = false;
  }

  if (!password) {
    triggerShakeAndInvalid(passwordInput, passwordError);
    valid = false;
  }

  if (password.length < 6) {
    triggerShakeAndInvalid(passwordInput, passwordError);
    passwordError.textContent = "Password minimal 6 karakter.";
    valid = false;
  }

  if (!valid) return;

  const loginSound = document.getElementById("login-sound");
  if (loginSound) loginSound.play();

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "Loading...";
    const response = await fetch(`${apiBaseURL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    console.log("↪️ Response status:", response.status);

    if (!response.ok) {
      const error = await response.json();

      const failSound = document.getElementById("fail-sound");
      if (failSound) failSound.play();

      loginBtn.classList.add("shake");

      setTimeout(() => {
        loginBtn.classList.remove("shake");
        alert(error.message || "Login gagal");
      }, 300);

      loginBtn.disabled = false;
      loginBtn.textContent = "Masuk";

      return;
    }

    const result = await response.json();
    if (result.success) {
      console.log("✅ Data dari backend:", result);

      localStorage.setItem("token", result.token);
      localStorage.setItem("currentUser", JSON.stringify({ email }));

      showToast("Login berhasil!", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    }
  } catch (err) {
    const failSound = document.getElementById("fail-sound");
    if (failSound) failSound.play();

    loginBtn.classList.add("shake");

    setTimeout(() => {
      loginBtn.classList.remove("shake");
      alert("Terjadi kesalahan saat login. Silakan coba lagi.");
    }, 300);
    console.error("❌ Network/server error:", err);
  }
});

const toggleBtn = document.getElementById("toggle-theme");
const card = document.querySelector(".card");

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  card.classList.toggle("dark-mode");

  const isDark = document.body.classList.contains("dark-mode");
  toggleBtn.textContent = isDark ? "☀️ Mode Terang" : "🌙 Mode Gelap";
});

function triggerShakeAndInvalid(inputElement, errorElement) {
  inputElement.classList.add("is-invalid");
  errorElement.classList.remove("d-none");

  inputElement.classList.remove("shake");

  void inputElement.offsetWidth;

  inputElement.classList.add("shake");

  setTimeout(() => {
    inputElement.classList.remove("shake");
  }, 300);
}

const togglePassword = document.getElementById("toggle-password");

togglePassword.addEventListener("click", () => {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
  togglePassword.textContent = type === "password" ? "👁️" : "🙈";
});
