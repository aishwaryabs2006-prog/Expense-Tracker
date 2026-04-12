/**
 * Client-side auth for Expense Tracker (local demo).
 * Passwords are hashed with SHA-256 + static pepper (not a substitute for server auth).
 */
(function () {
  "use strict";

  const SESSION_KEY = "expenseTrackerSession";
  const USERS_KEY = "expenseTrackerUsers";
  const USERNAME_PREFIX = "expenseTrackerUsername_";
  const PEPPER = "expense-tracker-local-v1";

  function safeStorageId(email) {
    const e = String(email).trim().toLowerCase();
    let h = 0;
    for (let i = 0; i < e.length; i += 1) {
      h = (Math.imul(31, h) + e.charCodeAt(i)) | 0;
    }
    const tail = e.replace(/[^a-z0-9]/gi, "").slice(0, 24);
    return "u" + Math.abs(h).toString(36) + "_" + tail;
  }

  function getUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async function sha256Hex(str) {
    if (window.crypto && window.crypto.subtle) {
      try {
        const buf = new TextEncoder().encode(str);
        const hash = await crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } catch {
        /* fall through */
      }
    }
    let h1 = 5381;
    let h2 = 0;
    for (let i = 0; i < str.length; i += 1) {
      const c = str.charCodeAt(i);
      h1 = (Math.imul(33, h1) ^ c) >>> 0;
      h2 = (Math.imul(31, h2) + c) | 0;
    }
    return `fb_${h1.toString(16)}_${(h2 >>> 0).toString(16)}_${str.length}`;
  }

  async function hashPassword(password, email) {
    const normalized = String(email).trim().toLowerCase();
    return sha256Hex(`${PEPPER}|${normalized}|${password}`);
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || typeof o.email !== "string" || !o.email.trim()) return null;
      return { email: o.email.trim() };
    } catch {
      return null;
    }
  }

  function setSession(email) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: String(email).trim() }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function usernameStorageKey(email) {
    return USERNAME_PREFIX + safeStorageId(email);
  }

  function getUsername(email) {
    const em = String(email || "").trim().toLowerCase();
    if (!em) return null;
    try {
      const raw = localStorage.getItem(usernameStorageKey(em));
      if (!raw) return null;
      const t = String(raw).trim();
      return t || null;
    } catch {
      return null;
    }
  }

  function setUsername(email, username) {
    const em = String(email).trim().toLowerCase();
    if (!em) return { ok: false, error: "Not signed in." };
    const name = String(username).trim();
    if (!name) return { ok: false, error: "Please enter a username." };
    if (name.length > 40) return { ok: false, error: "Username must be 40 characters or fewer." };
    try {
      localStorage.setItem(usernameStorageKey(em), name);
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not save username in this browser." };
    }
  }

  function getUsernameForSession() {
    const s = getSession();
    if (!s) return null;
    return getUsername(s.email);
  }

  function getDisplayName() {
    const s = getSession();
    if (!s) return "";
    return getUsername(s.email) || s.email;
  }

  function getStorageKeys(email) {
    const id = safeStorageId(email);
    return {
      expenses: `expenseTrackerExpenses_${id}`,
      monthlyBudget: `expenseTrackerMonthlyBudget_${id}`,
      annualBudget: `expenseTrackerAnnualBudget_${id}`,
      recurring: `expenseTrackerRecurring_${id}`,
    };
  }

  function getStorageKeysForSession() {
    const s = getSession();
    if (!s) return null;
    return getStorageKeys(s.email);
  }

  function requireAuth() {
    if (!getSession()) {
      window.location.replace("login.html");
      return false;
    }
    return true;
  }

  function logout() {
    clearSession();
    window.location.href = "login.html";
  }

  async function signUp(email, password) {
    const em = String(email).trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters." };
    }

    const users = getUsers();
    if (users.some((u) => u.email === em)) {
      return { ok: false, error: "An account with this email already exists." };
    }

    const passwordHash = await hashPassword(password, em);
    users.push({
      id: crypto.randomUUID(),
      email: em,
      passwordHash,
      createdAt: Date.now(),
    });
    saveUsers(users);
    setSession(em);
    return { ok: true };
  }

  async function signIn(email, password) {
    const em = String(email).trim().toLowerCase();
    if (!em || !password) {
      return { ok: false, error: "Enter email and password." };
    }

    const users = getUsers();
    const user = users.find((u) => u.email === em);
    if (!user) {
      return { ok: false, error: "Invalid email or password." };
    }

    const hash = await hashPassword(password, em);
    if (hash !== user.passwordHash) {
      return { ok: false, error: "Invalid email or password." };
    }

    setSession(em);
    return { ok: true };
  }

  window.ExpenseAuth = {
    getSession,
    setSession,
    clearSession,
    getStorageKeys,
    getStorageKeysForSession,
    getUsername,
    setUsername,
    getUsernameForSession,
    getDisplayName,
    requireAuth,
    logout,
    signUp,
    signIn,
  };
})();
