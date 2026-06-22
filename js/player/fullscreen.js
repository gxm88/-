window.Player = window.Player || {};
(function() {
  "use strict";

  // ---- 全屏播放器切换 ----
  function toggleFullscreen() {
    const fs = document.getElementById("fullscreen-player");
    if (!fs) return;
    const isOpen = fs.classList.toggle("is-open");
    if (isOpen) {
      renderFullscreen();
      window.Player.renderTrackBar();
    }
  }

  function closeFullscreen() {
    const fs = document.getElementById("fullscreen-player");
    if (fs) fs.classList.remove("is-open");
    _fsDragBound = false; // 下次打开时重新绑定进度条事件
  }

  function setFSTab(tab) {
    window.Player.state.fsTab = tab;
    renderFullscreen();
  }

  function renderFullscreen() {
    const state = window.Player.state;
    const fs = document.getElementById("fullscreen-player");
    if (!fs || !fs.classList.contains("is-open")) return;

    const t = state.queue[state.index];
    const [c1, c2] = t ? colorOf(t.id.charCodeAt(1)) : ["#4a4a7a", "#1e1e33"];

    // 更新封面
    const fsc = document.getElementById("fs-cover");
    if (fsc) fsc.style.cssText = `background: linear-gradient(135deg, ${c1}, ${c2});`;

    if (t) {
      const fsTitle = document.getElementById("fs-title");
      if (fsTitle) fsTitle.textContent = t.title;
      const fsSub = document.getElementById("fs-sub");
      if (fsSub) fsSub.textContent = `${t.artist} · ${t.album}`;
      // 异步获取播放次数
      API.getTrack(t.id).then(res => {
        if (res.data) {
          const fsPlays = document.getElementById("fs-plays");
          if (fsPlays) fsPlays.textContent = res.data.plays || String((t.id.charCodeAt(2) % 10 + 1) * 24);
        }
      }).catch(() => {
        const fsPlays = document.getElementById("fs-plays");
        if (fsPlays) fsPlays.textContent = "...";
      });
      // 异步获取 AI 匹配度
      API.getSimilar().then(res => {
        if (res.data) {
          const fsMatch = document.getElementById("fs-match");
          if (fsMatch) {
            const similar = Array.isArray(res.data) ? res.data : (res.data.tracks || []);
            const matchCount = similar.filter(s => s.genre === t.genre).length;
            const pct = Math.min(98, 60 + matchCount * 6);
            fsMatch.textContent = `${pct}%`;
          }
        }
      }).catch(() => {
        const fsMatch = document.getElementById("fs-match");
        if (fsMatch) fsMatch.textContent = "—";
      });
    }

    // 歌词
    const lyricsEl = document.getElementById("lyrics");
    if (lyricsEl) {
      const defaultLines = [
        "♪ 夜色在霓虹中晕开",
        "♪ 收音机吐出蓝色的光",
        "♪ 我的鞋子踩在湿润的柏油路上",
        "♪ 你说：慢一点，再慢一点",
        "♪ 星的节奏正跟随我们的呼吸",
        "♪ 每一行歌词都是一次告白",
        "♪ 每一次停顿都是一次再见",
        "♪ 在午夜的轨道上我们慢慢远去",
      ];
      const lines = (t && t.lyrics) ? t.lyrics.split("\n").filter(l => l.trim()) : defaultLines;
      lyricsEl.innerHTML = lines.map((l, i) =>
        `<div class="lyric-line ${i === Math.floor(state.progress * 4) % lines.length ? "is-current" : ""}">${l}</div>`
      ).join("");
    }

    // 全屏内播放控制
    const fsControls = document.getElementById("fs-controls");
    if (fsControls) {
      const PLAY_MODES = window.Player.PLAY_MODES;
      const mode = PLAY_MODES.find(m => m.key === state.playMode) || PLAY_MODES[0];
      const effVol = state.muted ? 0 : state.volume;
      fsControls.innerHTML = `
        <button class="fs-ctrl-btn" id="fs-btn-prev" title="上一首">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zM9.5 12l10-6v12z"></path></svg>
        </button>
        <button class="fs-play-btn" id="fs-btn-play" title="播放/暂停">
          ${state.playing
            ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>'
            : '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>'}
        </button>
        <button class="fs-ctrl-btn" id="fs-btn-next" title="下一首">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM4.5 18l10-6-10-6z"></path></svg>
        </button>
      `;

      // 工具行：播放模式 / 均衡器 / 睡眠定时 / 音量
      const fsUtils = document.createElement("div");
      fsUtils.className = "fs-utils";
      fsUtils.innerHTML = `
        <button class="fs-util-btn ${state.playMode !== "sequential" ? "is-active" : ""}" id="fs-btn-mode" title="${mode.desc}">
          ${mode.icon} <span>${mode.label}</span>
        </button>
        <button class="fs-util-btn ${state.eq.enabled ? "is-active" : ""}" id="fs-btn-eq" title="均衡器">
          ⟐ <span>均衡器</span>
        </button>
        <button class="fs-util-btn ${state.sleepTimer ? "is-active" : ""}" id="fs-btn-sleep" title="${state.sleepTimer ? `剩余 ${window.Player.fmtTime(state.sleepRemaining)}` : "睡眠定时"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          <span>${state.sleepTimer ? window.Player.fmtTime(state.sleepRemaining) : "睡眠"}</span>
        </button>
        <button class="fs-util-btn" id="fs-btn-volume" title="音量面板">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a5 5 0 0 1 0 6M19 7a8 8 0 0 1 0 10"></path></svg>
          <span>${Math.round(effVol * 100)}%</span>
        </button>
      `;
      fsControls.appendChild(fsUtils);

      const fsPlay = document.getElementById("fs-btn-play");
      if (fsPlay) fsPlay.addEventListener("click", window.Player.togglePlay);
      const fsPrev = document.getElementById("fs-btn-prev");
      if (fsPrev) fsPrev.addEventListener("click", window.Player.prev);
      const fsNext = document.getElementById("fs-btn-next");
      if (fsNext) fsNext.addEventListener("click", window.Player.next);

      // 全屏内面板按钮事件
      const fsModeBtn = document.getElementById("fs-btn-mode");
      if (fsModeBtn) fsModeBtn.addEventListener("click", window.Player.cyclePlayMode);
      const fsEqBtn = document.getElementById("fs-btn-eq");
      if (fsEqBtn) fsEqBtn.addEventListener("click", window.Player.toggleEQPanel);
      const fsSleepBtn = document.getElementById("fs-btn-sleep");
      if (fsSleepBtn) fsSleepBtn.addEventListener("click", window.Player.toggleSleepPanel);
      const fsVolBtn = document.getElementById("fs-btn-volume");
      if (fsVolBtn) fsVolBtn.addEventListener("click", window.Player.toggleVolumePanel);
    }

    // Tab 切换按钮
    const fsTabBtns = document.getElementById("fs-tab-btns");
    if (fsTabBtns) {
      fsTabBtns.innerHTML = `
        <button class="fs-tab-btn ${state.fsTab === "cover" ? "is-active" : ""}" data-fs-tab="cover">封面</button>
        <button class="fs-tab-btn ${state.fsTab === "lyrics" ? "is-active" : ""}" data-fs-tab="lyrics">歌词</button>
      `;
      fsTabBtns.querySelectorAll(".fs-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => setFSTab(btn.dataset.fsTab));
      });
    }

    // 封面/歌词区域切换
    const fsCoverArea = document.getElementById("fs-cover-area");
    const fsLyricsArea = document.getElementById("fs-lyrics-area");
    if (fsCoverArea) fsCoverArea.style.display = state.fsTab === "cover" ? "" : "none";
    if (fsLyricsArea) fsLyricsArea.style.display = state.fsTab === "lyrics" ? "" : "none";

    // 全屏进度条交互（在全屏打开后绑定，确保 pointer-events: auto 生效）
    bindFSProgress();
  }

  // 全屏进度条拖拽 + 点击跳转（在 renderFullscreen 中调用，确保全屏已打开）
  let _fsDragBound = false;
  function bindFSProgress() {
    const fsBar = document.getElementById("fs-progress-bar");
    if (!fsBar || _fsDragBound) return;
    _fsDragBound = true;

    // 点击跳转
    fsBar.addEventListener("click", (e) => {
      const rect = fsBar.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      window.Player.seekTo(p);
    });

    // 拖拽跳转
    let dragging = false;
    const updateProgress = (clientX) => {
      const rect = fsBar.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      window.Player.seekTo(p);
    };
    fsBar.addEventListener("mousedown", (e) => { e.preventDefault(); dragging = true; updateProgress(e.clientX); });
    document.addEventListener("mousemove", (e) => { if (dragging) { e.preventDefault(); updateProgress(e.clientX); } });
    document.addEventListener("mouseup", () => { dragging = false; });
    fsBar.addEventListener("touchstart", (e) => { e.preventDefault(); dragging = true; updateProgress(e.touches[0].clientX); }, { passive: false });
    document.addEventListener("touchmove", (e) => { if (dragging) { e.preventDefault(); updateProgress(e.touches[0].clientX); } }, { passive: false });
    document.addEventListener("touchend", () => { dragging = false; });
  }

  // Export
  window.Player.toggleFullscreen = toggleFullscreen;
  window.Player.closeFullscreen = closeFullscreen;
  window.Player.setFSTab = setFSTab;
  window.Player.renderFullscreen = renderFullscreen;
  window.Player.bindFSProgress = bindFSProgress;
})();