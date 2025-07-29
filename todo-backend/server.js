import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();
import {
  loadUsers,
  saveUsers,
  validateLogin,
  registerUser,
  findUserByEmail,
} from "./authUtils.js";
import { error } from "console";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || "default-jwt-secret";
console.log("PORT:", PORT);
console.log("JWT_SECRET:", JWT_SECRET);

app.use(cors());
app.use(express.json());

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = findUserByEmail(email);
  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Email tidak ditemukan" });
  }

  const match = bcrypt.compareSync(password, user.password);
  if (!match) {
    return res.status(401).json({ success: false, message: "Password salah" });
  }

  const token = jwt.sign({ email: user.email }, JWT_SECRET, {
    expiresIn: "1h",
  });

  res.status(200).json({
    success: true,
    message: "Login berhasil",
    token,
    user: { email: user.email },
  });
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email sudah terdaftar" });
    }

    await registerUser(email, password);
    res.status(201).json({ success: true, message: "Pendaftaran berhasil" });
  } catch (err) {
    console.error("❌ Gagal mendaftar:", err);
    res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan di server" });
  }
});

app.post("/tasks", authMiddleware, (req, res) => {
  const email = req.user.email;

  const text = req.body.text || "";
  const priority = req.body.priority || "biasa";

  const newTask = {
    id: Date.now(),
    text: text,
    completed: false,
    createdAt: new Date().toISOString(),
    priority: priority,
    pinned: false,
    deadline: req.body.deadline || null,
  };

  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (text && typeof text === "string" && typeof priority === "string") {
    user.tasks.push(newTask);
  } else {
    console.warn("⛔ Task tidak valid, tidak disimpan:", req.body);
  }

  saveUsers(users);

  res.json({ success: true });
});

app.get("/tasks", authMiddleware, (req, res) => {
  const email = req.user.email;
  console.log("👁️ req.user sekarang:", req.user);

  const user = findUserByEmail(email);
  console.log("📨 Ambil tasks untuk:", email);
  console.log("👤 User ditemukan:", user);
  console.log("📁 Semua users:", loadUsers());

  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ tasks: user.tasks || [] });
});

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});

app.post("/delete-task", authMiddleware, (req, res) => {
  const email = req.user.email;
  const { taskId } = req.body;

  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.tasks = user.tasks.filter((t) => t.id !== taskId);
  saveUsers(users);

  res.json({ success: true });
});

app.delete("/tasks/:id", authMiddleware, (req, res) => {
  const taskId = parseInt(req.params.id);
  const email = req.user.email;

  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.tasks = user.tasks.filter((t) => t.id !== taskId);
  saveUsers(users);

  res.json({ success: true });
});

app.put("/clear-tasks", authMiddleware, (req, res) => {
  const email = req.user.email;
  console.log("🔄 Clear tasks untuk:", email);

  const users = loadUsers();
  const user = users.find((u) => u.email === email);

  if (!user) return res.status(404).json({ error: "User not found" });

  user.tasks = [];
  saveUsers(users);

  res.json({ success: true });
});

app.post("/import-tasks", authMiddleware, (req, res) => {
  const email = req.user.email;
  const importedTasks = req.body.tasks;

  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.tasks.push(...importedTasks);
  user.tasks = user.tasks.filter((t) => t && typeof t === "object" && t.text);

  saveUsers(users);

  res.json({ success: true, tasks: user.tasks });
});

app.put("/update-task", authMiddleware, (req, res) => {
  const email = req.user.email;
  const { taskId, updatedFields } = req.body;

  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });

  const task = user.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  Object.assign(task, updatedFields);
  saveUsers(users);

  res.json({ success: true, task });
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Token tidak ada" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, "rahasia-super-token-fadhli-dan-melisa");
    req.user = decoded;
    if (!decoded.email) {
      return res
        .status(403)
        .json({ error: "Token tidak valid (tidak ada email)" });
    }

    next();
  } catch (err) {
    return res.status(403).json({ error: "Token tidak valid" });
  }
}
