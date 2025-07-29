import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersPath = path.join(__dirname, "users.json");

export function loadUsers() {
  if (!fs.existsSync(usersPath)) return [];
  const data = fs.readFileSync(usersPath, "utf8");
  return JSON.parse(data);
}

export function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

export function findUserByEmail(email) {
  const users = loadUsers();
  return users.find(
    (user) =>
      user.email && email && user.email.toLowerCase() === email.toLowerCase()
  );
}

export async function registerUser(email, password) {
  const users = loadUsers();
  const hashedPassword = await bcrypt.hash(password, 10); // hash password
  const newUser = { email, password: hashedPassword, tasks: [] };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export async function validateLogin(email, password) {
  const user = findUserByEmail(email);
  if (!user) return false;
  return await bcrypt.compare(password, user.password); // compare hash
}
