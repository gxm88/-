window.App = window.App || {};
(function() {
  "use strict";

  const state = {
    logged: false,
    role: "guest", // user | admin | guest
    userName: "",
    user: null,
    current: "home",
    bannerIdx: 0,
    bannerTimer: null,
  };

  // ---- 登录与权限 ----
  async function login() {
    try {
      const res = await API.login({ username: 'admin', password: 'admin123' });
      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        state.logged = true;
        state.user = res.user;
        updateUserMenu();
        window.App.showToast('登录成功', 'success');
        window.App.navigate('home');
      }
    } catch (e) {
      state.logged = false;
      window.App.showToast('登录失败，使用离线模式', 'warn');
      // Fallback to mock login
      state.logged = true;
      state.user = { id: 1, username: 'admin', role: 'admin', avatar: 'A' };
      localStorage.setItem('user', JSON.stringify(state.user));
      updateUserMenu();
      window.App.navigate('home');
    }
  }

  function updateUserMenu() {
    const user = state.user;
    if (!user) return;
    state.role = user.role;
    state.userName = user.username;

    const av = document.getElementById("user-avatar");
    const nm = document.getElementById("user-name");
    if (av) { av.textContent = user.username.charAt(0).toUpperCase(); }
    if (nm) nm.textContent = user.username + (user.role === "admin" ? " · 管理员" : "");

    const mu = document.querySelector("#avatar-menu .menu-title");
    const ms = document.querySelector("#avatar-menu .menu-sub");
    if (mu) mu.textContent = user.username;
    if (ms) ms.textContent = user.role === "admin" ? "Administrator" : "Listener";

    document.querySelectorAll(".is-admin-only").forEach(el => {
      el.classList.toggle("is-hidden", user.role !== "admin");
    });
    const adminToggle = document.getElementById("btn-toggle-admin");
    if (adminToggle) adminToggle.style.display = user.role === "admin" ? "inline-flex" : "none";

    document.getElementById("page-login").classList.remove("is-active");
    document.getElementById("app-shell").classList.add("is-active");
  }

  function logout() {
    API.logout().catch(() => {});
    state.logged = false; state.role = "guest";
    document.getElementById("page-login").classList.add("is-active");
    document.getElementById("app-shell").classList.remove("is-active");
  }

  // Export
  window.App.state = state;
  window.App.login = login;
  window.App.logout = logout;
  window.App.updateUserMenu = updateUserMenu;
})();