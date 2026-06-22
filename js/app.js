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

  // ---- 骨屏类型映射 ----
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
    home: () => Pages.home(),
    discover: () => Pages.discover(),
    charts: () => Pages.charts(),
    ai: () => Pages.aiCenter(),
    "ai-daily": () => Pages.aiDaily(),
    "ai-nlp": () => Pages.aiNLP(),
    "playlist-ai": () => Pages.aiPlaylists(),
    library: () => Pages.library(),
    artists: () => Pages.artists(),
    albums: () => Pages.albums(),
    folders: () => Pages.folders(),
    profile: () => Pages.profile(),
    favorites: () => Pages.profile(),
    history: () => Pages.profile(),
    search: (q) => Pages.searchResults(q),
    "playlist-detail": (id) => Pages.playlistDetail(id),
    "album-detail": (id) => Pages.albumDetail(id),
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
    container.innerHTML = Pages.renderSkeleton(skeletonType);

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

  /** 所有需要在异步渲染完成后执行的绑定逻辑 */
  function afterRender(container, route) {
    // 子页面：个人中心 tabs
    if (route === "profile" || route === "favorites" || route === "history") {
      const body = $("coltab-body");
      const defaultTab = route === "favorites" ? "songs" : (route === "history" ? "history" : "songs");
      if (body) {
        Pages.profileColtab(defaultTab).then(html => {
          body.innerHTML = html;
          bindCards(body);
          bindViewToggle(body);
        });
      }

      document.querySelectorAll(".col-tab").forEach(t => {
        t.addEventListener("click", () => {
          setActive(".col-tab");
          t.classList.add("is-active");
          Pages.profileColtab(t.dataset.coltab).then(html => {
            body.innerHTML = html;
            bindCards(body);
            bindViewToggle(body);
          });
        });
      });
    }

    // 子页面：管理员
    if (route === "admin") {
      const body = $("admin-body");
      if (body) {
        Pages.admDashboard().then(html => {
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
    bindBanner();

    // 过滤 pill
    document.querySelectorAll(".filter-bar .filter-pill").forEach(p => {
      p.addEventListener("click", () => {
        const siblings = p.parentElement.querySelectorAll(".filter-pill");
        siblings.forEach(s => s.classList.remove("is-active"));
        p.classList.add("is-active");
      });
    });

    // 歌单/专辑/歌手卡片点击
    bindCards(container);
    // 视图切换（列表 ↔ 图标）
    bindViewToggle(container);

    // 播放队列 panel
    bindQueuePanel(container);

    // 搜索
    bindGlobalSearch();

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
        const body = $("admin-body");
        if (!body) return;
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
        (map[key] || Pages.admDashboard)().then(html => {
          body.innerHTML = html;
          body.querySelectorAll(".switch").forEach(sw => {
            sw.addEventListener("click", () => sw.classList.toggle("is-on"));
          });
        });
      });
    });
  }

  function bindCards(root) {
    // 媒体块 → 打开歌单详情
    root.querySelectorAll(".media-block[data-playlist]").forEach(c => {
      c.addEventListener("click", () => {
        const id = c.dataset.playlist;
        if (id) navigate("playlist-detail", id);
      });
    });
    // 媒体块 (专辑) → 专辑详情
    root.querySelectorAll(".media-block[data-album]").forEach(c => {
      c.addEventListener("click", () => {
        const id = c.dataset.album;
        if (id) navigate("album-detail", id);
      });
    });
    // 歌手圆环 → 通过 API 获取歌手歌曲并播放
    root.querySelectorAll(".artist-chip[data-artist]").forEach(c => {
      c.addEventListener("click", () => {
        const artistId = c.dataset.artist;
        API.getArtist(artistId).then(res => Player.playAll(res.tracks));
      });
    });
    // 文件夹 → 通过 API 获取文件夹歌曲并播放
    root.querySelectorAll(".folder-item[data-folder]").forEach(c => {
      c.addEventListener("click", () => {
        const folderPath = c.dataset.folder;
        API.getFolder(folderPath).then(res => Player.playAll(res.data));
      });
    });
    // 榜单歌曲 → 播放（仅本地已收录的）
    root.querySelectorAll(".chart-song[data-track]").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.dataset.track;
        API.getTrack(id).then(res => {
          if (res.data) Player.playAll([res.data]);
        });
      });
    });
    // track-row 单击 → 通过 API 获取歌曲并播放
    root.querySelectorAll(".track-row[data-track]").forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.track;
        API.getTrack(id).then(res => {
          if (res.data) Player.playAll([res.data]);
        });
      });
    });

    // 页面内 "立即播放" / "播放整张歌单"
    root.querySelectorAll("[data-go-playlist], [data-play-playlist]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = (btn.dataset.goPlaylist || btn.dataset.playPlaylist);
        API.getPlaylist(id).then(res => Player.playAll(res.data.tracks));
      });
    });

    // AI 每日推荐刷新
    const refreshDaily = root.querySelector("#btn-refresh-daily");
    if (refreshDaily) refreshDaily.addEventListener("click", () => {
      API.getDailyRecommend().then(res => Player.playAll(res.data));
    });

    // NLP 生成歌单页面
    const nlpGen = root.querySelector("#nlp-gen-btn");
    const nlpInput = root.querySelector("#nlp-input");
    if (nlpGen && nlpInput) {
      const doGenerate = (prompt) => {
        const area = document.querySelector("#nlp-result-area");
        if (!area) return;
        API.generateNLP(prompt).then(res => {
          const tracks = res.data;
          area.innerHTML = `
            <section class="page-section anim-fade-up">
              <div class="section-head">
                <h3 class="section-title">生成结果 · "${prompt || "自定义"}"</h3>
                <div style="display:flex;gap:6px">
                  <button class="ai-card-cta" style="margin-top:0;padding:7px 16px;font-size:12px" id="nlp-play-all">▶ 播放全部</button>
                  ${Pages.viewToggleBtn("#nlp-tracks")}
                </div>
              </div>
              <div class="track-list" id="nlp-tracks">
                ${tracks.map((t, i) => Pages.rowFor(t, i)).join("")}
              </div>
            </section>
            <section class="page-section anim-fade-up stagger-1">
              <div class="ai-card" style="padding:22px 28px">
                <div class="ai-card-title" style="font-size:16px;margin-top:0">AI 分析</div>
                <p class="ai-card-sub" style="margin-top:6px">已从本地曲库中匹配 ${tracks.length} 首，覆盖 ${[...new Set(tracks.map(t => t.genre))].length} 种风格。调性：${prompt.includes("慢") || prompt.includes("安静") || prompt.includes("治愈") ? "柔和 · 舒缓" : prompt.includes("高能量") || prompt.includes("跑步") ? "激昂 · 节奏感强" : prompt.includes("复古") ? "复古 · 合成器质感" : "多元 · 均衡"}</p>
                <div class="ai-card-tags" style="margin-top:12px">
                  ${[...new Set(tracks.map(t => t.genre))].map(g => `<span class="ai-card-tag">${g}</span>`).join("")}
                  <span class="ai-card-tag">本地匹配</span>
                </div>
              </div>
            </section>
          `;
          // 绑定新生成的播放和视图切换
          const playBtn = area.querySelector("#nlp-play-all");
          if (playBtn) playBtn.addEventListener("click", () => Player.playAll(tracks));
          bindViewToggle(area);
        });
      };
      nlpGen.addEventListener("click", () => {
        const val = nlpInput.value.trim();
        if (val) doGenerate(val);
      });
      nlpInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const val = nlpInput.value.trim();
          if (val) doGenerate(val);
        }
      });
      // 推荐 prompt 点击
      root.querySelectorAll(".nlp-prompt-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          nlpInput.value = pill.dataset.prompt;
          doGenerate(pill.dataset.prompt);
        });
      });
    }

    // 快捷入口 chip (部分有 data-goto 由全局委托处理，这里处理无 data-goto 的)
    root.querySelectorAll(".quick-chip:not([data-goto])").forEach(chip => {
      chip.addEventListener("click", () => {
        API.getTracks().then(res => Player.playAll(res.data.slice(0, 8)));
      });
    });
  }

  /* 视图切换：列表 ↔ 图标网格 */
  function bindViewToggle(root) {
    root.querySelectorAll(".view-toggle").forEach(toggle => {
      // 如果已绑定过，跳过
      if (toggle.dataset.bound === "1") return;
      toggle.dataset.bound = "1";

      const targetSelector = toggle.dataset.target;
      let target;
      if (targetSelector.startsWith("#")) {
        target = document.querySelector(targetSelector);
      } else {
        const section = toggle.closest(".page-section, .search-group, #coltab-body");
        target = section ? section.querySelector(targetSelector) : document.querySelector(targetSelector);
      }
      if (!target) return;

      const key = "view_" + targetSelector.replace(/[^a-zA-Z0-9]/g, "_");
      const saved = localStorage.getItem(key);
      if (saved === "grid") {
        target.classList.add("is-grid");
        target.classList.remove("is-list");
        toggle.querySelectorAll(".vt-btn").forEach(b => {
          b.classList.toggle("is-active", b.dataset.view === "grid");
        });
      }

      toggle.querySelectorAll(".vt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const view = btn.dataset.view;
          toggle.querySelectorAll(".vt-btn").forEach(b => b.classList.remove("is-active"));
          btn.classList.add("is-active");

          if (view === "grid") {
            target.classList.add("is-grid");
            target.classList.remove("is-list");
          } else {
            target.classList.add("is-list");
            target.classList.remove("is-grid");
          }
          try { localStorage.setItem(key, view); } catch (_) {}
        });
      });
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
    if (input.dataset.boundSearch === "1") return;
    input.dataset.boundSearch = "1";
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        navigate("search", input.value);
      }
    });
  }

  // ---- 登录与权限 ----
  function login(role) {
    API.login(role).then(res => {
      finishLogin(res.user?.name || (role === "admin" ? "admin" : "listener_01"), res.user?.role || role);
    }).catch(() => {
      finishLogin(role === "admin" ? "admin" : "listener_01", role);
    });
  }

  function finishLogin(userName, role) {
    state.logged = true;
    state.role = role;
    state.userName = userName;

    const av = $("user-avatar");
    const nm = $("user-name");
    if (av) { av.textContent = state.userName.charAt(0).toUpperCase(); }
    if (nm) nm.textContent = state.userName + (role === "admin" ? " · 管理员" : "");

    const mu = document.querySelector("#avatar-menu .menu-title");
    const ms = document.querySelector("#avatar-menu .menu-sub");
    if (mu) mu.textContent = state.userName;
    if (ms) ms.textContent = role === "admin" ? "Administrator" : "Listener";

    document.querySelectorAll(".is-admin-only").forEach(el => {
      el.classList.toggle("is-hidden", role !== "admin");
    });
    const adminToggle = $("btn-toggle-admin");
    if (adminToggle) adminToggle.style.display = role === "admin" ? "inline-flex" : "none";

    $("page-login").classList.remove("is-active");
    $("app-shell").classList.add("is-active");

    navigate("home");
  }

  function logout() {
    API.logout().catch(() => {});
    state.logged = false; state.role = "guest";
    $("page-login").classList.add("is-active");
    $("app-shell").classList.remove("is-active");
  }

  // ---- 绑定 ----
  function renderSidePlaylists() {
    const list = $("side-playlist-list");
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
    const btnUser = $("btn-login-user");
    const btnAdmin = $("btn-login-admin");
    const btnGuest = $("btn-login-guest");
    if (btnUser) btnUser.addEventListener("click", () => login("user"));
    if (btnAdmin) btnAdmin.addEventListener("click", () => login("admin"));
    if (btnGuest) btnGuest.addEventListener("click", () => login("guest"));

    document.querySelectorAll(".login-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".login-tab").forEach(t => t.classList.remove("is-active"));
        tab.classList.add("is-active");
      });
    });

    const at = $("avatar-trigger");
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
      navigate(route, payload);
    });

    const lo = $("btn-logout");
    if (lo) lo.addEventListener("click", (e) => { e.stopPropagation(); logout(); });

    const ta = $("btn-toggle-admin");
    if (ta) ta.addEventListener("click", () => navigate("admin"));

    const btnNewPl = $("btn-new-playlist");
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
        const inp = $("global-search-input");
        if (inp) inp.focus();
      }
    });

    if (window.Player) Player.init();
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