window.App = window.App || {};
(function() {
  "use strict";

  const SKELETON_MAP = {
    home: "cards",
    discover: "cards",
    charts: "tracks",
    ai: "cards",
    "ai-daily": "tracks",
    "ai-nlp": "tracks",
    "playlist-ai": "cards",
    library: "tracks",
    artists: "cards",
    albums: "cards",
    folders: "cards",
    profile: "profile",
    favorites: "profile",
    history: "profile",
    search: "tracks",
    "playlist-detail": "detail",
    "album-detail": "detail",
    admin: "cards",
  };

  // ---- 路由 ----
  const ROUTES = {
    home: () => window.Pages.home(),
    discover: () => window.Pages.discover(),
    charts: () => window.Pages.charts(),
    ai: () => window.Pages.aiCenter(),
    "ai-daily": () => window.Pages.aiDaily(),
    "ai-nlp": () => window.Pages.aiNLP(),
    "playlist-ai": () => window.Pages.aiPlaylists(),
    library: () => window.Pages.library(),
    artists: () => window.Pages.artists(),
    albums: () => window.Pages.albums(),
    folders: () => window.Pages.folders(),
    profile: () => window.Pages.profile(),
    favorites: () => window.Pages.profile(),
    history: () => window.Pages.profile(),
    search: (q) => window.Pages.searchResults(q),
    "playlist-detail": (id) => window.Pages.playlistDetail(id),
    "album-detail": (id) => window.Pages.albumDetail(id),
    admin: () => window.Pages.admin(),
  };

  let historyStack = [];

  function setActive(sel) {
    document.querySelectorAll(sel).forEach(el => el.classList.remove("is-active"));
  }

  function navigate(route, payload, skipHistory) {
    const state = window.App.state;
    state.current = route;
    const container = document.getElementById("page-body");
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

    // 记录历史（不重复推送连续相同路由）
    if (!skipHistory) {
      if (historyStack.length === 0 || historyStack[historyStack.length - 1] !== route) {
        historyStack.push(route);
      }
    }

    // 显示/隐藏移动端返回按钮
    const backBtn = document.getElementById('mobile-back-btn');
    if (backBtn) {
      if (route === 'home') {
        backBtn.classList.remove('is-visible');
        backBtn.style.display = 'none';
      } else {
        backBtn.classList.add('is-visible');
        backBtn.style.display = 'inline-flex';
      }
    }

    // 导航激活（侧栏）—— 立即执行
    document.querySelectorAll(".side-item").forEach(el => el.classList.remove("is-active"));
    const navBtn = document.querySelector(`.side-item[data-goto="${route}"]`);
    if (navBtn) navBtn.classList.add("is-active");

    // 移动端底部三 Tab 激活映射 —— 立即执行
    document.querySelectorAll(".m-nav-item").forEach(el => el.classList.remove("is-active"));
    const DISCOVER_ROUTES = ["discover", "charts", "search"];
    const LIB_ROUTES = ["library", "artists", "albums", "folders", "playlist-detail", "album-detail"];
    const MINE_ROUTES = ["profile", "favorites", "history", "ai", "playlist-ai", "ai-daily", "ai-nlp", "admin"];
    let mobileTab = "discover";
    if (route === "home") mobileTab = "discover";
    else if (DISCOVER_ROUTES.includes(route)) mobileTab = "discover";
    else if (LIB_ROUTES.includes(route)) mobileTab = "library";
    else if (MINE_ROUTES.includes(route)) mobileTab = "profile";
    const mBtn = document.querySelector(`.m-nav-item[data-goto="${mobileTab}"]`);
    if (mBtn) mBtn.classList.add("is-active");

    // 个人中心 tab 激活 —— 立即执行
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

    // 显示骨架屏
    const skeletonType = SKELETON_MAP[route] || "tracks";
    container.innerHTML = window.Pages.renderSkeleton(skeletonType);

    // 异步渲染页面
    const renderer = ROUTES[route] || ROUTES.home;
    renderer(payload).then(html => {
      container.innerHTML = html;
      afterRender(container, route);
    }).catch(err => {
      console.error("[App] 页面渲染失败:", err);
      container.innerHTML = `
        <div class="page-intro-hero" style="text-align:center">
          <h2>加载失败</h2>
          <p>数据加载出错，请稍后再试</p>
          <button class="ai-card-cta" style="margin-top:16px" onclick="App.navigate('${route}')">重试</button>
        </div>`;
    });
  }

  function goBack() {
    if (historyStack.length <= 1) {
      navigate('home');
      return;
    }
    historyStack.pop(); // 移除当前页面
    const prev = historyStack.pop(); // 获取上一个页面
    navigate(prev, null, true); // true = 不添加到历史
  }

  /** 所有需要在异步渲染完成后执行的绑定逻辑 */
  function afterRender(container, route) {
    // 子页面：个人中心 tabs
    if (route === "profile" || route === "favorites" || route === "history") {
      const body = document.getElementById("coltab-body");
      const defaultTab = route === "favorites" ? "songs" : (route === "history" ? "history" : "songs");
      if (body) {
        window.Pages.profileColtab(defaultTab).then(html => {
          body.innerHTML = html;
          window.App.bindCards(body);
          window.App.bindViewToggle(body);
        });
      }

      document.querySelectorAll(".col-tab").forEach(t => {
        t.addEventListener("click", () => {
          setActive(".col-tab");
          t.classList.add("is-active");
          window.Pages.profileColtab(t.dataset.coltab).then(html => {
            body.innerHTML = html;
            window.App.bindCards(body);
            window.App.bindViewToggle(body);
          });
        });
      });
    }

    // 子页面：管理员
    if (route === "admin") {
      const body = document.getElementById("admin-body");
      if (body) {
        window.Pages.admDashboard().then(html => {
          body.innerHTML = html;
          body.querySelectorAll(".switch").forEach(sw => {
            sw.addEventListener("click", () => sw.classList.toggle("is-on"));
          });
        });
      }
      bindAdminSideItems();
      // 初始 switch 绑定
      container.querySelectorAll(".switch").forEach(sw => {
        sw.addEventListener("click", () => sw.classList.toggle("is-on"));
      });
    }

    // Banner 自动切换
    window.App.bindBanner();

    // 过滤 pill
    document.querySelectorAll(".filter-bar .filter-pill").forEach(p => {
      p.addEventListener("click", () => {
        const siblings = p.parentElement.querySelectorAll(".filter-pill");
        siblings.forEach(s => s.classList.remove("is-active"));
        p.classList.add("is-active");
      });
    });

    // 歌单/专辑/歌手卡片点击
    window.App.bindCards(container);
    // 视图切换（列表 ↔ 图标）
    window.App.bindViewToggle(container);

    // 播放队列 panel
    window.App.bindQueuePanel(container);

    // 搜索
    window.App.bindGlobalSearch();

    // 滚动到顶部
    container.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  /** 绑定管理员侧边栏切换 */
  function bindAdminSideItems() {
    document.querySelectorAll(".admin-side-item").forEach(it => {
      if (it.dataset.boundAdmin === "1") return;
      it.dataset.boundAdmin = "1";
      it.addEventListener("click", () => {
        setActive(".admin-side-item");
        it.classList.add("is-active");
        const key = it.dataset.adm;
        const body = document.getElementById("admin-body");
        if (!body) return;
        const map = {
          dashboard: window.Pages.admDashboard,
          "library-mgmt": window.Pages.admLibraryMgmt,
          metadata: window.Pages.admMetadata,
          ops: window.Pages.admOps,
          users: window.Pages.admUsers,
          "pl-edit": window.Pages.admPlaylistEdit,
          "ai-config": window.Pages.admAIConfig,
          network: window.Pages.admNetwork,
          backup: window.Pages.admBackup,
        };
        (map[key] || window.Pages.admDashboard)().then(html => {
          body.innerHTML = html;
          body.querySelectorAll(".switch").forEach(sw => {
            sw.addEventListener("click", () => sw.classList.toggle("is-on"));
          });
        });
      });
    });
  }

  // Export
  window.App.SKELETON_MAP = SKELETON_MAP;
  window.App.navigate = navigate;
  window.App.goBack = goBack;
  window.App.afterRender = afterRender;
  window.App.bindAdminSideItems = bindAdminSideItems;
  window.App.getHistoryStack = () => historyStack;
  window.App.setHistoryStack = (s) => { historyStack = s; };
})();