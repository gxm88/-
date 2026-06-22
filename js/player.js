/* ============================================================
   播放器控制：播放 / 暂停 / 切歌 / 队列 / 进度条 / 音量 /
              常驻底部 + 全屏歌词视图 + Web/APP 状态同步
              + 均衡器 / 音效预设 / 频谱可视化
              + 播放模式 / 睡眠定时 / 音量管理 / 临时队列
   ============================================================ */

const Player = (() => {
  const state = {
    queue: [],         // [{ id, title, artist, ... }]
    index: 0,
    playing: false,
    progress: 0,       // 0..1
    volume: 0.7,       // 全局音量
    appVolume: 1.0,    // 软件独立音量
    muted: false,      // 一键静音
    favorite: new Set(),
    timer: null,       // 播放进度计时器
    sleepTimer: null,  // 睡眠定时器
    sleepRemaining: 0, // 睡眠剩余秒数
    // ---- 播放模式 ----
    playMode: "sequential", // sequential | repeat-one | repeat-list | shuffle | unique-shuffle
    shuffleHistory: [],     // 无重复随机历史
    // ---- 均衡器 ----
    eq: {
      enabled: false,
      preset: "flat",   // flat | classical | rock | pop | electronic | jazz | vocal
      bands: [
        { hz: 60,  label: "60",   gain: 0 },   // 超低音
        { hz: 250, label: "250",  gain: 0 },   // 低音
        { hz: 1000,label: "1K",   gain: 0 },   // 中音
        { hz: 4000,label: "4K",   gain: 0 },   // 高音
        { hz: 12000,label: "12K",  gain: 0 },   // 超高音
      ],
    },
    // AudioContext (Web Audio API)
    audioCtx: null,
    analyser: null,
    vizTimer: null,
    vizData: null,
    // ---- 全集屏切换 ----
    fsTab: "cover", // cover | lyrics
  };

  // ---- 播放模式定义 ----
  const PLAY_MODES = [
    { key: "sequential",    icon: "↻", label: "顺序播放",   desc: "按列表顺序依次播放" },
    { key: "repeat-one",    icon: "↺", label: "单曲循环",   desc: "重复播放当前歌曲" },
    { key: "repeat-list",   icon: "↻₂", label: "列表循环",  desc: "播放完列表后从头再来" },
    { key: "shuffle",       icon: "⇄", label: "随机播放",   desc: "随机打乱顺序播放" },
    { key: "unique-shuffle",icon: "⇅", label: "无重复随机", desc: "每首只播一次，播完停止" },
  ];

  // ---- EQ 预设 ----
  const EQ_PRESETS = {
    flat:        { name: "经典",      desc: "原声，不添加任何音染",         gains: [ 0,  0,  0,  0,  0] },
    classical:   { name: "古典",      desc: "柔和均衡，突出乐器质感",        gains: [ 2,  1,  0,  2,  3] },
    rock:        { name: "摇滚",      desc: "强化高低频，V 型曲线",          gains: [ 4,  2, -2,  3,  5] },
    pop:         { name: "流行",      desc: "突出人声，增强中高频",          gains: [ 1,  3,  2,  4,  3] },
    electronic:  { name: "电子",      desc: "超重低音 + 清脆高音",          gains: [ 6,  4, -1,  2,  5] },
    jazz:        { name: "爵士",      desc: "温暖圆润，柔化高频",            gains: [ 2,  3,  1, -1, -2] },
    vocal:       { name: "人声",      desc: "突出中频人声，降低伴奏干扰",     gains: [-2, -1,  4,  2,  0] },
  };

  const $ = (id) => document.getElementById(id);

  function buildRow(track, idx) {
    return `
      <div class="track-row" data-track="${track.id}" data-idx="${idx}" draggable="true">
        <div class="track-num">
          <span class="t-num">${idx + 1}</span>
          <span class="t-play">▶</span>
        </div>
        <div class="track-info">
          <div class="track-cover-sm" style="--c1:${colorOf(idx)[0]};--c2:${colorOf(idx)[1]}"></div>
          <div class="track-meta">
            <div class="track-name">${track.title}</div>
            <div class="track-name-sub">${track.artist}</div>
          </div>
        </div>
        <div class="track-col">${track.album}</div>
        <div class="track-col">${track.genre}</div>
        <div class="track-dur">${fmtDur(track.dur)}</div>
        <div class="track-act">
          <button class="icon-btn q-remove-btn" data-idx="${idx}" title="移除">×</button>
        </div>
      </div>`;
  }

  function renderQueue() {
    const el = $("queue-list");
    if (!el) return;
    el.innerHTML = state.queue.map((t, i) => buildRow(t, i)).join("");

    // 绑定双击播放
    el.querySelectorAll(".track-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const i = parseInt(row.dataset.idx);
        playIndex(i);
      });
    });

    // 绑定移除按钮
    el.querySelectorAll(".q-remove-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = parseInt(btn.dataset.idx);
        removeFromQueue(i);
      });
    });

    // 拖拽排序
    bindDragSort(el);
  }

  /* ---- 拖拽排序 ---- */
  function bindDragSort(el) {
    let dragSrc = null;

    el.querySelectorAll(".track-row[draggable]").forEach(row => {
      row.addEventListener("dragstart", (e) => {
        dragSrc = row;
        row.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("is-dragging");
        el.querySelectorAll(".track-row").forEach(r => r.classList.remove("is-drag-over"));
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (row !== dragSrc) row.classList.add("is-drag-over");
      });
      row.addEventListener("dragleave", () => {
        row.classList.remove("is-drag-over");
      });
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("is-drag-over");
        if (dragSrc && dragSrc !== row) {
          const fromIdx = parseInt(dragSrc.dataset.idx);
          const toIdx = parseInt(row.dataset.idx);
          if (!isNaN(fromIdx) && !isNaN(toIdx)) {
            moveQueueItem(fromIdx, toIdx);
          }
        }
      });
    });
  }

  function moveQueueItem(fromIdx, toIdx) {
    const item = state.queue.splice(fromIdx, 1)[0];
    state.queue.splice(toIdx, 0, item);
    // 调整当前播放索引
    if (state.index === fromIdx) {
      state.index = toIdx;
    } else if (fromIdx < state.index && toIdx >= state.index) {
      state.index--;
    } else if (fromIdx > state.index && toIdx <= state.index) {
      state.index++;
    }
    renderQueue();
  }

  function removeFromQueue(i) {
    if (state.queue.length <= 1) return;
    state.queue.splice(i, 1);
    if (state.index >= state.queue.length) state.index = state.queue.length - 1;
    if (state.index > i) state.index--;
    renderQueue();
    renderTrackBar();
  }

  function clearQueue() {
    if (state.queue.length === 0) return;
    state.queue = [];
    state.index = 0;
    state.progress = 0;
    state.playing = false;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    renderQueue();
    renderTrackBar();
    renderControls();
    renderProgress();
  }

  function addToQueue(tracks) {
    if (!Array.isArray(tracks)) tracks = [tracks];
    state.queue.push(...tracks);
    renderQueue();
    if (!state.playing && state.queue.length > 0) {
      renderTrackBar();
    }
  }

  /* ---- 播放模式 ---- */
  function cyclePlayMode() {
    const idx = PLAY_MODES.findIndex(m => m.key === state.playMode);
    state.playMode = PLAY_MODES[(idx + 1) % PLAY_MODES.length].key;
    state.shuffleHistory = [];
    renderPlayModeButton();
  }

  function setPlayMode(mode) {
    if (PLAY_MODES.find(m => m.key === mode)) {
      state.playMode = mode;
      state.shuffleHistory = [];
      renderPlayModeButton();
    }
  }

  function renderPlayModeButton() {
    const btn = $("btn-play-mode");
    if (!btn) return;
    const mode = PLAY_MODES.find(m => m.key === state.playMode) || PLAY_MODES[0];
    btn.title = mode.label + " · " + mode.desc;
    btn.innerHTML = mode.icon;
    btn.classList.toggle("is-active", state.playMode !== "sequential");
  }

  /* ---- 音量 / 静音 ---- */
  function toggleMute() {
    state.muted = !state.muted;
    renderVolume();
    renderVolumePanel();
  }

  function setVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    if (state.volume > 0) state.muted = false;
    renderVolume();
    renderVolumePanel();
  }

  function setAppVolume(v) {
    state.appVolume = Math.max(0, Math.min(1, v));
    renderVolumePanel();
  }

  function renderVolume() {
    const vfill = $("vol-fill");
    if (vfill) {
      const effVol = state.muted ? 0 : state.volume;
      vfill.style.width = `${(effVol * 100).toFixed(0)}%`;
    }

    const btn = $("btn-volume");
    if (btn) {
      const effVol = state.muted ? 0 : state.volume;
      if (effVol === 0 || state.muted) {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4zM16 15l6-6M16 9l6 6"></path></svg>';
        btn.classList.add("is-muted");
      } else if (effVol < 0.5) {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a5 5 0 0 1 0 6"></path></svg>';
        btn.classList.remove("is-muted");
      } else {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a5 5 0 0 1 0 6M19 7a8 8 0 0 1 0 10"></path></svg>';
        btn.classList.remove("is-muted");
      }
    }
  }

  /* ---- 音量面板 ---- */
  function toggleVolumePanel() {
    const panel = $("volume-panel");
    if (!panel) return;
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) renderVolumePanel();
  }

  function renderVolumePanel() {
    const panel = $("volume-panel");
    if (!panel || !panel.classList.contains("is-open")) return;

    const effVol = state.muted ? 0 : state.volume;
    panel.innerHTML = `
      <div class="vol-panel-head">
        <span class="vol-panel-title">音量控制</span>
        <button class="vol-panel-close" id="vol-panel-close">×</button>
      </div>
      <div class="vol-panel-body">
        <div class="vol-row">
          <div class="vol-row-label">
            <span>全局音量</span>
            <span class="vol-val">${Math.round(effVol * 100)}%</span>
          </div>
          <div class="vol-row-bar-wrap">
            <button class="vol-mute-btn ${state.muted ? 'is-muted' : ''}" id="vol-mute-btn">
              ${state.muted
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4zM16 15l6-6M16 9l6 6"></path></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a5 5 0 0 1 0 6M19 7a8 8 0 0 1 0 10"></path></svg>'}
            </button>
            <div class="vol-row-bar" id="vol-panel-bar">
              <div class="vol-row-fill" style="width:${(effVol * 100).toFixed(0)}%"></div>
            </div>
          </div>
        </div>
        <div class="vol-row">
          <div class="vol-row-label">
            <span>软件音量</span>
            <span class="vol-val">${Math.round(state.appVolume * 100)}%</span>
          </div>
          <div class="vol-row-bar" id="app-vol-bar">
            <div class="vol-row-fill" style="width:${(state.appVolume * 100).toFixed(0)}%"></div>
          </div>
        </div>
      </div>
    `;

    // 绑定静音按钮
    const muteBtn = panel.querySelector("#vol-mute-btn");
    if (muteBtn) muteBtn.addEventListener("click", toggleMute);

    // 绑定全局音量条
    const volBar = panel.querySelector("#vol-panel-bar");
    if (volBar) {
      volBar.addEventListener("click", (e) => {
        const rect = volBar.getBoundingClientRect();
        const p = (e.clientX - rect.left) / rect.width;
        setVolume(p);
      });
    }

    // 绑定软件音量条
    const appVolBar = panel.querySelector("#app-vol-bar");
    if (appVolBar) {
      appVolBar.addEventListener("click", (e) => {
        const rect = appVolBar.getBoundingClientRect();
        const p = (e.clientX - rect.left) / rect.width;
        setAppVolume(p);
      });
    }

    // 绑定关闭
    const close = panel.querySelector("#vol-panel-close");
    if (close) close.addEventListener("click", () => panel.classList.remove("is-open"));
  }

  /* ---- 睡眠定时器 ---- */
  function toggleSleepPanel() {
    const panel = $("sleep-panel");
    if (!panel) return;
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) renderSleepPanel();
  }

  function renderSleepPanel() {
    const panel = $("sleep-panel");
    if (!panel || !panel.classList.contains("is-open")) return;

    const options = [15, 30, 45, 60, 90, 120];
    const remaining = state.sleepTimer ? state.sleepRemaining : 0;

    panel.innerHTML = `
      <div class="sleep-head">
        <span class="sleep-title">⏰ 睡眠定时</span>
        <button class="sleep-close" id="sleep-close">×</button>
      </div>
      <div class="sleep-body">
        ${state.sleepTimer ? `
          <div class="sleep-countdown">
            <span class="sleep-countdown-label">将在</span>
            <span class="sleep-countdown-time">${fmtTime(remaining)}</span>
            <span class="sleep-countdown-label">后停止播放</span>
          </div>
          <button class="sleep-cancel-btn" id="sleep-cancel">取消定时</button>
        ` : `
          <p class="sleep-desc">选择定时时长，到时自动停止播放</p>
          <div class="sleep-options">
            ${options.map(m => `<button class="sleep-opt-btn" data-min="${m}">${m} 分钟</button>`).join("")}
          </div>
          <div class="sleep-custom">
            <input type="number" id="sleep-custom-input" placeholder="自定义分钟数" min="1" max="480" />
            <button class="sleep-opt-btn accent" id="sleep-custom-btn">设置</button>
          </div>
        `}
      </div>
    `;

    // 绑定选项按钮
    panel.querySelectorAll(".sleep-opt-btn[data-min]").forEach(btn => {
      btn.addEventListener("click", () => startSleepTimer(parseInt(btn.dataset.min) * 60));
    });

    // 自定义按钮
    const customBtn = panel.querySelector("#sleep-custom-btn");
    const customInput = panel.querySelector("#sleep-custom-input");
    if (customBtn && customInput) {
      customBtn.addEventListener("click", () => {
        const val = parseInt(customInput.value);
        if (val > 0 && val <= 480) startSleepTimer(val * 60);
      });
    }

    // 取消定时
    const cancelBtn = panel.querySelector("#sleep-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", cancelSleepTimer);

    // 关闭
    const close = panel.querySelector("#sleep-close");
    if (close) close.addEventListener("click", () => panel.classList.remove("is-open"));
  }

  function startSleepTimer(seconds) {
    cancelSleepTimer();
    state.sleepRemaining = seconds;
    state.sleepTimer = setInterval(() => {
      state.sleepRemaining--;
      if (state.sleepRemaining <= 0) {
        cancelSleepTimer();
        if (state.playing) {
          state.playing = false;
          if (state.timer) { clearInterval(state.timer); state.timer = null; }
          renderControls();
        }
      }
      // 更新面板显示
      if ($("sleep-panel")?.classList.contains("is-open")) renderSleepPanel();
      renderSleepButton();
    }, 1000);
    renderSleepButton();
    renderSleepPanel();
  }

  function cancelSleepTimer() {
    if (state.sleepTimer) { clearInterval(state.sleepTimer); state.sleepTimer = null; }
    state.sleepRemaining = 0;
    renderSleepButton();
    const panel = $("sleep-panel");
    if (panel && panel.classList.contains("is-open")) renderSleepPanel();
  }

  function renderSleepButton() {
    const btn = $("btn-sleep");
    if (!btn) return;
    if (state.sleepTimer) {
      btn.classList.add("is-active");
      btn.title = `睡眠定时: ${fmtTime(state.sleepRemaining)}`;
    } else {
      btn.classList.remove("is-active");
      btn.title = "睡眠定时";
    }
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // ---- 全屏播放器切换 ----
  function toggleFullscreen() {
    const fs = $("fullscreen-player");
    if (!fs) return;
    const isOpen = fs.classList.toggle("is-open");
    if (isOpen) {
      renderFullscreen();
      renderTrackBar();
    }
  }

  function setFSTab(tab) {
    state.fsTab = tab;
    renderFullscreen();
  }

  function renderFullscreen() {
    const fs = $("fullscreen-player");
    if (!fs || !fs.classList.contains("is-open")) return;

    const t = state.queue[state.index];
    const [c1, c2] = t ? colorOf(t.id.charCodeAt(1)) : ["#4a4a7a", "#1e1e33"];

    // 更新封面
    const fsc = $("fs-cover");
    if (fsc) fsc.style.cssText = `background: linear-gradient(135deg, ${c1}, ${c2});`;

    if (t) {
      if ($("fs-title")) $("fs-title").textContent = t.title;
      if ($("fs-sub")) $("fs-sub").textContent = `${t.artist} · ${t.album}`;
      if ($("fs-plays")) $("fs-plays").textContent = `${Math.floor(Math.random() * 120) + 20}`;
      if ($("fs-match")) $("fs-match").textContent = `${70 + (t.id.charCodeAt(2) % 28)}%`;
    }

    // 歌词
    const lyricsEl = $("lyrics");
    if (lyricsEl) {
      const lines = [
        "♪ 夜色在霓虹中晕开",
        "♪ 收音机吐出蓝色的光",
        "♪ 我的鞋子踩在湿润的柏油路上",
        "♪ 你说：慢一点，再慢一点",
        "♪ 星的节奏正跟随我们的呼吸",
        "♪ 每一行歌词都是一次告白",
        "♪ 每一次停顿都是一次再见",
        "♪ 在午夜的轨道上我们慢慢远去",
      ];
      lyricsEl.innerHTML = lines.map((l, i) =>
        `<div class="lyric-line ${i === Math.floor(state.progress * 4) % lines.length ? "is-current" : ""}">${l}</div>`
      ).join("");
    }

    // 全屏内播放控制
    const fsControls = $("fs-controls");
    if (fsControls) {
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
        <button class="fs-util-btn ${state.sleepTimer ? "is-active" : ""}" id="fs-btn-sleep" title="${state.sleepTimer ? `剩余 ${fmtTime(state.sleepRemaining)}` : "睡眠定时"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          <span>${state.sleepTimer ? fmtTime(state.sleepRemaining) : "睡眠"}</span>
        </button>
        <button class="fs-util-btn" id="fs-btn-volume" title="音量面板">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a5 5 0 0 1 0 6M19 7a8 8 0 0 1 0 10"></path></svg>
          <span>${Math.round(effVol * 100)}%</span>
        </button>
      `;
      fsControls.appendChild(fsUtils);

      const fsPlay = $("fs-btn-play");
      if (fsPlay) fsPlay.addEventListener("click", togglePlay);
      const fsPrev = $("fs-btn-prev");
      if (fsPrev) fsPrev.addEventListener("click", prev);
      const fsNext = $("fs-btn-next");
      if (fsNext) fsNext.addEventListener("click", next);

      // 全屏内面板按钮事件
      const fsModeBtn = $("fs-btn-mode");
      if (fsModeBtn) fsModeBtn.addEventListener("click", cyclePlayMode);
      const fsEqBtn = $("fs-btn-eq");
      if (fsEqBtn) fsEqBtn.addEventListener("click", toggleEQPanel);
      const fsSleepBtn = $("fs-btn-sleep");
      if (fsSleepBtn) fsSleepBtn.addEventListener("click", toggleSleepPanel);
      const fsVolBtn = $("fs-btn-volume");
      if (fsVolBtn) fsVolBtn.addEventListener("click", toggleVolumePanel);
    }

    // Tab 切换按钮
    const fsTabBtns = $("fs-tab-btns");
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
    const fsCoverArea = $("fs-cover-area");
    const fsLyricsArea = $("fs-lyrics-area");
    if (fsCoverArea) fsCoverArea.style.display = state.fsTab === "cover" ? "" : "none";
    if (fsLyricsArea) fsLyricsArea.style.display = state.fsTab === "lyrics" ? "" : "none";
  }

  function renderTrackBar() {
    const t = state.queue[state.index];
    if (!t) return;
    const [c1, c2] = colorOf(t.id.charCodeAt(1));
    const cover = $("player-cover");
    if (cover) cover.style.cssText = `background: linear-gradient(135deg, ${c1}, ${c2});`;
    if ($("player-title")) $("player-title").textContent = t.title;
    if ($("player-sub"))   $("player-sub").textContent = `${t.artist} · ${t.album}`;

    // 更新全屏
    renderFullscreen();

    // 高亮当前播放的行
    document.querySelectorAll(".track-row").forEach(r => r.classList.remove("is-playing"));
    document.querySelectorAll(`.track-row[data-track="${t.id}"]`).forEach(r => r.classList.add("is-playing"));
  }

  function renderControls() {
    const btn = $("btn-play");
    if (!btn) return;
    const iconPlay = btn.querySelector("#icon-play");
    const iconPause = btn.querySelector("#icon-pause");
    if (state.playing) {
      if (iconPlay) iconPlay.style.display = "none";
      if (iconPause) iconPause.style.display = "block";
    } else {
      if (iconPlay) iconPlay.style.display = "block";
      if (iconPause) iconPause.style.display = "none";
    }

    // 移动端按钮
    const bpm = $("btn-play-m");
    if (bpm) {
      bpm.innerHTML = state.playing
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>';
    }
  }

  function renderProgress() {
    const bar = $("progress-bar");
    const fill = $("progress-fill");
    const cur = $("t-cur"); const durEl = $("t-dur");
    if (!bar || !fill) return;
    const t = state.queue[state.index];
    const sec = t ? t.dur : 0;
    fill.style.width = `${(state.progress * 100).toFixed(2)}%`;
    if (cur) cur.textContent = fmtDur(Math.floor(sec * state.progress));
    if (durEl) durEl.textContent = fmtDur(sec);

    // 全屏进度条
    const fsFill = $("fs-progress-fill");
    const fsCur = $("fs-t-cur");
    const fsDur = $("fs-t-dur");
    if (fsFill) fsFill.style.width = `${(state.progress * 100).toFixed(2)}%`;
    if (fsCur) fsCur.textContent = fmtDur(Math.floor(sec * state.progress));
    if (fsDur) fsDur.textContent = fmtDur(sec);

    renderVolume();
  }

  function tick() {
    const t = state.queue[state.index];
    if (!t) return;
    state.progress += 1 / t.dur;
    if (state.progress >= 1) {
      state.progress = 0;
      onTrackEnd();
    }
    renderProgress();
    renderTrackBar();
    // 睡眠定时倒计时显示
    if (state.sleepTimer) {
      renderSleepButton();
    }
  }

  function onTrackEnd() {
    switch (state.playMode) {
      case "repeat-one":
        // 重播当前
        state.progress = 0;
        break;
      case "repeat-list":
        state.index = (state.index + 1) % state.queue.length;
        break;
      case "shuffle":
        {
          let next;
          do { next = Math.floor(Math.random() * state.queue.length); }
          while (next === state.index && state.queue.length > 1);
          state.index = next;
        }
        break;
      case "unique-shuffle":
        state.shuffleHistory.push(state.index);
        if (state.shuffleHistory.length >= state.queue.length) {
          // 全部播完
          state.playing = false;
          if (state.timer) { clearInterval(state.timer); state.timer = null; }
          renderControls();
          return;
        }
        {
          let next;
          do { next = Math.floor(Math.random() * state.queue.length); }
          while (state.shuffleHistory.includes(next));
          state.index = next;
        }
        break;
      case "sequential":
      default:
        if (state.index >= state.queue.length - 1) {
          // 列表播完，停止
          state.playing = false;
          if (state.timer) { clearInterval(state.timer); state.timer = null; }
          renderControls();
          return;
        }
        state.index++;
        break;
    }
    renderTrackBar();
  }

  function playIndex(i) {
    if (i < 0 || i >= state.queue.length) return;
    state.index = i;
    state.progress = 0;
    state.playing = true;
    renderTrackBar();
    renderControls();
    renderProgress();
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(tick, 1000);
  }

  function togglePlay() {
    if (state.queue.length === 0) {
      loadTracks(pickN(TRACKS, 12, 0));
      playIndex(0);
      return;
    }
    state.playing = !state.playing;
    if (state.playing) {
      if (state.timer) clearInterval(state.timer);
      state.timer = setInterval(tick, 1000);
    } else {
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
    }
    renderControls();
    renderFullscreen();
  }

  function next() {
    if (state.queue.length === 0) return;
    onTrackEnd();
    if (state.playing) playIndex(state.index);
    else renderTrackBar();
  }

  function prev() {
    if (state.queue.length === 0) return;
    if (state.progress > 0.05) {
      state.progress = 0;
      renderProgress();
      return;
    }
    state.index = (state.index - 1 + state.queue.length) % state.queue.length;
    playIndex(state.index);
  }

  function loadTracks(list) {
    state.queue = list.map(t => ({ ...t }));
    state.index = 0;
    state.progress = 0;
    state.shuffleHistory = [];
    renderQueue();
    renderTrackBar();
    renderProgress();
  }

  function playAll(list) {
    loadTracks(list);
    playIndex(0);
  }

  /* ---- 进度条拖拽 jump ---- */
  function seekTo(pct) {
    state.progress = Math.max(0, Math.min(1, pct));
    renderProgress();
    renderTrackBar();
  }

  // ---- 绑定 ----
  function bindControls() {
    // 播放/暂停
    const btn = $("btn-play");
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", togglePlay);
    }
    // 下一首
    const bn = $("btn-next");
    if (bn && !bn.dataset.bound) { bn.dataset.bound = "1"; bn.addEventListener("click", next); }
    // 上一首
    const bp = $("btn-prev");
    if (bp && !bp.dataset.bound) { bp.dataset.bound = "1"; bp.addEventListener("click", prev); }

    // 队列按钮
    const bq = $("btn-queue");
    if (bq && !bq.dataset.bound) {
      bq.dataset.bound = "1";
      bq.addEventListener("click", () => {
        const p = $("queue-panel");
        if (p) p.classList.toggle("is-open");
      });
    }
    // 关闭队列
    const bc = $("btn-close-queue");
    if (bc && !bc.dataset.bound) { bc.dataset.bound = "1"; bc.addEventListener("click", () => $("queue-panel").classList.remove("is-open")); }

    // 一键清空队列
    const bclear = $("btn-clear-queue");
    if (bclear && !bclear.dataset.bound) {
      bclear.dataset.bound = "1";
      bclear.addEventListener("click", clearQueue);
    }

    // 全屏按钮
    const bf = $("btn-expand");
    if (bf && !bf.dataset.bound) {
      bf.dataset.bound = "1";
      bf.addEventListener("click", toggleFullscreen);
    }
    // 关闭全屏
    const fsc = $("btn-fs-close");
    if (fsc && !fsc.dataset.bound) {
      fsc.dataset.bound = "1";
      fsc.addEventListener("click", () => $("fullscreen-player").classList.remove("is-open"));
    }

    // 收藏按钮
    const bfav = $("btn-fav");
    if (bfav && !bfav.dataset.bound) {
      bfav.dataset.bound = "1";
      bfav.addEventListener("click", toggleFavorite);
    }

    // ---- 移动端按钮 ----
    const bpm = $("btn-play-m");
    if (bpm && !bpm.dataset.bound) {
      bpm.dataset.bound = "1";
      bpm.addEventListener("click", togglePlay);
    }
    const bprevM = $("btn-prev-m");
    if (bprevM && !bprevM.dataset.bound) {
      bprevM.dataset.bound = "1";
      bprevM.addEventListener("click", prev);
    }
    const bnextM = $("btn-next-m");
    if (bnextM && !bnextM.dataset.bound) {
      bnextM.dataset.bound = "1";
      bnextM.addEventListener("click", next);
    }
    const bqm = $("btn-queue-m");
    if (bqm && !bqm.dataset.bound) {
      bqm.dataset.bound = "1";
      bqm.addEventListener("click", () => {
        const p = $("queue-panel");
        if (p) p.classList.toggle("is-open");
      });
    }
    const bfavm = $("btn-fav-m");
    if (bfavm && !bfavm.dataset.bound) {
      bfavm.dataset.bound = "1";
      bfavm.addEventListener("click", toggleFavorite);
    }

    // ---- 封面/元数据点击 -> 全屏（使用事件委托，更可靠） ----
    const playerTrack = $("player-track-area");
    if (playerTrack && !playerTrack.dataset.bound) {
      playerTrack.dataset.bound = "1";
      playerTrack.addEventListener("click", (e) => {
        // 排除收藏按钮点击
        const target = e.target.closest("button");
        if (target && (target.id === "btn-fav" || target.id === "btn-fav-m")) return;
        toggleFullscreen();
      });
    }

    // 进度条拖拽
    const bar = $("progress-bar");
    if (bar && !bar.dataset.bound) {
      bar.dataset.bound = "1";
      let dragging = false;
      const updateProgress = (clientX) => {
        const rect = bar.getBoundingClientRect();
        const p = (clientX - rect.left) / rect.width;
        seekTo(p);
      };
      bar.addEventListener("mousedown", (e) => { dragging = true; updateProgress(e.clientX); });
      document.addEventListener("mousemove", (e) => { if (dragging) updateProgress(e.clientX); });
      document.addEventListener("mouseup", () => { dragging = false; });
      bar.addEventListener("touchstart", (e) => { dragging = true; updateProgress(e.touches[0].clientX); });
      document.addEventListener("touchmove", (e) => { if (dragging) updateProgress(e.touches[0].clientX); });
      document.addEventListener("touchend", () => { dragging = false; });
    }

    // 全屏进度条拖拽
    const fsBar = $("fs-progress-bar");
    if (fsBar && !fsBar.dataset.bound) {
      fsBar.dataset.bound = "1";
      let dragging = false;
      const updateProgress = (clientX) => {
        const rect = fsBar.getBoundingClientRect();
        const p = (clientX - rect.left) / rect.width;
        seekTo(p);
      };
      fsBar.addEventListener("mousedown", (e) => { dragging = true; updateProgress(e.clientX); });
      document.addEventListener("mousemove", (e) => { if (dragging) updateProgress(e.clientX); });
      document.addEventListener("mouseup", () => { dragging = false; });
      fsBar.addEventListener("touchstart", (e) => { dragging = true; updateProgress(e.touches[0].clientX); });
      document.addEventListener("touchmove", (e) => { if (dragging) updateProgress(e.touches[0].clientX); });
      document.addEventListener("touchend", () => { dragging = false; });
    }

    // 音量条拖拽
    const vol = document.querySelector(".vol-bar");
    if (vol && !vol.dataset.bound) {
      vol.dataset.bound = "1";
      let dragging = false;
      const updateVol = (clientX) => {
        const rect = vol.getBoundingClientRect();
        const p = (clientX - rect.left) / rect.width;
        setVolume(p);
      };
      vol.addEventListener("mousedown", (e) => { dragging = true; updateVol(e.clientX); });
      document.addEventListener("mousemove", (e) => { if (dragging) updateVol(e.clientX); });
      document.addEventListener("mouseup", () => { dragging = false; });
      vol.addEventListener("touchstart", (e) => { dragging = true; updateVol(e.touches[0].clientX); });
      document.addEventListener("touchmove", (e) => { if (dragging) updateVol(e.touches[0].clientX); });
      document.addEventListener("touchend", () => { dragging = false; });
    }

    // 全局点击关闭面板
    document.addEventListener("click", (e) => {
      const eqPanel = $("eq-panel");
      const volumePanel = $("volume-panel");
      const sleepPanel = $("sleep-panel");

      if (eqPanel && eqPanel.classList.contains("is-open")) {
        if (!eqPanel.contains(e.target)) {
          eqPanel.classList.remove("is-open");
          stopVisualizer();
        }
      }
      if (volumePanel && volumePanel.classList.contains("is-open")) {
        if (!volumePanel.contains(e.target)) {
          volumePanel.classList.remove("is-open");
        }
      }
      if (sleepPanel && sleepPanel.classList.contains("is-open")) {
        if (!sleepPanel.contains(e.target)) {
          sleepPanel.classList.remove("is-open");
        }
      }
    });
  }

  function toggleFavorite() {
    const t = state.queue[state.index];
    if (!t) return;
    const bfav = $("btn-fav");
    const bfavm = $("btn-fav-m");

    if (state.favorite.has(t.id)) {
      state.favorite.delete(t.id);
      if (bfav) { bfav.textContent = "♡"; bfav.style.color = ""; }
      if (bfavm) {
        bfavm.style.color = "";
        bfavm.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11-1 .6-3 .6-4 0z"></path></svg>';
      }
    } else {
      state.favorite.add(t.id);
      if (bfav) { bfav.textContent = "♥"; bfav.style.color = "#f87171"; }
      if (bfavm) {
        bfavm.style.color = "#f87171";
        bfavm.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f87171" stroke="#f87171" stroke-width="2"><path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11-1 .6-3 .6-4 0z"></path></svg>';
      }
    }
  }

  // ---- 均衡器 ----
  function applyEQPreset(key) {
    const preset = EQ_PRESETS[key];
    if (!preset) return;
    state.eq.preset = key;
    state.eq.enabled = key !== "flat";
    state.eq.bands.forEach((b, i) => { b.gain = preset.gains[i]; });
    renderEQPanel();
    renderEQButton();
  }

  function renderEQPanel() {
    const panel = $("eq-panel");
    if (!panel) return;

    const p = EQ_PRESETS[state.eq.preset] || EQ_PRESETS.flat;
    panel.innerHTML = `
      <div class="eq-head">
        <span class="eq-title">均衡器</span>
        <div class="eq-head-right">
          <span class="eq-preset-name">${p.name}</span>
          <button class="eq-toggle-btn ${state.eq.enabled ? "is-on" : ""}" id="eq-toggle">${state.eq.enabled ? "ON" : "OFF"}</button>
          <button class="eq-close-btn" id="eq-close">×</button>
        </div>
      </div>
      <p class="eq-desc">${p.desc}</p>

      <div class="eq-presets">
        ${Object.entries(EQ_PRESETS).map(([k, v]) =>
          `<button class="eq-preset-btn ${state.eq.preset === k ? "is-active" : ""}" data-preset="${k}">${v.name}</button>`
        ).join("")}
      </div>

      <div class="eq-bands">
        ${state.eq.bands.map((b, i) => {
          const pct = ((b.gain + 12) / 24 * 100).toFixed(0);
          return `
          <div class="eq-band-col">
            <div class="eq-band-slider" data-idx="${i}">
              <div class="eq-band-track">
                <div class="eq-band-fill" style="height:${pct}%"></div>
              </div>
              <div class="eq-band-thumb" style="bottom:${pct}%"></div>
            </div>
            <span class="eq-band-gain">${b.gain > 0 ? "+" : ""}${b.gain} dB</span>
            <span class="eq-band-label">${b.label}</span>
          </div>`;
        }).join("")}
      </div>

      <div class="eq-viz-section">
        <div class="eq-viz-label">频谱</div>
        <div class="eq-viz" id="eq-viz">
          ${Array.from({ length: 32 }, (_, i) =>
            `<div class="eq-viz-bar" style="--i:${i}"></div>`
          ).join("")}
        </div>
      </div>
    `;

    panel.querySelectorAll(".eq-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => applyEQPreset(btn.dataset.preset));
    });

    const toggle = panel.querySelector("#eq-toggle");
    if (toggle) toggle.addEventListener("click", () => {
      state.eq.enabled = !state.eq.enabled;
      renderEQPanel();
      renderEQButton();
    });

    const close = panel.querySelector("#eq-close");
    if (close) close.addEventListener("click", () => {
      panel.classList.remove("is-open");
      renderEQButton();
    });

    panel.querySelectorAll(".eq-band-slider").forEach(slider => {
      let dragging = false;
      const idx = parseInt(slider.dataset.idx);

      const updateGain = (clientY) => {
        const track = slider.querySelector(".eq-band-track");
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
        state.eq.bands[idx].gain = Math.round((pct * 24 - 12) * 10) / 10;
        state.eq.preset = "custom";
        renderEQPanel();
      };

      slider.addEventListener("mousedown", (e) => { dragging = true; updateGain(e.clientY); });
      document.addEventListener("mousemove", (e) => { if (dragging) updateGain(e.clientY); });
      document.addEventListener("mouseup", () => { dragging = false; });
      slider.addEventListener("touchstart", (e) => { dragging = true; updateGain(e.touches[0].clientY); });
      document.addEventListener("touchmove", (e) => { if (dragging) updateGain(e.touches[0].clientY); });
      document.addEventListener("touchend", () => { dragging = false; });
    });
  }

  function renderEQButton() {
    const btn = $("btn-eq");
    if (!btn) return;
    if (state.eq.enabled) {
      btn.classList.add("is-active");
      btn.title = `均衡器: ${EQ_PRESETS[state.eq.preset]?.name || "自定义"}`;
    } else {
      btn.classList.remove("is-active");
      btn.title = "均衡器";
    }
  }

  function toggleEQPanel() {
    const panel = $("eq-panel");
    if (!panel) { console.warn("[Player] eq-panel 未找到"); return; }
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) {
      renderEQPanel();
      startVisualizer();
    } else {
      stopVisualizer();
    }
    renderEQButton();
  }

  // ---- 频谱可视化 ----
  function startVisualizer() {
    if (state.vizTimer) return;
    const viz = $("eq-viz");
    if (!viz) return;
    state.vizTimer = setInterval(() => {
      const bars = viz.querySelectorAll(".eq-viz-bar");
      if (!bars.length) return;
      bars.forEach((bar, i) => {
        const base = 0.08 + 0.15 * Math.sin(i / 5 + state.progress * 10);
        const wave = 0.06 * Math.sin(i / 3 + Date.now() / 500);
        const noise = 0.02 * Math.random();
        let h = base + wave + noise;
        if (state.playing) h *= 2.5;
        const bandIdx = Math.floor(i / 32 * state.eq.bands.length);
        const eqGain = state.eq.bands[bandIdx]?.gain || 0;
        h *= (1 + eqGain / 12);
        bar.style.height = `${Math.min(100, Math.max(2, h * 100))}%`;
      });
    }, 80);
  }

  function stopVisualizer() {
    if (state.vizTimer) { clearInterval(state.vizTimer); state.vizTimer = null; }
  }

  function initAudioContext() {
    if (state.audioCtx) return;
    try {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      state.analyser = state.audioCtx.createAnalyser();
      state.analyser.fftSize = 64;
      state.analyser.connect(state.audioCtx.destination);
    } catch (e) {
      console.warn("[Player] Web Audio API 不可用:", e.message);
    }
  }

  return {
    init() {
      bindControls();
      renderProgress();
      renderVolume();
      initAudioContext();
    },
    playAll, loadTracks, playIndex, togglePlay, next, prev,
    seekTo,
    addToQueue, clearQueue, removeFromQueue,
    cyclePlayMode, setPlayMode,
    toggleMute, setVolume, setAppVolume,
    toggleSleepPanel, startSleepTimer, cancelSleepTimer,
    toggleFullscreen, setFSTab,
    toggleEQPanel, applyEQPreset,
    getState: () => state,
    getEQPresets: () => EQ_PRESETS,
    getPlayModes: () => PLAY_MODES,
  };
})();