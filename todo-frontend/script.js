let tasks = [];
let currentUser = null;
const apiBaseURL = window.apiBaseURL || "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("currentUser");
  if (!savedUser) {
    alert("User tidak ditemukan, silakan login ulang!");
    window.location.href = "login.html";
    return;
  }

  try {
    currentUser = JSON.parse(savedUser);
  } catch (err) {
    console.error("❌ Gagal parse user dari localStorage:", err);
    alert("Data user corrupt, silakan login ulang!");
    window.location.href = "login.html";
    return;
  }

  if (!currentUser || !currentUser.email) {
    alert("Data user tidak valid, silakan login ulang!");
    window.location.href = "login.html";
    return;
  }

  const token = localStorage.getItem("token");
  console.log("🪪 Token yang dikirim:", token);

  fetch(`${apiBaseURL}/tasks`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token, // ✅ Kirim token di header
    },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("📦 Data task dari backend:", data);
      tasks = (data.tasks || []).filter((t) => t !== null);
      renderTasks();
      cekDeadlineTerdekat();
      setInterval(cekDeadlineTerdekat, 60 * 1000);
    })
    .catch((err) => {
      console.error("❌ Gagal ambil data task:", err);
      alert("Gagal ambil data task!");
      window.location.href = "login.html";
    });
});

const taskInput = document.getElementById("task-input");
const addTaskBtn = document.getElementById("add-task-btn");
const taskList = document.getElementById("task-list");
const exportBtn = document.getElementById("export-btn");
const importInput = document.getElementById("import-input");
const logoutBtn = document.getElementById("logout-btn");

let editIndex = null;
let currentFilter = "all";
let searchQuery = "";

renderTasks();

