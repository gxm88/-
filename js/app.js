/* ============================================================
   app.js · 应用主逻辑
   - 登录鉴权 (三档：普通用户 / 管理员 / 访客)
   - 路由 (hash 路由) · 所有页面共用 page-body
   - 权限分流 (管理员可见的管理后台入口)
   - 事件委托：所有播放、点击导航、弹窗等
   - Banner 自动轮播
   - 搜索快捷键 / 全局搜索跳转
   ============================================================ */

const App = (() => {
  const $ = (id) => document.getElementById(id);
  const state = {
    logged: false,
    role: "guest", // user | admin | guest
    userName: "",
    current: "home",
    bannerIdx: 0,
    bannerTimer: null,
  };

  // ---- 路由 ----
  const ROUTES = {
    home: () => Pages.home(),
    discover: () => Pages.discover(),
    charts: () => Pages.charts(),
    ai: () => Pages.aiCenter(),
    "playlist-ai": () => Pages.aiCenter(),
    library: () => Pages.library(),
    artists: () => Pages.artists(),
    albums: () => Pages.albums(),
    folders: () => Pages.folders(),
    profile: () => Pages.profile(),
    favorites: () => Pages.profile(),
    history: () => Pages.profile(),
    search: (q) => Pages.searchResults(q),
    "playlist-detail": (id) => Pages.playlistDetail(id),
    admin: () => Pages.admin(),
  };

  function setActive(sel) {
    document.querySelectorAll(sel).forEach(el => el.classList.remove("is-active"));
  }

  function navigate(route, payload) {
    state.current = route;
    const container = $("page-body");
    if (!container) return;

    // 路由解析
    if (route === "admin") {
      // 管理员保护
      if (state.role !== "admin") {
        container.innerHTML = `
          <section class="page-section">
            <div class="page-intro-hero">
              <h2>无权访问</h2>
              <p>管理后台需要管理员权限。请以管理员身份重新登录。</p>
            </div>
            <button class="ai-card-cta" onclick="App.logout()">以管理员重新登录</button>
          </section>`;
        return;
      }
    }

    // 页面渲染
    const renderer = ROUTES[route] || ROUTES.home;
    container.innerHTML = renderer(payload);

    // 导航激活（侧栏）
    document.querySelectorAll(".side-item").forEach(el => el.classList.remove("is-active"));
    const navBtn = document.querySelector(`.side-item[data-goto="${route}"]`);
    if (navBtn) navBtn.classList.add("is-active");

    // 移动端底部三 Tab 激活映射：
    //   发现 Tab ← discover / charts / search
    //   歌曲 Tab ← library / artists / albums / folders / playlist-detail
    //   我的 Tab ← profile / favorites / history / ai / playlist-ai
    document.querySelectorAll(".m-nav-item").forEach(el => el.classList.remove("is-active"));
    const DISCOVER_ROUTES = ["discover", "charts", "search"];
    const LIB_ROUTES = ["library", "artists", "albums", "folders", "playlist-detail"];
    const MINE_ROUTES = ["profile", "favorites", "history", "ai", "playlist-ai", "admin"];
    let mobileTab = "discover"; // 默认
    if (route === "home") mobileTab = "discover"; // 首页归属发现 Tab
    else if (DISCOVER_ROUTES.includes(route)) mobileTab = "discover";
    else if (LIB_ROUTES.includes(route)) mobileTab = "library";
    else if (MINE_ROUTES.includes(route)) mobileTab = "profile";
    const mBtn = document.querySelector(`.m-nav-item[data-goto="${mobileTab}"]`);
    if (mBtn) mBtn.classList.add("is-active");

    // 子页面：个人中心 tabs
    if (route === "profile" || route === "favorites" || route === "history") {
      const body = $("coltab-body");
      const defaultTab = route === "favorites" ? "songs" : (route === "history" ? "history" : "songs");
      if (body) body.innerHTML = Pages.profileColtab(defaultTab);

      document.querySelectorAll(".col-tab").forEach(t => {
        t.addEventListener("click", () => {
          setActive(".col-tab");
          t.classList.add("is-active");
          body.innerHTML = Pages.profileColtab(t.dataset.coltab);
          bindCards(body);
        });
      });
    }

    // 子页面：管理员
    if (route === "admin") {
      const body = $("admin-body");
      if (body) body.innerHTML = Pages.admDashboard();
      document.querySelectorAll(".admin-side-item").forEach(it => {
        it.addEventListener("click", () => {
          setActive(".admin-side-item");
          it.classList.add("is-active");
          const key = it.dataset.adm;
          const map = {
            dashboard: Pages.admDashboard,
            "library-mgmt": Pages.admLibraryMgmt,
            metadata: Pages.admMetadata,
            ops: Pages.admOps,
            users: Pages.admUsers,
            "pl-edit": Pages.admPlaylistEdit,
            "ai-config": Pages.admAIConfig,
            network: Pages.admNetwork,
            backup: Pages.admBackup,
          };
          body.innerHTML = (map[key] || Pages.admDashboard)();
          // 绑定 switch 点击
          body.querySelectorAll(".switch").forEach(sw => {
            sw.addEventListener("click", () => sw.classList.toggle("is-on"));
          });
        });
      });
      $("page-body").querySelectorAll(".switch").forEach(sw => {
        sw.addEventListener("click", () => sw.classList.toggle("is-on"));
      });
    }

    // Banner 自动切换
    bindBanner();

    // 过滤 pill
    document.querySelectorAll(".filter-bar .filter-pill").forEach(p => {
      p.addEventListener("click", () => {
        const siblings = p.parentElement.querySelectorAll(".filter-pill");
        siblings.forEach(s => s.classList.remove("is-active"));
        p.classList.add("is-active");
      });
    });

    // 歌单/专辑/歌手卡片点击 → 歌单详情或直接播放
    bindCards(container);

    // 播放队列 panel
    bindQueuePanel(container);

    // 搜索
    bindGlobalSearch();

    // 个人中心 tab 激活
    if (route === "favorites") {
      document.querySelectorAll(".col-tab").forEach(t => {
        t.classList.toggle("is-active", t.dataset.coltab === "songs");
      });
    }
    if (route === "history") {
      document.querySelectorAll(".col-tab").forEach(t => {
        t.classList.toggle("is-active", t.dataset.coltab === "history");
      });
    }

    // 滚动到顶部
    container.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function bindCards(root) {
    // 媒体块 → 打开歌单详情
    root.querySelectorAll(".media-block[data-playlist]").forEach(c => {
      c.addEventListener("click", () => {
        const id = c.dataset.playlist;
        if (id) navigate("playlist-detail", id);
      });
    });
    // 媒体块 (专辑) → 立即播放
    root.querySelectorAll(".media-block[data-album]").forEach(c => {
      c.addEventListener("click", () => {
        const tracks = pickN(TRACKS, 8, c.dataset.album.charCodeAt(2) % 5);
        Player.playAll(tracks);
      });
    });
    // 歌手圆环 → 立即播放
    root.querySelectorAll(".artist-chip[data-artist]").forEach(c => {
      c.addEventListener("click", () => {
        const tracks = pickN(TRACKS, 10, c.dataset.artist.charCodeAt(1) % 5);
        Player.playAll(tracks);
      });
    });
    // 文件夹 → 立即播放
    root.querySelectorAll(".folder-item[data-folder]").forEach(c => {
      c.addEventListener("click", () => {
        const tracks = pickN(TRACKS, 10, c.dataset.folder.charCodeAt(5) % 5);
        Player.playAll(tracks);
      });
    });
    // 榜单歌曲 → 播放（仅本地已收录的）
    root.querySelectorAll(".chart-song[data-track]").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.dataset.track;
        const t = TRACKS.find(x => x.id === id);
        if (t) Player.playAll([t]);
      });
    });
    // AI 策略区 → 生成歌单或跳转
    root.querySelectorAll(".ai-strategy-item[data-go-playlist]").forEach(el => {
      el.addEventListener("click", () => {
        const tracks = pickN(TRACKS, 10, el.dataset.goPlaylist.charCodeAt(1) % 5);
        Player.playAll(tracks);
      });
    });

    // track-row 单击 → 播放
    root.querySelectorAll(".track-row[data-track]").forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.track;
        const t = TRACKS.find(x => x.id === id);
        if (t) Player.playAll([t]);
      });
    });

    // 页面内 "立即播放" / "播放整张歌单"
    root.querySelectorAll("[data-go-playlist], [data-play-playlist]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = (btn.dataset.goPlaylist || btn.dataset.playPlaylist);
        const tracks = pickN(TRACKS, 10, id.charCodeAt(1) % 5);
        Player.playAll(tracks);
      });
    });

    // AI 生成歌单按钮
    const gen = root.querySelector("#btn-gen");
    if (gen) gen.addEventListener("click", () => {
      Player.playAll(pickN(TRACKS, 10, 2));
    });

    // 快捷入口 chip (部分有 data-goto 由全局委托处理，这里处理无 data-goto 的)
    root.querySelectorAll(".quick-chip:not([data-goto])").forEach(chip => {
      chip.addEventListener("click", () => Player.playAll(pickN(TRACKS, 8, 0)));
    });
  }

  function bindQueuePanel(root) {
    // 无额外逻辑，这里主要用于扩展
  }

  function bindBanner() {
    if (state.bannerTimer) { clearInterval(state.bannerTimer); state.bannerTimer = null; }
    const slides = document.querySelectorAll("#banner .banner-slide");
    const dots = document.querySelectorAll("#banner .banner-dot");
    if (slides.length === 0) return;
    function show(i) {
      slides.forEach((s, k) => s.classList.toggle("is-active", k === i));
      dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
      state.bannerIdx = i;
    }
    dots.forEach((d, i) => d.addEventListener("click", () => show(i)));
    state.bannerTimer = setInterval(() => show((state.bannerIdx + 1) % slides.length), 5500);
  }

  function bindGlobalSearch() {
    const input = $("global-search-input");
    if (!input) return;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        navigate("search", input.value);
      }
    });
  }

  // ---- 登录与权限 ----
  function login(role) {
    state.logged = true;
    state.role = role;
    state.userName = role === "admin" ? "admin" : "listener_01";

    // 更新顶栏
    const av = $("user-avatar");
    const nm = $("user-name");
    if (av) { av.textContent = state.userName.charAt(0).toUpperCase(); }
    if (nm) nm.textContent = state.userName + (role === "admin" ? " · 管理员" : "");

    // 菜单内用户名
    const mu = document.querySelector("#avatar-menu .menu-title");
    const ms = document.querySelector("#avatar-menu .menu-sub");
    if (mu) mu.textContent = state.userName;
    if (ms) ms.textContent = role === "admin" ? "Administrator" : "Listener";

    // 权限隐藏：管理员可见的元素
    document.querySelectorAll(".is-admin-only").forEach(el => {
      el.classList.toggle("is-hidden", role !== "admin");
    });
    const adminToggle = $("btn-toggle-admin");
    if (adminToggle) adminToggle.style.display = role === "admin" ? "inline-flex" : "none";

    // 显示主应用
    $("page-login").classList.remove("is-active");
    $("app-shell").classList.add("is-active");

    // 首次进入首页
    navigate(role === "admin" ? "home" : "home");
  }

  function logout() {
    state.logged = false; state.role = "guest";
    $("page-login").classList.add("is-active");
    $("app-shell").classList.remove("is-active");
  }

  // ---- 绑定 ----
  function init() {
    // 登录按钮
    const btnUser = $("btn-login-user");
    const btnAdmin = $("btn-login-admin");
    const btnGuest = $("btn-login-guest");
    if (btnUser) btnUser.addEventListener("click", () => login("user"));
    if (btnAdmin) btnAdmin.addEventListener("click", () => login("admin"));
    if (btnGuest) btnGuest.addEventListener("click", () => login("guest"));

    // 登录 Tabs（账号 / 验证码）
    document.querySelectorAll(".login-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".login-tab").forEach(t => t.classList.remove("is-active"));
        tab.classList.add("is-active");
      });
    });

    // 头像下拉
    const at = $("avatar-trigger");
    if (at) at.addEventListener("click", (e) => {
      e.stopPropagation();
      at.classList.toggle("is-open");
    });
    document.addEventListener("click", () => at && at.classList.remove("is-open"));

    // 菜单项点击导航
    document.addEventListener("click", (e) => {
      const item = e.target.closest("[data-goto]");
      if (!item) return;
      const route = item.dataset.goto;
      navigate(route);
    });

    // 退出登录
    const lo = $("btn-logout");
    if (lo) lo.addEventListener("click", (e) => { e.stopPropagation(); logout(); });

    // 管理员入口（顶栏图标）
    const ta = $("btn-toggle-admin");
    if (ta) ta.addEventListener("click", () => navigate("admin"));

    // 搜索快捷键
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const inp = $("global-search-input");
        if (inp) inp.focus();
      }
    });

    // 播放器（Player 自己会做绑定）
    if (window.Player) Player.init();

    // 默认：停在登录页，等待用户点击
  }

  return {
    init,
    login,
    logout,
    navigate,
    getState: () => state,
  };
})();

window.App = App;
document.addEventListener("DOMContentLoaded", App.init);
