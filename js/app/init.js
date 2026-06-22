window.App = window.App || {};
(function() {
  "use strict";

  function renderSidePlaylists() {
    const list = document.getElementById("side-playlist-list");
    if (!list) return;
    API.getPlaylists({ type: "user" }).then(res => {
      const pls = res.data || PLAYLISTS.filter(p => p.type === "user");
      list.innerHTML = pls.map(p => `
        <button class="side-item" data-goto="playlist-detail" data-payload="${p.id}">
          <span>${p.title}</span>
        </button>`).join("");
    }).catch(() => {
      const pls = PLAYLISTS.filter(p => p.type === "user");
      list.innerHTML = pls.map(p => `
        <button class="side-item" data-goto="playlist-detail" data-payload="${p.id}">
          <span>${p.title}</span>
        </button>`).join("");
    });
  }

  function init() {
    const btnSubmit = document.getElementById("btn-login-submit");
    const btnGuest = document.getElementById("btn-login-guest");
    if (btnSubmit) btnSubmit.addEventListener("click", () => window.App.login());
    if (btnGuest) btnGuest.addEventListener("click", () => window.App.login({ username: "guest", password: "" }));

    document.querySelectorAll(".login-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".login-tab").forEach(t => t.classList.remove("is-active"));
        tab.classList.add("is-active");
      });
    });

    const at = document.getElementById("avatar-trigger");
    if (at) at.addEventListener("click", (e) => {
      e.stopPropagation();
      at.classList.toggle("is-open");
    });
    document.addEventListener("click", () => at && at.classList.remove("is-open"));

    document.addEventListener("click", (e) => {
      const item = e.target.closest("[data-goto]");
      if (!item) return;
      const route = item.dataset.goto;
      const payload = item.dataset.payload || undefined;
      // 从移动端底部 tab 或侧边栏导航时，清空历史栈
      if (item.classList.contains("m-nav-item") || item.classList.contains("side-item")) {
        window.App.setHistoryStack([route]);
      }
      window.App.navigate(route, payload);
    });

    const lo = document.getElementById("btn-logout");
    if (lo) lo.addEventListener("click", (e) => { e.stopPropagation(); window.App.logout(); });

    const ta = document.getElementById("btn-toggle-admin");
    if (ta) ta.addEventListener("click", () => window.App.navigate("admin"));

    const btnNewPl = document.getElementById("btn-new-playlist");
    if (btnNewPl) btnNewPl.addEventListener("click", () => {
      const name = prompt("请输入歌单名称：", "我的新歌单");
      if (!name || !name.trim()) return;
      const desc = prompt("请输入歌单描述（可选）：", "");
      API.createPlaylist({ title: name.trim(), desc: desc || "新歌单", type: "user" }).then(() => {
        renderSidePlaylists();
      }).catch(() => {
        renderSidePlaylists();
      });
    });

    renderSidePlaylists();

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const inp = document.getElementById("global-search-input");
        if (inp) inp.focus();
      }
    });

    if (window.Player) window.Player.init();
  }

  // Export
  window.App.init = init;
  window.App.renderSidePlaylists = renderSidePlaylists;
})();

document.addEventListener("DOMContentLoaded", window.App.init);