function renderTasks() {
  console.log(tasks);
  taskList.innerHTML = "";
  let visibleCount = 0;
  let sortedTasks = tasks.filter((t) => t !== null);

  sortedTasks.sort((a, b) => {
    if (a.pinned === b.pinned) return 0;
    return a.pinned ? -1 : 1;
  });

  sortedTasks.forEach((task, index) => {
    if (
      (currentFilter === "completed" && !task.completed) ||
      (currentFilter === "pending" && task.completed)
    )
      return;

    const taskText = task.text || task.title || "";
    if (!taskText.toLowerCase().includes(searchQuery.toLowerCase())) return;

    const li = document.createElement("li");
    const createdAt = formatTime(task.createdAt);
    li.className = "task-item " + (task.completed ? "selesai" : "belum");

    if (task.pinned) li.classList.add("pinned");

    const isLate = task.deadline && new Date(task.deadline) < new Date();
    const deadlineText = task.deadline
      ? isLate
        ? `⚠️ Lewat Deadline (${formatDate(task.deadline)})`
        : `🗓️ Deadline: ${formatDate(task.deadline)}`
      : "tidak ada deadline";

    console.log("Class untuk li:", li.className);
    const priorityLabel =
      task.priority === "penting" ? "🔴 Penting" : "Biasa ⚪";
    li.setAttribute("data-id", task.id);
    li.innerHTML = `
  <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 flex-wrap">
    
    <!-- Kiri: Teks tugas -->
    <div class="flex-grow-1">
      <span class="task-text ${task.completed ? "completed" : ""}">${
      task.text
    }</span>
    </div>

    <!-- Tengah: Info deadline dan status -->
    <div class="task-middle d-flex flex-column">
      <span class="priority-label">${priorityLabel}</span>
      <span class="deadline-label">${deadlineText}</span>
      <input type="datetime-local"
             value="${formatForInput(task.deadline)}"
             class="deadline-input"
             data-id="${task.id}"
             onchange="updateDeadlineFromInput(this)" />
      <label class="status-label">
  <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${
      task.completed ? "checked" : ""
    } />
  ${task.completed ? "✅ Selesai" : "⏳ Belum Selesai"}
</label>
      <span class="dot">•</span>
      <span class="timestamp">${createdAt}</span>
    </div>

    <!-- Kanan: Tombol -->
    <div class="d-flex gap-2 justify-content-start justify-content-md-end">
      <button class="btn btn-outline-secondary btn-sm rounded-circle" onclick="togglePin(${
        task.id
      })">📌</button>
      <button class="btn btn-outline-primary btn-sm rounded-circle" onclick="editTask(${
        task.id
      })">✏️</button>
      <button class="btn btn-outline-danger btn-sm rounded-circle" onclick="deleteTask(${
        task.id
      })">🗑️</button>
    </div>

  </div>
`;

    li.querySelector(".task-text").addEventListener("click", () => {
      toggleComplete(task.id);
    });

    taskList.appendChild(li);
    visibleCount++;
  });

  document.querySelectorAll(".task-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = parseInt(e.target.dataset.id);
      toggleTaskCompletion(id);
    });
  });

  new Sortable(taskList, {
    animation: 150,
    onEnd: function () {
      const newOrder = Array.from(taskList.children).map((li) =>
        parseInt(li.getAttribute("data-id"))
      );

      tasks.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
      saveTasks();
    },
  });

  const clearAllBtn = document.getElementById("clear-all-btn");
  if (visibleCount === 0) {
    clearAllBtn.classList.add("hidden");
  } else {
    clearAllBtn.classList.remove("hidden");
  }
}

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tugas-ku.json";
  a.click();

  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedTasks = JSON.parse(event.target.result);

      if (Array.isArray(importedTasks)) {
        const cleanedTasks = importedTasks
          .filter((t) => t && typeof t === "object" && t.text)
          .map((t) => ({
            ...t,
            completed: t.completed === true || t.completed === "true",
          }));

        fetch(`${apiBaseURL}/import-tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({ tasks: importedTasks }),
        })
          .then((res) => res.json())
          .then((data) => {
            console.log("✅ Import sukses:", data);
            tasks = data.tasks || [];
            renderTasks();
            showToast("Tugas berhasil diimport!", "info");
          })
          .catch((err) => {
            console.log("❌ Gagal import ke server:", err);
            alert("Gagal import ke server.");
          });
      } else {
        alert("File tidak valid.");
      }
    } catch (err) {
      alert("Gagal membaca file.");
    }
  };

  reader.readAsText(file);
});

logoutBtn.addEventListener("click", () => {
  const confirmLogout = confirm("Yakin ingin logout?");
  if (confirmLogout) {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    window.location.href = "login.html";
  }
});

addTaskBtn.addEventListener("click", async () => {
  console.log("👉 Tombol tambah diklik");
  const text = taskInput.value.trim();
  if (text === "") return;

  if (!text) {
    alert("Teks tugas kosong!");
    return;
  }

  const priority = document.querySelector(
    'input[name="priority"]:checked'
  ).value;
  const createdAt = new Date().toISOString();
  const deadline = document.getElementById("deadline-input").value;

  const taskData = {
    id: Date.now(),
    text,
    completed: false,
    createdAt,
    priority,
    pinned: false,
    deadline,
  };

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (editIndex !== null) {
    const deadline = document.getElementById("deadline-input").value;
    const task = tasks.find((t) => t.id === editIndex);
    if (task) {
      const originalText = task.text;
      const originalDeadline = task.deadline;

      if (originalText !== text || originalDeadline !== deadline) {
        task.text = text;
        task.deadline = deadline;
        await updateTaskOnServer(editIndex, text, deadline, priority);
      }
    }
    editIndex = null;
    addTaskBtn.textContent = "Tambah";
  } else {
    tasks.push(taskData);
    console.log("🎯 Input tugas:", text);

    console.log("🛫 Data yang dikirim ke server:", {
      email: currentUser.email,
      text: taskData.text,
      priority: taskData.priority,
      deadline: taskData.deadline,
    });

    try {
      const res = await fetch(`${apiBaseURL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"), // jangan lupa token!
        },
        body: JSON.stringify({
          email: currentUser.email,
          text: taskData.text,
          priority: taskData.priority,
          deadline: taskData.deadline,
        }),
      });

      const data = await res.json();
      console.log("✅ Tersimpan ke backend:", data);
    } catch (err) {
      console.error("💥 Gagal simpan ke backend:", err);
    }
    showToast("Tugas berhasil ditambahkan!", "success");
  }

  taskInput.value = "";
  document.getElementById("deadline-input").value = "";
  saveAndRender();
  showToast("Tugas berhasil ditambahkan.🥳", "success");
});

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  task.completed = !task.completed;
  renderTasks();

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  fetch(`${apiBaseURL}/update-task`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({
      email: currentUser.email,
      taskId: id,
      updatedFields: { completed: task.completed },
    }),
  });
}

