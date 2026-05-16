(function () {
  "use strict";

  const A = window.ExpenseAuth;
  if (!A) return;

  if (A.getSession()) {
    window.location.replace("index.html");
    return;
  }

  const els = {
    tabLogin: document.getElementById("tabLogin"),
    tabSignup: document.getElementById("tabSignup"),
    panelLogin: document.getElementById("panelLogin"),
    panelSignup: document.getElementById("panelSignup"),
    loginForm: document.getElementById("loginForm"),
    signupForm: document.getElementById("signupForm"),
    authError: document.getElementById("authError"),
    loginSubmit: document.getElementById("loginSubmit"),
    signupSubmit: document.getElementById("signupSubmit"),
    linkForgot: document.getElementById("linkForgot"),
    linkToSignup: document.getElementById("linkToSignup"),
    linkToLogin: document.getElementById("linkToLogin"),
  };

  function showError(msg) {
    if (!msg) {
      els.authError.classList.add("Hidden");
      els.authError.textContent = "";
      return;
    }
    els.authError.textContent = msg;
    els.authError.classList.remove("hidden");
  }

  function setTab(which) {
    const login = which === "login";
    els.tabLogin.classList.toggle("login-tab--active", login);
    els.tabLogin.setAttribute("aria-selected", login ? "true" : "false");
    els.tabSignup.classList.toggle("login-tab--active", !login);
    els.tabSignup.setAttribute("aria-selected", login ? "false" : "true");
    els.panelLogin.classList.toggle("hidden", !login);
    els.panelLogin.hidden = !login;
    els.panelSignup.classList.toggle("hidden", login);
    els.panelSignup.hidden = login;
    showError("");
  }

  els.tabLogin.addEventListener("click", () => setTab("login"));
  els.tabSignup.addEventListener("click", () => setTab("signup"));

  if (els.linkToSignup) {
    els.linkToSignup.addEventListener("click", (e) => {
      e.preventDefault();
      setTab("signup");
    });
  }

  if (els.linkToLogin) {
    els.linkToLogin.addEventListener("click", (e) => {
      e.preventDefault();
      setTab("login");
    });
  }

  if (els.linkForgot) {
    els.linkForgot.addEventListener("click", (e) => {
      e.preventDefault();
      showError(
        "Password reset isn’t available in this local app. Your account exists only in this browser’s storage."
      );
    });
  }

  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    els.loginSubmit.disabled = true;
    const result = await A.signIn(email, password);
    els.loginSubmit.disabled = false;
    if (result.ok) {
      window.location.href = "index.html";
    } else {
      showError(result.error);
    }
  });

  els.signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }
    els.signupSubmit.disabled = true;
    const result = await A.signUp(email, password);
    els.signupSubmit.disabled = false;
    if (result.ok) {
      window.location.href = "index.html";
    } else {
      showError(result.error);
    }
  });
})();
