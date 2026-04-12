(function () {
  "use strict";

  const Auth = window.ExpenseAuth;
  if (!Auth || !Auth.requireAuth()) return;

  const userKeys = Auth.getStorageKeysForSession();
  if (!userKeys) {
    Auth.logout();
    return;
  }

  const STORAGE_KEY = userKeys.expenses;
  const THEME_KEY = "expenseTrackerTheme";
  const BUDGET_KEY = userKeys.monthlyBudget;
  const ANNUAL_BUDGET_KEY = userKeys.annualBudget;
  const RECURRING_KEY =
    userKeys.recurring || STORAGE_KEY.replace("Expenses", "Recurring");

  const VOICE_SYNONYMS = {
    food: ["food", "groceries", "grocery", "restaurant", "lunch", "dinner", "breakfast", "eat", "cafe", "coffee", "snack"],
    transport: ["transport", "uber", "ola", "cab", "taxi", "petrol", "fuel", "gas", "metro", "bus", "train", "parking", "auto"],
    shopping: ["shopping", "clothes", "amazon", "flipkart", "mall", "purchase"],
    bills: ["bills", "bill", "rent", "electricity", "wifi", "internet", "subscription", "emi"],
    entertainment: ["entertainment", "movie", "netflix", "game", "concert", "show", "spotify"],
    health: ["health", "medicine", "pharmacy", "doctor", "hospital", "gym", "fitness"],
    other: ["other", "misc", "miscellaneous"],
  };

  const CATEGORIES = [
    { id: "food", label: "Food", icon: "🍔" },
    { id: "transport", label: "Transport", icon: "🚗" },
    { id: "shopping", label: "Shopping", icon: "🛒" },
    { id: "bills", label: "Bills", icon: "📄" },
    { id: "entertainment", label: "Entertainment", icon: "🎬" },
    { id: "health", label: "Health", icon: "🏥" },
    { id: "other", label: "Other", icon: "📌" },
  ];

  const CHART_SEGMENT_COLORS = {
    food: "#f59e0b",
    transport: "#3b82f6",
    shopping: "#ec4899",
    bills: "#8b5cf6",
    entertainment: "#06b6d4",
    health: "#10b981",
    other: "#64748b",
  };

  const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

  const els = {
    form: document.getElementById("expenseForm"),
    editId: document.getElementById("editId"),
    amount: document.getElementById("amount"),
    category: document.getElementById("category"),
    date: document.getElementById("date"),
    note: document.getElementById("note"),
    submitBtn: document.getElementById("submitBtn"),
    cancelEdit: document.getElementById("cancelEdit"),
    filterCategory: document.getElementById("filterCategory"),
    searchInput: document.getElementById("searchInput"),
    dateFrom: document.getElementById("dateFrom"),
    dateTo: document.getElementById("dateTo"),
    clearFilters: document.getElementById("clearFilters"),
    expenseList: document.getElementById("expenseList"),
    emptyState: document.getElementById("emptyState"),
    totalExpense: document.getElementById("totalExpense"),
    todayExpense: document.getElementById("todayExpense"),
    monthExpense: document.getElementById("monthExpense"),
    themeToggle: document.getElementById("themeToggle"),
    budgetForm: document.getElementById("budgetForm"),
    budgetInput: document.getElementById("budgetInput"),
    budgetStatus: document.getElementById("budgetStatus"),
    budgetAlert: document.getElementById("budgetAlert"),
    annualBudgetForm: document.getElementById("annualBudgetForm"),
    annualBudgetInput: document.getElementById("annualBudgetInput"),
    annualBudgetStatus: document.getElementById("annualBudgetStatus"),
    annualBudgetAlert: document.getElementById("annualBudgetAlert"),
    chartCanvas: document.getElementById("expenseChart"),
    chartPlot: document.getElementById("chartPlot"),
    chartEmpty: document.getElementById("chartEmpty"),
    headerUser: document.getElementById("headerUser"),
    logoutBtn: document.getElementById("logoutBtn"),
    insightsList: document.getElementById("insightsList"),
    budgetUsageWrap: document.getElementById("budgetUsageWrap"),
    budgetUsageFill: document.getElementById("budgetUsageFill"),
    budgetUsagePercentText: document.getElementById("budgetUsagePercentText"),
    budgetThresholdMsg: document.getElementById("budgetThresholdMsg"),
    voiceBtn: document.getElementById("voiceBtn"),
    voiceStatus: document.getElementById("voiceStatus"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    recurringSuggest: document.getElementById("recurringSuggest"),
    recurringSuggestText: document.getElementById("recurringSuggestText"),
    markRecurringBtn: document.getElementById("markRecurringBtn"),
    dismissRecurringBtn: document.getElementById("dismissRecurringBtn"),
    spendingMoodCard: document.getElementById("spendingMoodCard"),
    moodPill: document.getElementById("moodPill"),
    moodMessage: document.getElementById("moodMessage"),
    moodDetail: document.getElementById("moodDetail"),
    noSpendMessage: document.getElementById("noSpendMessage"),
    noSpendSub: document.getElementById("noSpendSub"),
    noSpendCalendar: document.getElementById("noSpendCalendar"),
    savingsMessage: document.getElementById("savingsMessage"),
    savingsDetail: document.getElementById("savingsDetail"),
    recentActivityList: document.getElementById("recentActivityList"),
    welcomeOverlay: document.getElementById("welcomeOverlay"),
    welcomeStepPrompt: document.getElementById("welcomeStepPrompt"),
    welcomeStepGreet: document.getElementById("welcomeStepGreet"),
    welcomeUsernameInput: document.getElementById("welcomeUsernameInput"),
    welcomeUsernameError: document.getElementById("welcomeUsernameError"),
    welcomeUsernameSubmit: document.getElementById("welcomeUsernameSubmit"),
    welcomeGreetText: document.getElementById("welcomeGreetText"),
    welcomeContinueBtn: document.getElementById("welcomeContinueBtn"),
    coinLayer: document.getElementById("coinLayer"),
  };

  let expenses = [];
  let monthlyBudget = null;
  let annualBudget = null;
  let expenseChart = null;
  let recurringState = { recurring: [], dismissed: [] };
  let recurringCandidate = null;
  let speechRecognition = null;
  let lastEnteredExpenseId = null;

  function initCoinLayer() {
    const layer = els.coinLayer;
    if (!layer) return;
    const glyphs = ["💰", "🪙", "💵", "💸", "💴", "🤑", "💲", "🪙"];
    const count = 22;
    for (let i = 0; i < count; i += 1) {
      const span = document.createElement("span");
      span.className = "coin";
      span.setAttribute("aria-hidden", "true");
      span.textContent = glyphs[i % glyphs.length];
      const left = 2 + ((i * 83) % 96);
      const dur = 16 + (i % 10) * 2.4;
      const delay = -((i * 1.7) % dur);
      const dx = `${-35 + ((i * 47) % 70)}px`;
      const rot = `${200 + ((i * 61) % 340)}deg`;
      span.style.left = `${left}%`;
      span.style.animationDuration = `${dur}s`;
      span.style.animationDelay = `${delay}s`;
      span.style.setProperty("--coin-dx", dx);
      span.style.setProperty("--coin-rot", rot);
      layer.appendChild(span);
    }
  }

  function updateHeaderUser() {
    if (!els.headerUser) return;
    const name = Auth.getDisplayName();
    els.headerUser.textContent = name;
    els.headerUser.title = name;
  }

  function setupWelcomeFlow() {
    const session = Auth.getSession();
    const o = els.welcomeOverlay;
    if (!session || !o || !els.welcomeUsernameInput || !els.welcomeUsernameSubmit || !els.welcomeContinueBtn) return;
    if (Auth.getUsernameForSession()) return;

    const showPrompt = () => {
      o.classList.remove("hidden");
      o.setAttribute("aria-hidden", "false");
      els.welcomeStepPrompt.classList.remove("hidden");
      els.welcomeStepGreet.classList.add("hidden");
      els.welcomeUsernameError.classList.add("hidden");
      els.welcomeUsernameError.textContent = "";
      els.welcomeUsernameInput.value = "";
      queueMicrotask(() => els.welcomeUsernameInput.focus());
    };

    const hideOverlay = () => {
      o.classList.add("hidden");
      o.setAttribute("aria-hidden", "true");
    };

    const onSaveUsername = () => {
      els.welcomeUsernameError.classList.add("hidden");
      els.welcomeUsernameError.textContent = "";
      const result = Auth.setUsername(session.email, els.welcomeUsernameInput.value);
      if (!result.ok) {
        els.welcomeUsernameError.textContent = result.error;
        els.welcomeUsernameError.classList.remove("hidden");
        return;
      }
      const u = Auth.getUsernameForSession() || "";
      els.welcomeGreetText.textContent = `Welcome ${u}!`;
      els.welcomeStepPrompt.classList.add("hidden");
      els.welcomeStepGreet.classList.remove("hidden");
      updateHeaderUser();
      els.welcomeContinueBtn.focus();
    };

    showPrompt();

    els.welcomeUsernameSubmit.addEventListener("click", onSaveUsername);
    els.welcomeUsernameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSaveUsername();
      }
    });
    els.welcomeContinueBtn.addEventListener("click", hideOverlay);
  }

  /* —— Storage —— */

  function loadExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveExpenses() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }

  function loadBudget() {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (raw === null || raw === "") return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function saveBudget(value) {
    if (value === null || value === undefined) {
      localStorage.removeItem(BUDGET_KEY);
      return;
    }
    localStorage.setItem(BUDGET_KEY, String(value));
  }

  function loadAnnualBudget() {
    const raw = localStorage.getItem(ANNUAL_BUDGET_KEY);
    if (raw === null || raw === "") return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function saveAnnualBudget(value) {
    if (value === null || value === undefined) {
      localStorage.removeItem(ANNUAL_BUDGET_KEY);
      return;
    }
    localStorage.setItem(ANNUAL_BUDGET_KEY, String(value));
  }

  function loadRecurringState() {
    try {
      const raw = localStorage.getItem(RECURRING_KEY);
      if (!raw) return { recurring: [], dismissed: [] };
      const o = JSON.parse(raw);
      return {
        recurring: Array.isArray(o.recurring) ? o.recurring : [],
        dismissed: Array.isArray(o.dismissed) ? o.dismissed : [],
      };
    } catch {
      return { recurring: [], dismissed: [] };
    }
  }

  function saveRecurringState() {
    localStorage.setItem(
      RECURRING_KEY,
      JSON.stringify({ recurring: recurringState.recurring, dismissed: recurringState.dismissed })
    );
  }

  /* —— Format & dates —— */

  function formatMoney(n) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isSameCalendarDay(isoDate, ref) {
    return isoDate === ref;
  }

  function isSameMonth(isoDate, refDate) {
    const [y, m] = isoDate.split("-").map(Number);
    return y === refDate.getFullYear() && m === refDate.getMonth() + 1;
  }

  function isSameYear(isoDate, refDate) {
    const y = parseInt(isoDate.slice(0, 4), 10);
    return y === refDate.getFullYear();
  }

  function sumAmount(list) {
    return list.reduce((s, e) => s + Number(e.amount), 0);
  }

  function getCurrentMonthExpenses() {
    const now = new Date();
    return expenses.filter((e) => isSameMonth(e.date, now));
  }

  function getCurrentYearExpenses() {
    const now = new Date();
    return expenses.filter((e) => isSameYear(e.date, now));
  }

  function spendTotalsByDate() {
    const map = {};
    expenses.forEach((e) => {
      const a = Number(e.amount);
      if (!Number.isFinite(a) || a <= 0) return;
      map[e.date] = (map[e.date] || 0) + a;
    });
    return map;
  }

  function computeNoSpendStreak() {
    if (expenses.length === 0) return 0;
    const spend = spendTotalsByDate();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 400; i += 1) {
      const iso = dateToISO(d);
      if (spend[iso] > 0) break;
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function updateSpendingMoodCard() {
    const card = els.spendingMoodCard;
    const pill = els.moodPill;
    const msg = els.moodMessage;
    const detail = els.moodDetail;
    if (!card || !pill || !msg || !detail) return;

    const monthSpend = sumAmount(getCurrentMonthExpenses());
    card.dataset.mood = "none";
    pill.textContent = "—";

    if (monthlyBudget === null || monthlyBudget <= 0) {
      msg.textContent = "Set a monthly budget to see how your spending feels.";
      detail.textContent = "";
      return;
    }

    const ratio = monthSpend / monthlyBudget;
    const pct = ratio * 100;

    if (ratio > 1) {
      card.dataset.mood = "bad";
      pill.textContent = "Overspending 🚨";
      msg.textContent = "Overspending 🚨";
      detail.textContent = `You’ve used ${pct.toFixed(0)}% of your budget (${formatMoney(monthSpend)} of ${formatMoney(monthlyBudget)}).`;
    } else if (pct >= 70) {
      card.dataset.mood = "warn";
      pill.textContent = "Warning ⚠️";
      msg.textContent = "Be careful ⚠️";
      detail.textContent = `${pct.toFixed(0)}% of budget used — between 70% and 100%.`;
    } else {
      card.dataset.mood = "good";
      pill.textContent = "Good 👍";
      msg.textContent = "You're spending well 👍";
      detail.textContent = `${pct.toFixed(0)}% of budget used — under 70%.`;
    }
  }

  function updateSavingsInsightCard() {
    const msg = els.savingsMessage;
    const detail = els.savingsDetail;
    const card = els.savingsInsightCard;
    if (!msg || !detail || !card) return;

    card.dataset.savings = "neutral";
    const monthSpend = sumAmount(getCurrentMonthExpenses());

    if (monthlyBudget === null || monthlyBudget <= 0) {
      msg.textContent = "Set a monthly budget to track savings.";
      detail.textContent = "We’ll compare this month’s spending to your budget.";
      return;
    }

    const savings = monthlyBudget - monthSpend;
    if (savings >= 0) {
      card.dataset.savings = "positive";
      msg.textContent = `You saved ${formatMoney(savings)} this month 🎉`;
      detail.textContent = `${formatMoney(monthSpend)} spent of ${formatMoney(monthlyBudget)} budget.`;
    } else {
      card.dataset.savings = "negative";
      msg.textContent = "You’re over budget this month.";
      detail.textContent = `Overspent by ${formatMoney(Math.abs(savings))}. Trim spending or adjust your budget.`;
    }
  }

  function buildNoSpendCalendarEl() {
    const wrap = els.noSpendCalendar;
    if (!wrap) return;
    wrap.innerHTML = "";
    const spend = spendTotalsByDate();
    const start = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() - i);
      const iso = dateToISO(d);
      const hadSpend = spend[iso] > 0;
      const cell = document.createElement("span");
      cell.className = "no-spend-cal__day" + (hadSpend ? " no-spend-cal__day--spent" : " no-spend-cal__day--clear");
      cell.title = `${iso}: ${hadSpend ? "had expenses" : "no expenses"}`;
      cell.setAttribute("aria-hidden", "true");
      wrap.appendChild(cell);
    }
  }

  function updateNoSpendCard() {
    const msg = els.noSpendMessage;
    const sub = els.noSpendSub;
    const wrap = els.noSpendCalendar;
    if (!msg || !sub) return;

    const streak = computeNoSpendStreak();
    if (expenses.length === 0) {
      msg.textContent = "🔥 0 No-Spend Days";
      sub.textContent = "Add expenses so we can count streaks from your last spend day.";
      if (wrap) {
        wrap.innerHTML = "";
        wrap.classList.add("hidden");
      }
      return;
    }

    msg.textContent = `🔥 ${streak} No-Spend Day${streak === 1 ? "" : "s"}`;
    sub.textContent =
      streak === 0
        ? "Your streak resets on any day you add an expense. Keep logging to grow it again."
        : "Consecutive calendar days with no expenses logged, counting back from today.";

    if (wrap) {
      wrap.classList.remove("hidden");
      buildNoSpendCalendarEl();
    }
  }

  function updateRecentActivityFeed() {
    const ul = els.recentActivityList;
    if (!ul) return;
    ul.innerHTML = "";

    const sorted = [...expenses].sort((a, b) => {
      const ca = a.createdAt != null ? a.createdAt : 0;
      const cb = b.createdAt != null ? b.createdAt : 0;
      if (cb !== ca) return cb - ca;
      return b.date.localeCompare(a.date);
    });
    const slice = sorted.slice(0, 8);

    if (slice.length === 0) {
      const li = document.createElement("li");
      li.className = "activity-feed__item activity-feed__item--empty";
      li.textContent = "No activity yet — add an expense to see it here.";
      ul.appendChild(li);
      return;
    }

    slice.forEach((exp, idx) => {
      const cat = categoryMap[exp.category] || CATEGORIES[CATEGORIES.length - 1];
      const li = document.createElement("li");
      li.className = "activity-feed__item";
      li.style.animationDelay = `${idx * 0.05}s`;
      li.setAttribute("role", "listitem");
      li.innerHTML = `<span class="activity-feed__icon" aria-hidden="true">${cat.icon}</span><span class="activity-feed__text">You spent ${formatMoney(
        exp.amount
      )} on ${cat.label}</span><span class="activity-feed__date">${exp.date}</span>`;
      ul.appendChild(li);
    });
  }

  function dateToISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function startOfWeekMonday(ref) {
    const dt = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    return dt;
  }

  function weekRangeISO(weekOffset) {
    const monday = startOfWeekMonday(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: dateToISO(monday), to: dateToISO(sunday) };
  }

  function sumBetweenInclusive(list, fromISO, toISO) {
    return sumAmount(list.filter((e) => e.date >= fromISO && e.date <= toISO));
  }

  function topCategoryBetween(list, fromISO, toISO) {
    const slice = list.filter((e) => e.date >= fromISO && e.date <= toISO);
    const totals = {};
    slice.forEach((e) => {
      const k = e.category in categoryMap ? e.category : "other";
      totals[k] = (totals[k] || 0) + Number(e.amount);
    });
    let bestId = null;
    let bestVal = 0;
    Object.keys(totals).forEach((id) => {
      if (totals[id] > bestVal) {
        bestVal = totals[id];
        bestId = id;
      }
    });
    return bestId && bestVal > 0 ? { id: bestId, amount: bestVal } : null;
  }

  /* —— Insights —— */

  function updateInsights() {
    if (!els.insightsList) return;
    els.insightsList.innerHTML = "";
    const items = [];

    const cur = weekRangeISO(0);
    const prev = weekRangeISO(-1);
    const curTotal = sumBetweenInclusive(expenses, cur.from, cur.to);
    const prevTotal = sumBetweenInclusive(expenses, prev.from, prev.to);

    if (expenses.length === 0) {
      items.push({
        icon: "💡",
        text: "Add expenses to unlock week-over-week insights and category trends.",
      });
    } else {
      if (prevTotal <= 0 && curTotal > 0) {
        items.push({
          icon: "📈",
          text: `This week you’ve logged ${formatMoney(curTotal)}. Keep tracking to compare with next week.`,
        });
      } else if (prevTotal > 0) {
        const pct = Math.round(((curTotal - prevTotal) / prevTotal) * 100);
        if (curTotal > prevTotal) {
          items.push({
            icon: "📊",
            text: `Your spending increased by ${pct}% this week compared to last week.`,
          });
        } else if (curTotal < prevTotal) {
          items.push({
            icon: "✨",
            text: `Your spending decreased by ${Math.abs(pct)}% this week compared to last week — nice work.`,
          });
        } else {
          items.push({
            icon: "➡️",
            text: "Your spending this week matches last week.",
          });
        }
      }

      const topCur = topCategoryBetween(expenses, cur.from, cur.to);
      const topPrev = topCategoryBetween(expenses, prev.from, prev.to);
      if (topCur) {
        const cat = categoryMap[topCur.id];
        items.push({
          icon: cat.icon,
          text: `Your highest spending category this week is ${cat.label} (${formatMoney(topCur.amount)}).`,
        });
      }
      if (topCur && topPrev && topCur.id !== topPrev.id && curTotal > 0 && prevTotal > 0) {
        const curCat = categoryMap[topCur.id];
        const prevCat = categoryMap[topPrev.id];
        const shareCur = curTotal > 0 ? (topCur.amount / curTotal) * 100 : 0;
        if (shareCur >= 35) {
          items.push({
            icon: "🔍",
            text: `You are spending more on ${curCat.label} this week than last week’s top category (${prevCat.label}).`,
          });
        }
      }
    }

    if (recurringState.recurring.length > 0) {
      items.push({
        icon: "🔁",
        text: `You’ve marked ${recurringState.recurring.length} recurring pattern(s) — stored separately for your reference.`,
      });
    }

    items.slice(0, 6).forEach((item) => {
      const li = document.createElement("li");
      li.className = "insight-item";
      li.setAttribute("role", "listitem");
      li.innerHTML = `<span class="insight-item__icon" aria-hidden="true">${item.icon}</span><span>${item.text}</span>`;
      els.insightsList.appendChild(li);
    });
  }

  /* —— Monthly budget usage bar & thresholds —— */

  function updateBudgetUsageUI() {
    if (!els.budgetUsageWrap || !els.budgetUsageFill) return;
    const monthSpend = sumAmount(getCurrentMonthExpenses());

    if (monthlyBudget === null || monthlyBudget <= 0) {
      els.budgetUsageWrap.classList.add("hidden");
      els.budgetUsageWrap.setAttribute("aria-hidden", "true");
      if (els.budgetThresholdMsg) els.budgetThresholdMsg.textContent = "";
      return;
    }

    const pct = Math.min(100, (monthSpend / monthlyBudget) * 100);
    els.budgetUsageWrap.classList.remove("hidden");
    els.budgetUsageWrap.setAttribute("aria-hidden", "false");
    els.budgetUsageFill.style.width = `${pct}%`;
    els.budgetUsageFill.classList.remove("budget-usage__fill--warn", "budget-usage__fill--critical");
    if (els.budgetUsagePercentText) {
      els.budgetUsagePercentText.textContent = `${pct.toFixed(0)}%`;
    }

    if (els.budgetThresholdMsg) {
      els.budgetThresholdMsg.classList.remove("budget-threshold-msg--warn", "budget-threshold-msg--critical");
      const remaining = monthlyBudget - monthSpend;
      if (pct >= 100) {
        els.budgetUsageFill.classList.add("budget-usage__fill--critical");
        els.budgetThresholdMsg.classList.add("budget-threshold-msg--critical");
        els.budgetThresholdMsg.textContent = `Critical: you’ve reached 100% of your monthly budget (${formatMoney(monthSpend)} of ${formatMoney(monthlyBudget)}).`;
      } else if (pct >= 80) {
        els.budgetUsageFill.classList.add("budget-usage__fill--warn");
        els.budgetThresholdMsg.classList.add("budget-threshold-msg--warn");
        els.budgetThresholdMsg.textContent = `Warning: you’ve used ${pct.toFixed(0)}% of your monthly budget. ${formatMoney(remaining)} remaining.`;
      } else {
        els.budgetThresholdMsg.textContent = `${formatMoney(remaining)} remaining this month (${(100 - pct).toFixed(0)}% of budget left).`;
      }
    }
  }

  /* —— Voice input —— */

  function resolveVoiceCategory(lower) {
    for (let i = 0; i < CATEGORIES.length; i += 1) {
      const c = CATEGORIES[i];
      const label = c.label.toLowerCase();
      if (lower.includes(label)) return c.id;
      const syns = VOICE_SYNONYMS[c.id];
      if (syns) {
        for (let j = 0; j < syns.length; j += 1) {
          if (lower.includes(syns[j])) return c.id;
        }
      }
    }
    return null;
  }

  function parseVoiceExpense(text) {
    if (!text || !String(text).trim()) return null;
    const raw = String(text).trim();
    const lower = raw.toLowerCase();
    const numMatch = lower.match(/([\d][\d,]*(?:\.\d+)?)/);
    if (!numMatch) return null;
    const amount = parseFloat(numMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const category = resolveVoiceCategory(lower) || "other";
    return { amount, category, note: raw.slice(0, 120) };
  }

  function addExpenseQuick(amount, category, note) {
    const id = crypto.randomUUID();
    lastEnteredExpenseId = id;
    expenses.push({
      id,
      amount,
      category,
      date: todayISO(),
      note: note || "Voice entry",
      createdAt: Date.now(),
    });
    saveExpenses();
    cancelEditMode();
    refreshUI();
  }

  function setVoiceStatus(msg, isError) {
    if (!els.voiceStatus) return;
    els.voiceStatus.textContent = msg || "";
    els.voiceStatus.classList.toggle("hidden", !msg);
    els.voiceStatus.classList.toggle("voice-hint--error", !!isError);
  }

  function initVoiceInput() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !els.voiceBtn) {
      if (els.voiceBtn) {
        els.voiceBtn.disabled = true;
        els.voiceBtn.title = "Voice input not supported in this browser";
      }
      return;
    }

    speechRecognition = new SR();
    speechRecognition.lang = "en-IN";
    speechRecognition.interimResults = false;
    speechRecognition.continuous = false;
    speechRecognition.maxAlternatives = 1;

    speechRecognition.addEventListener("result", (ev) => {
      const text = ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : "";
      const parsed = parseVoiceExpense(text);
      if (parsed) {
        setVoiceStatus(`Added ${formatMoney(parsed.amount)} — ${categoryMap[parsed.category].label}.`);
        addExpenseQuick(parsed.amount, parsed.category, `Voice: ${text}`);
      } else {
        setVoiceStatus(
          "Couldn’t understand that. Try: “Spent 200 on groceries” or “500 rupees for transport”.",
          true
        );
      }
    });

    speechRecognition.addEventListener("error", () => {
      els.voiceBtn.classList.remove("is-listening");
      setVoiceStatus("Speech not recognized or microphone unavailable. Please try again or type the expense.", true);
    });

    speechRecognition.addEventListener("end", () => {
      els.voiceBtn.classList.remove("is-listening");
    });

    els.voiceBtn.addEventListener("click", () => {
      if (els.voiceBtn.classList.contains("is-listening")) {
        try {
          speechRecognition.stop();
        } catch {
          /* ignore */
        }
        return;
      }
      setVoiceStatus("Listening… speak now.");
      els.voiceBtn.classList.add("is-listening");
      try {
        speechRecognition.start();
      } catch {
        els.voiceBtn.classList.remove("is-listening");
        setVoiceStatus("Could not start microphone. Check permissions.", true);
      }
    });
  }

  /* —— Recurring detection —— */

  function recurringDismissKey(cat, bucket) {
    return `${cat}:${bucket}`;
  }

  function isDismissedRecurring(cat, bucket) {
    return recurringState.dismissed.includes(recurringDismissKey(cat, bucket));
  }

  function isAlreadyMarkedRecurring(cat, bucket) {
    return recurringState.recurring.some(
      (r) => r.category === cat && Math.abs(Number(r.typicalAmount) - bucket) <= Math.max(bucket * 0.15, 25)
    );
  }

  function detectRecurringCandidate() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const isoMin = dateToISO(cutoff);
    const recent = expenses.filter((e) => e.date >= isoMin);
    const byCat = {};
    recent.forEach((e) => {
      const k = e.category in categoryMap ? e.category : "other";
      if (!byCat[k]) byCat[k] = [];
      byCat[k].push(e);
    });

    const keys = Object.keys(byCat);
    for (let i = 0; i < keys.length; i += 1) {
      const cat = keys[i];
      const list = byCat[cat];
      if (list.length < 3) continue;
      const buckets = {};
      list.forEach((e) => {
        const b = Math.round(Number(e.amount) / 25) * 25;
        if (!buckets[b]) buckets[b] = [];
        buckets[b].push(e);
      });
      const bucketNums = Object.keys(buckets).map(Number);
      for (let j = 0; j < bucketNums.length; j += 1) {
        const b = bucketNums[j];
        if (buckets[b].length >= 3) {
          if (isDismissedRecurring(cat, b) || isAlreadyMarkedRecurring(cat, b)) continue;
          const avg =
            buckets[b].reduce((s, x) => s + Number(x.amount), 0) / buckets[b].length;
          return { category: cat, bucket: b, count: buckets[b].length, avg };
        }
      }
    }
    return null;
  }

  function updateRecurringBanner() {
    if (!els.recurringSuggest || !els.recurringSuggestText) return;
    recurringCandidate = detectRecurringCandidate();
    if (!recurringCandidate) {
      els.recurringSuggest.classList.add("hidden");
      return;
    }
    const cat = categoryMap[recurringCandidate.category];
    els.recurringSuggestText.textContent = `This looks like a recurring expense: about ${formatMoney(
      recurringCandidate.avg
    )} on ${cat.label} (${recurringCandidate.count} similar entries in the last 90 days).`;
    els.recurringSuggest.classList.remove("hidden");
  }

  function onMarkRecurring() {
    if (!recurringCandidate) return;
    const cat = recurringCandidate.category;
    recurringState.recurring.push({
      id: crypto.randomUUID(),
      category: cat,
      typicalAmount: Math.round(recurringCandidate.avg * 100) / 100,
      label: categoryMap[cat].label,
      createdAt: Date.now(),
    });
    saveRecurringState();
    recurringCandidate = null;
    els.recurringSuggest.classList.add("hidden");
  }

  function onDismissRecurring() {
    if (!recurringCandidate) return;
    const key = recurringDismissKey(recurringCandidate.category, recurringCandidate.bucket);
    if (!recurringState.dismissed.includes(key)) recurringState.dismissed.push(key);
    saveRecurringState();
    recurringCandidate = null;
    els.recurringSuggest.classList.add("hidden");
  }

  /* —— CSV export —— */

  function escapeCsvCell(val) {
    const s = String(val == null ? "" : val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function exportExpensesCsv() {
    const rows = [["Date", "Category", "Amount", "Description"]];
    const sorted = sortExpenseList(expenses);
    sorted.forEach((e) => {
      const cat = categoryMap[e.category] || CATEGORIES[CATEGORIES.length - 1];
      rows.push([e.date, cat.label, String(e.amount), e.note || ""]);
    });
    const csv = rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* —— Search normalization —— */

  function normalizeForSearch(str) {
    if (str == null) return "";
    let s = String(str).toLowerCase();
    try {
      s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch {
      /* normalize unsupported */
    }
    return s;
  }

  function getSearchQuery() {
    return els.searchInput ? String(els.searchInput.value) : "";
  }

  function noteLooksImportant(note) {
    const t = String(note || "").toLowerCase();
    return /\b(rent|fees?|bills?)\b/.test(t);
  }

  /* —— Filters —— */

  function matchesCategory(expense, filterValue) {
    if (filterValue === "all") return true;
    return expense.category === filterValue;
  }

  function matchesDateRange(expense) {
    const from = els.dateFrom ? els.dateFrom.value : "";
    const to = els.dateTo ? els.dateTo.value : "";
    const d = expense.date;
    if (!from && !to) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  function matchesSearch(expense, rawQuery) {
    const trimmed = rawQuery == null ? "" : String(rawQuery).trim();
    if (!trimmed) return true;

    const q = normalizeForSearch(trimmed);
    if (!q) return true;

    const cat = categoryMap[expense.category] || CATEGORIES[CATEGORIES.length - 1];
    const note = normalizeForSearch(expense.note || "");
    const label = normalizeForSearch(cat.label);
    const id = normalizeForSearch(expense.category || "");

    if (note.includes(q) || label.includes(q) || id.includes(q)) return true;

    const amountNum = Number(expense.amount);
    if (Number.isFinite(amountNum)) {
      const asDec = normalizeForSearch(String(amountNum));
      const asInt = normalizeForSearch(String(Math.trunc(amountNum)));
      const compact = normalizeForSearch(String(amountNum).replace(".", ""));
      if (asDec.includes(q) || asInt.includes(q) || compact.includes(q)) return true;
    }

    return false;
  }

  function getFilteredExpenses() {
    const cat = els.filterCategory ? els.filterCategory.value : "all";
    const q = getSearchQuery();
    return expenses.filter(
      (e) => matchesCategory(e, cat) && matchesDateRange(e) && matchesSearch(e, q)
    );
  }

  function clearAllFilters() {
    if (els.searchInput) els.searchInput.value = "";
    if (els.filterCategory) els.filterCategory.value = "all";
    if (els.dateFrom) els.dateFrom.value = "";
    if (els.dateTo) els.dateTo.value = "";
    refreshUI();
  }

  function bindSearchInput() {
    const el = els.searchInput;
    if (!el) return;
    const run = () => refreshUI();
    el.addEventListener("input", run);
    el.addEventListener("keyup", run);
    el.addEventListener("paste", () => requestAnimationFrame(run));
    el.addEventListener("change", run);
  }

  /* —— Category selects —— */

  function populateCategorySelects() {
    els.category.innerHTML = '<option value="">Select category</option>';
    CATEGORIES.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = `${c.icon} ${c.label}`;
      els.category.appendChild(o);
    });

    els.filterCategory.innerHTML = '<option value="all">All categories</option>';
    CATEGORIES.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = `${c.icon} ${c.label}`;
      els.filterCategory.appendChild(o);
    });
  }

  /* —— Summaries —— */

  function updateSummaries() {
    const today = todayISO();
    const now = new Date();

    els.totalExpense.textContent = formatMoney(sumAmount(expenses));
    els.todayExpense.textContent = formatMoney(
      sumAmount(expenses.filter((e) => isSameCalendarDay(e.date, today)))
    );
    els.monthExpense.textContent = formatMoney(
      sumAmount(expenses.filter((e) => isSameMonth(e.date, now)))
    );
  }

  /* —— Chart —— */

  function getCssColor(varName, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v || fallback;
  }

  function buildChartDataset() {
    const monthList = getCurrentMonthExpenses();
    const totals = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
    monthList.forEach((e) => {
      const key = totals[e.category] !== undefined ? e.category : "other";
      totals[key] += Number(e.amount);
    });

    const labels = [];
    const data = [];
    const colors = [];

    CATEGORIES.forEach((c) => {
      if (totals[c.id] > 0) {
        labels.push(`${c.icon} ${c.label}`);
        data.push(totals[c.id]);
        colors.push(CHART_SEGMENT_COLORS[c.id] || CHART_SEGMENT_COLORS.other);
      }
    });

    return { labels, data, colors, hasData: data.length > 0 };
  }

  function applyChartTheme() {
    if (!expenseChart) return;
    const legendColor = getCssColor("--text-muted", "#64748b");
    const border = getCssColor("--bg-elevated", "#ffffff");
    expenseChart.options.plugins.legend.labels.color = legendColor;
    const ds = expenseChart.data.datasets[0];
    if (ds) ds.borderColor = border;
    expenseChart.update();
  }

  function ensureChart() {
    if (typeof Chart === "undefined" || !els.chartCanvas) return;

    const { labels, data, colors, hasData } = buildChartDataset();

    els.chartEmpty.classList.toggle("hidden", hasData);
    els.chartPlot.classList.toggle("hidden", !hasData);

    const legendColor = getCssColor("--text-muted", "#64748b");

    if (!hasData) {
      if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
      }
      return;
    }

    if (expenseChart) {
      expenseChart.data.labels = labels;
      expenseChart.data.datasets[0].data = data;
      expenseChart.data.datasets[0].backgroundColor = colors;
      expenseChart.options.plugins.legend.labels.color = legendColor;
      expenseChart.update();
      return;
    }

    expenseChart = new Chart(els.chartCanvas.getContext("2d"), {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: getCssColor("--bg-elevated", "#ffffff"),
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: "easeOutQuart" },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: legendColor,
              padding: 14,
              usePointStyle: true,
              font: { family: getComputedStyle(document.body).fontFamily, size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const value = ctx.raw;
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total ? ((value / total) * 100).toFixed(1) : "0";
                return ` ${ctx.label}: ${formatMoney(value)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
    requestAnimationFrame(() => {
      if (expenseChart) expenseChart.resize();
    });
  }

  function updateChart() {
    ensureChart();
  }

  /* —— Budget UI —— */

  function updateMonthlyBudgetUI() {
    const monthSpend = sumAmount(getCurrentMonthExpenses());

    if (monthlyBudget === null) {
      els.budgetStatus.className = "budget-status";
      els.budgetStatus.innerHTML =
        "<strong>Monthly budget</strong><span>Set a budget to track spending against this month’s total.</span>";
      els.budgetAlert.classList.add("hidden");
      els.budgetAlert.textContent = "";
      updateBudgetUsageUI();
      return;
    }

    const remaining = monthlyBudget - monthSpend;
    const over = monthSpend > monthlyBudget;

    els.budgetStatus.className = over
      ? "budget-status budget-status--warn"
      : "budget-status budget-status--ok";
    els.budgetStatus.innerHTML = over
      ? `<strong>Over budget</strong><span>You’ve spent <span class="budget-remaining">${formatMoney(
          monthSpend
        )}</span> of ${formatMoney(monthlyBudget)} this month (${formatMoney(
          Math.abs(remaining)
        )} over).</span>`
      : `<strong>Remaining this month</strong><span class="budget-remaining">${formatMoney(
          remaining
        )}</span><span> left of ${formatMoney(monthlyBudget)} (${formatMoney(
          monthSpend
        )} spent).</span>`;

    if (over) {
      els.budgetAlert.classList.remove("hidden");
      els.budgetAlert.textContent = `Warning: monthly spending exceeds your budget by ${formatMoney(
        monthSpend - monthlyBudget
      )}.`;
    } else {
      els.budgetAlert.classList.add("hidden");
      els.budgetAlert.textContent = "";
    }
    updateBudgetUsageUI();
  }

  function updateAnnualBudgetUI() {
    const yearSpend = sumAmount(getCurrentYearExpenses());

    if (annualBudget === null) {
      els.annualBudgetStatus.className = "budget-status";
      els.annualBudgetStatus.innerHTML =
        "<strong>Annual budget</strong><span>Set a yearly cap to track spending for the current calendar year.</span>";
      els.annualBudgetAlert.classList.add("hidden");
      els.annualBudgetAlert.textContent = "";
      return;
    }

    const remaining = annualBudget - yearSpend;
    const over = yearSpend > annualBudget;

    els.annualBudgetStatus.className = over
      ? "budget-status budget-status--warn"
      : "budget-status budget-status--ok";
    els.annualBudgetStatus.innerHTML = over
      ? `<strong>Over annual budget</strong><span>You’ve spent <span class="budget-remaining">${formatMoney(
          yearSpend
        )}</span> of ${formatMoney(annualBudget)} this year (${formatMoney(
          Math.abs(remaining)
        )} over).</span>`
      : `<strong>Remaining this year</strong><span class="budget-remaining">${formatMoney(
          remaining
        )}</span><span> left of ${formatMoney(annualBudget)} (${formatMoney(
          yearSpend
        )} spent).</span>`;

    if (over) {
      els.annualBudgetAlert.classList.remove("hidden");
      els.annualBudgetAlert.textContent = `Warning: yearly spending exceeds your budget by ${formatMoney(
        yearSpend - annualBudget
      )}.`;
    } else {
      els.annualBudgetAlert.classList.add("hidden");
      els.annualBudgetAlert.textContent = "";
    }
  }

  function onBudgetSubmit(e) {
    e.preventDefault();
    const raw = els.budgetInput.value.trim();
    if (raw === "") {
      monthlyBudget = null;
      saveBudget(null);
      refreshUI();
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) {
      els.budgetInput.focus();
      return;
    }
    monthlyBudget = n;
    saveBudget(n);
    refreshUI();
  }

  function onAnnualBudgetSubmit(e) {
    e.preventDefault();
    const raw = els.annualBudgetInput.value.trim();
    if (raw === "") {
      annualBudget = null;
      saveAnnualBudget(null);
      updateAnnualBudgetUI();
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) {
      els.annualBudgetInput.focus();
      return;
    }
    annualBudget = n;
    saveAnnualBudget(n);
    updateAnnualBudgetUI();
  }

  /* —— List —— */

  function sortExpenseList(list) {
    return [...list].sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      if (d !== 0) return d;
      const ca = a.createdAt != null ? a.createdAt : 0;
      const cb = b.createdAt != null ? b.createdAt : 0;
      return cb - ca;
    });
  }

  function setEmptyMessage(filteredEmpty) {
    if (!filteredEmpty) return;
    if (expenses.length === 0) {
      els.emptyState.textContent = "No expenses yet. Add one using the form.";
      return;
    }
    els.emptyState.textContent = "No expenses match your filters.";
  }

  function renderExpenseList() {
    const filtered = sortExpenseList(getFilteredExpenses());

    els.expenseList.innerHTML = "";
    const showEmpty = filtered.length === 0;
    setEmptyMessage(showEmpty);
    els.emptyState.classList.toggle("hidden", !showEmpty);
    els.expenseList.classList.toggle("hidden", showEmpty);

    filtered.forEach((exp) => {
      const cat = categoryMap[exp.category] || CATEGORIES[CATEGORIES.length - 1];
      const li = document.createElement("li");
      li.className = "expense-card";
      if (noteLooksImportant(exp.note)) li.classList.add("expense-card--important");
      li.dataset.id = exp.id;

      const icon = document.createElement("div");
      icon.className = "expense-card__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = cat.icon;

      const body = document.createElement("div");
      body.className = "expense-card__body";

      const amountEl = document.createElement("div");
      amountEl.className = "expense-card__amount";
      amountEl.textContent = formatMoney(exp.amount);

      const meta = document.createElement("div");
      meta.className = "expense-card__meta";
      const catSpan = document.createElement("span");
      catSpan.className = "expense-card__category";
      catSpan.textContent = cat.label;
      const dateSpan = document.createElement("span");
      dateSpan.textContent = exp.date;
      meta.append(catSpan, dateSpan);

      body.append(amountEl, meta);

      if (exp.note && exp.note.trim()) {
        const noteP = document.createElement("p");
        noteP.className = "expense-card__note";
        if (noteLooksImportant(exp.note)) {
          const tag = document.createElement("span");
          tag.className = "expense-card__tag";
          tag.textContent = "Important";
          noteP.appendChild(tag);
          noteP.appendChild(document.createTextNode(` ${exp.note.trim()}`));
        } else {
          noteP.textContent = exp.note.trim();
        }
        body.appendChild(noteP);
      }

      const actions = document.createElement("div");
      actions.className = "expense-card__actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn--small btn--edit";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => startEdit(exp.id));

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn--small btn--danger";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteExpense(exp.id));

      actions.append(editBtn, delBtn);
      li.append(icon, body, actions);
      els.expenseList.appendChild(li);

      if (lastEnteredExpenseId && exp.id === lastEnteredExpenseId) {
        const reduceMotion =
          typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) {
          lastEnteredExpenseId = null;
        } else {
          requestAnimationFrame(() => {
            li.classList.add("expense-card--enter");
            const onEnd = () => {
              li.classList.remove("expense-card--enter");
              lastEnteredExpenseId = null;
              li.removeEventListener("animationend", onEnd);
            };
            li.addEventListener("animationend", onEnd);
          });
        }
      }
    });
  }

  function refreshUI() {
    updateSummaries();
    updateSpendingMoodCard();
    updateSavingsInsightCard();
    updateNoSpendCard();
    updateRecentActivityFeed();
    updateInsights();
    updateChart();
    updateMonthlyBudgetUI();
    updateAnnualBudgetUI();
    renderExpenseList();
    updateRecurringBanner();
  }

  function deleteExpense(id) {
    if (els.editId.value === id) cancelEditMode();

    const reduceMotion =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const li = els.expenseList && els.expenseList.querySelector(`li[data-id="${id}"]`);

    if (li && !reduceMotion && !li.classList.contains("expense-card--leaving")) {
      li.classList.add("expense-card--leaving");
      li.addEventListener(
        "animationend",
        () => {
          expenses = expenses.filter((e) => e.id !== id);
          saveExpenses();
          refreshUI();
        },
        { once: true }
      );
      return;
    }

    expenses = expenses.filter((e) => e.id !== id);
    saveExpenses();
    refreshUI();
  }

  function startEdit(id) {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;

    els.editId.value = id;
    els.amount.value = exp.amount;
    els.category.value = exp.category;
    els.date.value = exp.date;
    els.note.value = exp.note || "";
    els.submitBtn.textContent = "Update expense";
    els.cancelEdit.classList.remove("hidden");
    els.form.scrollIntoView({ behavior: "smooth", block: "nearest" });
    els.amount.focus();
  }

  function cancelEditMode() {
    els.editId.value = "";
    els.form.reset();
    els.date.value = todayISO();
    els.submitBtn.textContent = "Add expense";
    els.cancelEdit.classList.add("hidden");
  }

  function onSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(els.amount.value);
    if (!Number.isFinite(amount) || amount < 0) {
      els.amount.focus();
      return;
    }

    const category = els.category.value;
    const date = els.date.value;
    const note = els.note.value.trim();
    const editId = els.editId.value;

    if (editId) {
      const idx = expenses.findIndex((x) => x.id === editId);
      if (idx !== -1) {
        expenses[idx] = {
          ...expenses[idx],
          amount,
          category,
          date,
          note,
        };
      }
    } else {
      const newId = crypto.randomUUID();
      lastEnteredExpenseId = newId;
      expenses.push({
        id: newId,
        amount,
        category,
        date,
        note,
        createdAt: Date.now(),
      });
    }

    saveExpenses();
    cancelEditMode();
    refreshUI();
  }

  /* —— Theme —— */

  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    applyChartTheme();
  }

  /* —— Init —— */

  function init() {
    populateCategorySelects();
    expenses = loadExpenses();
    recurringState = loadRecurringState();
    monthlyBudget = loadBudget();
    annualBudget = loadAnnualBudget();
    if (monthlyBudget !== null) els.budgetInput.value = String(monthlyBudget);
    if (annualBudget !== null) els.annualBudgetInput.value = String(annualBudget);
    els.date.value = todayISO();
    initTheme();

    els.form.addEventListener("submit", onSubmit);
    els.cancelEdit.addEventListener("click", cancelEditMode);
    els.filterCategory.addEventListener("change", refreshUI);
    bindSearchInput();
    els.dateFrom.addEventListener("change", refreshUI);
    els.dateTo.addEventListener("change", refreshUI);
    els.clearFilters.addEventListener("click", clearAllFilters);
    els.themeToggle.addEventListener("click", toggleTheme);
    els.budgetForm.addEventListener("submit", onBudgetSubmit);
    els.annualBudgetForm.addEventListener("submit", onAnnualBudgetSubmit);

    updateHeaderUser();
    if (els.logoutBtn) {
      els.logoutBtn.addEventListener("click", () => Auth.logout());
    }

    if (els.exportCsvBtn) {
      els.exportCsvBtn.addEventListener("click", exportExpensesCsv);
    }
    if (els.markRecurringBtn) {
      els.markRecurringBtn.addEventListener("click", onMarkRecurring);
    }
    if (els.dismissRecurringBtn) {
      els.dismissRecurringBtn.addEventListener("click", onDismissRecurring);
    }
    initVoiceInput();

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!localStorage.getItem(THEME_KEY)) {
        initTheme();
        applyChartTheme();
      }
    });

    initFooterTagline();

    refreshUI();
    setupWelcomeFlow();
  }

  function initFooterTagline() {
    const el = document.querySelector(".site-footer__tagline-box");
    if (!el) return;
    const run = () => el.classList.add("is-inview");
    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run();
            io.disconnect();
          }
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.15 }
    );
    io.observe(el);
  }

  initCoinLayer();
  init();
})();