function deleteTask(id) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  tasks = tasks.filter((t) => t.id !== id);
  renderTasks();
  showToast("Task dihapus!❌", "info");

  fetch(`${apiBaseURL}/tasks/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({ email: currentUser.email }),
  });
}
// Edit Tugas
function editTask(id) {
  console.log("Edit task index:", id);
  const task = tasks.find((t) => t.id === id);
  if (task) {
    taskInput.value = task.text;
    editIndex = id;
    addTaskBtn.textContent = "Simpan";
  }
}

async function updateTaskOnServer(id, text, deadline, priority) {
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  try {
    const res = await fetch(`${apiBaseURL}/update-task`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        email: currentUser.email,
        taskId: id,
        updatedFields: {
          text,
          deadline,
          priority,
        },
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log("✅ Tugas berhasil diupdate:", data);
      tasks = data.tasks || [];
      renderTasks();
    } else {
      console.error("❌ Gagal update:", data.message);
    }
  } catch (err) {
    console.error("💥 Error update:", err);
  }
}

function saveAndRender() {
  console.log("📝 Rendering tasks:", tasks);
  renderTasks();
}

function saveTasks() {}

function showToast(message = "Tugas ditambahkan!", type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;

  toast.className = "toast";
  toast.classList.add("show", type);

  // 🔊 Mainkan audio
  const sound = document.getElementById("audio-notify");
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch((err) => {
      console.warn("Gagal memutar audio:", err);
    });
  }

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

const themeToggleBtn = document.getElementById("toggle-theme");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  if (themeToggleBtn.type === "checkbox") themeToggleBtn.checked = true;
}

themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  showToast("Berubah mode😄", "warning");
});

const searchInput = document.getElementById("search-input");

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderTasks();
});

const clearAllBtn = document.getElementById("clear-all-btn");

clearAllBtn.addEventListener("click", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || !currentUser.email) {
    console.error("❌ User belum login / tidak valid.");
    return;
  }
  const confirmClear = confirm("Yakin ingin menghapus semua tugas?");
  if (confirmClear) {
    tasks = [];
    saveAndRender();
    showToast("Semua tugas dihapus!", "warning");

    fetch(`${apiBaseURL}/clear-tasks`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({ email: currentUser.email }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ Semua tugas dihapus:", data);
        tasks = [];
        renderTasks();
        showToast("Semua tugas berhasil dihapus!");
      })
      .catch((err) => {
        console.error("❌ Gagal hapus semua tugas:", err);
      });
  }
});

function formatTime(isoString) {
  if (!isoString) return "";

  const created = new Date(isoString);
  const now = new Date();

  const isToday = created.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = created.toDateString() === yesterday.toDateString();

  const timeString = created.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Hari ini, ${timeString}`;
  if (isYesterday) return `Kemarin, ${timeString}`;

  return (
    created.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }) + `, ${timeString}`
  );
}

function formatForInput(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function togglePin(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.pinned = !task.pinned;

    fetch(`${apiBaseURL}/update-task`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({
        email: currentUser.email,
        taskId: task.id,
        updatedFields: { pinned: task.pinned },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ Pinned updated:", data);
        saveAndRender();
      })
      .catch((err) => console.error("❌ Gagal update pinned:", err));
  }
}

function updateDeadline(taskId, newDeadline) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const token = localStorage.getItem("token");

  if (!currentUser || !currentUser.email || !token) {
    console.error("❌ User belum login atau token tidak ada.");
    return;
  }

  fetch(`${apiBaseURL}/update-task`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      email: currentUser.email,
      taskId,
      updatedFields: { deadline: newDeadline },
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Update gagal: " + res.status);
      return res.json();
    })
    .then((data) => {
      console.log("✅ Deadline diperbarui:", data);
      const updateTaskOnServer = data.task;
      tasks = tasks.map((t) =>
        t.id === updateTaskOnServer.id ? updateTaskOnServer : t
      );
      saveAndRender();
    })
    .catch((err) => console.error("❌ Gagal update deadline:", err));
}

function updateDeadlineFromInput(inputElement) {
  const taskId = parseInt(inputElement.dataset.id);
  const newDeadline = inputElement.value;
  updateDeadline(taskId, newDeadline);
}

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString) {
  const options = { day: "numeric", month: "long", year: "numeric" };
  return new Date(dateString).toLocaleDateString("id-ID", options);
}

function cekDeadlineTerdekat() {
  const now = new Date();

  tasks.forEach((task) => {
    if (!task.deadline) return;

    const deadline = new Date(task.deadline);
    const selisihMs = deadline - now;
    const selisihMenit = Math.floor(selisihMs / 60000);

    if (!task.notified) task.notified = {};

    if (selisihMenit <= 180 && !task.notified.minus3h && selisihMenit > 1) {
      showToast(
        `⏳ Deadline untuk "${task.text}" tinggal 3 jam lagi!`,
        "warning"
      );
      task.notified.minus3h = true;
    }

    if (selisihMenit <= 1 && selisihMenit > 0 && !task.notified.minus1m) {
      showToast(`⚠️ Deadline "${task.text}" tinggal 1 menit!`, "danger");
      task.notified.minus1m = true;
    }

    if (selisihMenit <= 0 && !task.notified.passed) {
      showToast(`❌ Deadline "${task.text}" telah lewat!`, "danger");
      task.notified.passed = true;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const closeBtn = document.getElementById("close-sidebar");

  menuToggle?.addEventListener("click", () => {
    sidebar.classList.add("sidebar-visible");
    menuToggle.classList.add("active");

    document.body.classList.toggle(
      "sidebar-hidden",
      !sidebar.classList.contains("sidebar-visible")
    );
  });

  document.addEventListener("click", (e) => {
    const isClickInsideSidebar = sidebar.contains(e.target);
    const isClickMenuButton = menuToggle.contains(e.target);

    if (!isClickInsideSidebar && !isClickMenuButton) {
      sidebar?.classList.remove("sidebar-visible");
      menuToggle?.classList.remove("active");
    }
  });
});
