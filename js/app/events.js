window.App = window.App || {};
(function() {
  "use strict";

  function showToast(message, type) {
    if (!type) type = 'info';
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
      background: ${type === 'success' ? '#22c55e' : type === 'warn' ? '#f59e0b' : '#3b82f6'};
      color: #fff; padding: 10px 24px; border-radius: 999px; font-size: 13px;
      z-index: 9999; animation: fadeInUp 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function bindCards(root) {
    // 媒体块 → 打开歌单详情
    root.querySelectorAll(".media-block[data-playlist]").forEach(c => {
      c.addEventListener("click", () => {
        const id = c.dataset.playlist;
        if (id) window.App.navigate("playlist-detail", id);
      });
    });
    // 媒体块 (专辑) → 专辑详情
    root.querySelectorAll(".media-block[data-album]").forEach(c => {
      c.addEventListener("click", () => {
        const id = c.dataset.album;
        if (id) window.App.navigate("album-detail", id);
      });
    });
    // 歌手圆环 → 通过 API 获取歌手歌曲并播放
    root.querySelectorAll(".artist-chip[data-artist]").forEach(c => {
      c.addEventListener("click", () => {
        const artistId = c.dataset.artist;
        API.getArtist(artistId).then(res => window.Player.playAll(res.tracks));
      });
    });
    // 文件夹 → 通过 API 获取文件夹歌曲并播放
    root.querySelectorAll(".folder-item[data-folder]").forEach(c => {
      c.addEventListener("click", () => {
        const folderPath = c.dataset.folder;
        API.getFolder(folderPath).then(res => window.Player.playAll(res.data));
      });
    });
    // 榜单歌曲 → 播放（仅本地已收录的）
    root.querySelectorAll(".chart-song[data-track]").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.dataset.track;
        API.getTrack(id).then(res => {
          if (res.data) window.Player.playAll([res.data]);
        });
      });
    });
    // track-row 单击 → 通过 API 获取歌曲并播放
    root.querySelectorAll(".track-row[data-track]").forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.track;
        API.getTrack(id).then(res => {
          if (res.data) window.Player.playAll([res.data]);
        });
      });
    });

    // 页面内 "立即播放" / "播放整张歌单"
    root.querySelectorAll("[data-go-playlist], [data-play-playlist]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = (btn.dataset.goPlaylist || btn.dataset.playPlaylist);
        API.getPlaylist(id).then(res => window.Player.playAll(res.data.tracks));
      });
    });

    // AI 每日推荐刷新
    const refreshDaily = root.querySelector("#btn-refresh-daily");
    if (refreshDaily) refreshDaily.addEventListener("click", () => {
      API.getDailyRecommend().then(res => window.Player.playAll(res.data));
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
                  ${window.Pages.viewToggleBtn("#nlp-tracks")}
                </div>
              </div>
              <div class="track-list" id="nlp-tracks">
                ${tracks.map((t, i) => window.Pages.rowFor(t, i)).join("")}
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
          if (playBtn) playBtn.addEventListener("click", () => window.Player.playAll(tracks));
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
        API.getTracks().then(res => window.Player.playAll(res.data.slice(0, 8)));
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
    const state = window.App.state;
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
    const input = document.getElementById("global-search-input");
    if (!input) return;
    if (input.dataset.boundSearch === "1") return;
    input.dataset.boundSearch = "1";
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        window.App.navigate("search", input.value);
      }
    });
  }

  // Export
  window.App.showToast = showToast;
  window.App.bindCards = bindCards;
  window.App.bindViewToggle = bindViewToggle;
  window.App.bindQueuePanel = bindQueuePanel;
  window.App.bindBanner = bindBanner;
  window.App.bindGlobalSearch = bindGlobalSearch;
})();