window.Player = window.Player || {};
(function() {
  "use strict";

  let _eventsBound = false;

  // ---- 全屏播放器切换 ----
  function toggleFullscreen() {
    const fs = document.getElementById("fullscreen-player");
    if (!fs) return;
    const isOpen = fs.classList.toggle("is-open");
    if (isOpen) {
      bindEventsOnce();
      renderFullscreen();
      window.Player.renderTrackBar();
    }
  }

  function closeFullscreen() {
    const fs = document.getElementById("fullscreen-player");
    if (fs) fs.classList.remove("is-open");
    _fsDragBound = false;
  }

  function setFSTab(tab) {
    window.Player.state.fsTab = tab;
    // 更新按钮状态
    document.querySelectorAll(".fs-tab-btn").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.fsTab === tab);
    });
    // 切换区域显示
    const coverArea = document.getElementById("fs-cover-area");
    const lyricsArea = document.getElementById("fs-lyrics-area");
    if (coverArea) coverArea.style.display = tab === "cover" ? "" : "none";
    if (lyricsArea) lyricsArea.style.display = tab === "lyrics" ? "" : "none";
  }

  // ---- 一次性绑定事件 ----
  function bindEventsOnce() {
    if (_eventsBound) return;
    _eventsBound = true;

    // 关闭按钮
    const closeBtn = document.getElementById("btn-fs-close");
    if (closeBtn) closeBtn.addEventListener("click", closeFullscreen);

    // Tab 切换
    document.querySelectorAll(".fs-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => setFSTab(btn.dataset.fsTab));
    });

    // 播放控制
    const playBtn = document.getElementById("fs-btn-play");
    if (playBtn) playBtn.addEventListener("click", window.Player.togglePlay);
    const prevBtn = document.getElementById("fs-btn-prev");
    if (prevBtn) prevBtn.addEventListener("click", window.Player.prev);
    const nextBtn = document.getElementById("fs-btn-next");
    if (nextBtn) nextBtn.addEventListener("click", window.Player.next);

    // 工具栏按钮
    const modeBtn = document.getElementById("fs-btn-mode");
    if (modeBtn) modeBtn.addEventListener("click", window.Player.cyclePlayMode);
    const eqBtn = document.getElementById("fs-btn-eq");
    if (eqBtn) eqBtn.addEventListener("click", window.Player.toggleEQPanel);
    const sleepBtn = document.getElementById("fs-btn-sleep");
    if (sleepBtn) sleepBtn.addEventListener("click", window.Player.toggleSleepPanel);
    const volBtn = document.getElementById("fs-btn-volume");
    if (volBtn) volBtn.addEventListener("click", window.Player.toggleVolumePanel);

    // 队列按钮
    const queueBtn = document.getElementById("fs-btn-queue");
    if (queueBtn) queueBtn.addEventListener("click", window.Player.toggleQueuePanel);

    // 进度条
    bindFSProgress();
  }

  // ---- 渲染全屏内容（更新状态，不重建 HTML）----
  function renderFullscreen() {
    const state = window.Player.state;
    const fs = document.getElementById("fullscreen-player");
    if (!fs || !fs.classList.contains("is-open")) return;

    const t = state.queue[state.index];
    const [c1, c2] = t ? colorOf(t.id.charCodeAt(1)) : ["#4a4a7a", "#1e1e33"];

    // 更新封面
    const cover = document.getElementById("fs-cover");
    if (cover) cover.style.cssText = `background: linear-gradient(135deg, ${c1}, ${c2});`;

    if (t) {
      const title = document.getElementById("fs-title");
      if (title) title.textContent = t.title;
      const sub = document.getElementById("fs-sub");
      if (sub) sub.textContent = `${t.artist} · ${t.album}`;
      
      // 异步获取播放次数
      API.getTrack(t.id).then(res => {
        if (res.data) {
          const plays = document.getElementById("fs-plays");
          if (plays) plays.textContent = res.data.plays || String((t.id.charCodeAt(2) % 10 + 1) * 24);
        }
      }).catch(() => {
        const plays = document.getElementById("fs-plays");
        if (plays) plays.textContent = "...";
      });
      
      // 异步获取 AI 匹配度
      API.getSimilar().then(res => {
        if (res.data) {
          const match = document.getElementById("fs-match");
          if (match) {
            const similar = Array.isArray(res.data) ? res.data : (res.data.tracks || []);
            const matchCount = similar.filter(s => s.genre === t.genre).length;
            const pct = Math.min(98, 60 + matchCount * 6);
            match.textContent = `${pct}%`;
          }
        }
      }).catch(() => {
        const match = document.getElementById("fs-match");
        if (match) match.textContent = "—";
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

    // 更新播放按钮图标
    const playBtn = document.getElementById("fs-btn-play");
    if (playBtn) {
      playBtn.innerHTML = state.playing
        ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>'
        : '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>';
    }

    // 更新工具栏按钮状态
    const PLAY_MODES = window.Player.PLAY_MODES;
    const mode = PLAY_MODES.find(m => m.key === state.playMode) || PLAY_MODES[0];
    const modeBtn = document.getElementById("fs-btn-mode");
    if (modeBtn) {
      modeBtn.classList.toggle("is-active", state.playMode !== "sequential");
      const span = modeBtn.querySelector("span");
      if (span) span.textContent = mode.label;
    }

    const eqBtn = document.getElementById("fs-btn-eq");
    if (eqBtn) eqBtn.classList.toggle("is-active", state.eq && state.eq.enabled);

    const sleepBtn = document.getElementById("fs-btn-sleep");
    if (sleepBtn) {
      sleepBtn.classList.toggle("is-active", state.sleepTimer);
      const span = sleepBtn.querySelector("span");
      if (span) span.textContent = state.sleepTimer ? window.Player.fmtTime(state.sleepRemaining) : "睡眠";
    }

    const volBtn = document.getElementById("fs-btn-volume");
    if (volBtn) {
      const effVol = state.muted ? 0 : state.volume;
      const span = volBtn.querySelector("span");
      if (span) span.textContent = `${Math.round(effVol * 100)}%`;
    }

    // 更新进度条
    const fsFill = document.getElementById("fs-progress-fill");
    if (fsFill) fsFill.style.width = `${(state.progress * 100).toFixed(2)}%`;
    const fsCur = document.getElementById("fs-t-cur");
    const fsDur = document.getElementById("fs-t-dur");
    const sec = t ? t.dur : 0;
    if (fsCur) fsCur.textContent = window.Player.fmtTime(Math.floor(sec * state.progress));
    if (fsDur) fsDur.textContent = window.Player.fmtTime(sec);
  }

  // ---- 进度条拖拽 ----
  let _fsDragBound = false;
  function bindFSProgress() {
    const bar = document.getElementById("fs-progress-bar");
    if (!bar || _fsDragBound) return;
    _fsDragBound = true;

    bar.addEventListener("click", (e) => {
      const rect = bar.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      window.Player.seekTo(p);
    });

    let dragging = false;
    const updateProgress = (clientX) => {
      const rect = bar.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      window.Player.seekTo(p);
    };
    bar.addEventListener("mousedown", (e) => { e.preventDefault(); dragging = true; updateProgress(e.clientX); });
    document.addEventListener("mousemove", (e) => { if (dragging) { e.preventDefault(); updateProgress(e.clientX); } });
    document.addEventListener("mouseup", () => { dragging = false; });
    bar.addEventListener("touchstart", (e) => { e.preventDefault(); dragging = true; updateProgress(e.touches[0].clientX); }, { passive: false });
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