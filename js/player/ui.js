window.Player = window.Player || {};
(function() {
  "use strict";

  function renderQueue() {
    const el = document.getElementById("queue-list");
    if (!el) return;
    const state = window.Player.state;
    el.innerHTML = state.queue.map((t, i) => window.Player.buildRow(t, i)).join("");

    // 绑定双击播放
    el.querySelectorAll(".track-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const i = parseInt(row.dataset.idx);
        window.Player.playIndex(i);
      });
    });

    // 绑定移除按钮
    el.querySelectorAll(".q-remove-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = parseInt(btn.dataset.idx);
        window.Player.removeFromQueue(i);
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
            window.Player.moveQueueItem(fromIdx, toIdx);
          }
        }
      });
    });
  }

  function renderTrackBar() {
    const state = window.Player.state;
    const t = state.queue[state.index];
    if (!t) return;
    const [c1, c2] = colorOf(t.id.charCodeAt(1));
    const cover = document.getElementById("player-cover");
    if (cover) cover.style.cssText = `background: linear-gradient(135deg, ${c1}, ${c2});`;
    const titleEl = document.getElementById("player-title");
    if (titleEl) titleEl.textContent = t.title;
    const subEl = document.getElementById("player-sub");
    if (subEl) subEl.textContent = `${t.artist} · ${t.album}`;

    // 更新全屏
    window.Player.renderFullscreen();

    // 高亮当前播放的行
    document.querySelectorAll(".track-row").forEach(r => r.classList.remove("is-playing"));
    document.querySelectorAll(`.track-row[data-track="${t.id}"]`).forEach(r => r.classList.add("is-playing"));

    // 同步收藏按钮状态
    window.Player.updateFavButton();
  }

  function renderControls() {
    const state = window.Player.state;
    // 桌面端播放按钮
    const btn = document.getElementById("btn-play");
    if (btn) {
      const iconPlay = btn.querySelector("#icon-play");
      const iconPause = btn.querySelector("#icon-pause");
      if (state.playing) {
        if (iconPlay) iconPlay.style.display = "none";
        if (iconPause) iconPause.style.display = "block";
      } else {
        if (iconPlay) iconPlay.style.display = "block";
        if (iconPause) iconPause.style.display = "none";
      }
    }

    // 移动端播放按钮
    const bpm = document.getElementById("btn-play-m");
    if (bpm) {
      bpm.innerHTML = state.playing
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>';
    }
  }

  function renderProgress() {
    const state = window.Player.state;
    const bar = document.getElementById("progress-bar");
    const fill = document.getElementById("progress-fill");
    const cur = document.getElementById("t-cur");
    const durEl = document.getElementById("t-dur");
    if (!bar || !fill) return;
    const t = state.queue[state.index];
    const sec = t ? t.dur : 0;
    fill.style.width = `${(state.progress * 100).toFixed(2)}%`;
    if (cur) cur.textContent = fmtDur(Math.floor(sec * state.progress));
    if (durEl) durEl.textContent = fmtDur(sec);

    // 全屏进度条
    const fsFill = document.getElementById("fs-progress-fill");
    const fsCur = document.getElementById("fs-t-cur");
    const fsDur = document.getElementById("fs-t-dur");
    if (fsFill) fsFill.style.width = `${(state.progress * 100).toFixed(2)}%`;
    if (fsCur) fsCur.textContent = fmtDur(Math.floor(sec * state.progress));
    if (fsDur) fsDur.textContent = fmtDur(sec);

    // 音量条
    const volFill = document.getElementById("vol-fill");
    if (volFill) volFill.style.width = `${(state.muted ? 0 : state.volume) * 100}%`;
  }

  function renderVolume() {
    const state = window.Player.state;
    const vfill = document.getElementById("vol-fill");
    if (vfill) {
      const effVol = state.muted ? 0 : state.volume;
      vfill.style.width = `${(effVol * 100).toFixed(0)}%`;
    }

    const btn = document.getElementById("btn-volume");
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

  /* ---- 队列面板 ---- */
  function toggleQueuePanel() {
    const panel = document.getElementById("queue-panel");
    if (!panel) return;
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) {
      window.Player.renderQueue();
    }
  }

  /* ---- 音量面板 ---- */
  function toggleVolumePanel() {
    const panel = document.getElementById("volume-panel");
    if (!panel) return;
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) renderVolumePanel();
  }

  function renderVolumePanel() {
    const state = window.Player.state;
    const panel = document.getElementById("volume-panel");
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
    if (muteBtn) muteBtn.addEventListener("click", window.Player.toggleMute);

    // 绑定全局音量条
    const volBar = panel.querySelector("#vol-panel-bar");
    if (volBar) {
      volBar.addEventListener("click", (e) => {
        const rect = volBar.getBoundingClientRect();
        const p = (e.clientX - rect.left) / rect.width;
        window.Player.setVolume(p);
      });
    }

    // 绑定软件音量条
    const appVolBar = panel.querySelector("#app-vol-bar");
    if (appVolBar) {
      appVolBar.addEventListener("click", (e) => {
        const rect = appVolBar.getBoundingClientRect();
        const p = (e.clientX - rect.left) / rect.width;
        window.Player.setAppVolume(p);
      });
    }

    // 绑定关闭
    const close = panel.querySelector("#vol-panel-close");
    if (close) close.addEventListener("click", () => panel.classList.remove("is-open"));
  }

  /* ---- 播放模式按钮 ---- */
  function renderPlayModeButton() {
    const state = window.Player.state;
    const PLAY_MODES = window.Player.PLAY_MODES;
    const btn = document.getElementById("btn-play-mode");
    if (!btn) return;
    const mode = PLAY_MODES.find(m => m.key === state.playMode) || PLAY_MODES[0];
    btn.title = mode.label + " · " + mode.desc;
    btn.innerHTML = mode.icon;
    btn.classList.toggle("is-active", state.playMode !== "sequential");
  }

  /* ---- 睡眠定时器按钮 ---- */
  function renderSleepButton() {
    const state = window.Player.state;
    const btn = document.getElementById("btn-sleep");
    if (!btn) return;
    if (state.sleepTimer) {
      btn.classList.add("is-active");
      btn.title = `睡眠定时: ${window.Player.fmtTime(state.sleepRemaining)}`;
    } else {
      btn.classList.remove("is-active");
      btn.title = "睡眠定时";
    }
  }

  function renderSleepPanel() {
    const state = window.Player.state;
    const panel = document.getElementById("sleep-panel");
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
            <span class="sleep-countdown-time">${window.Player.fmtTime(remaining)}</span>
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
      btn.addEventListener("click", () => window.Player.startSleepTimer(parseInt(btn.dataset.min) * 60));
    });

    // 自定义按钮
    const customBtn = panel.querySelector("#sleep-custom-btn");
    const customInput = panel.querySelector("#sleep-custom-input");
    if (customBtn && customInput) {
      customBtn.addEventListener("click", () => {
        const val = parseInt(customInput.value);
        if (val > 0 && val <= 480) window.Player.startSleepTimer(val * 60);
      });
    }

    // 取消定时
    const cancelBtn = panel.querySelector("#sleep-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", window.Player.cancelSleepTimer);

    // 关闭
    const close = panel.querySelector("#sleep-close");
    if (close) close.addEventListener("click", () => panel.classList.remove("is-open"));
  }

  function toggleSleepPanel() {
    const panel = document.getElementById("sleep-panel");
    if (!panel) return;
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) renderSleepPanel();
  }

  /* ---- 绑定 ----
     bindControls uses window.Player.* for all callback references
     since those functions live in other module files (core / fullscreen / effects).
  ---- */
  function bindControls() {
    // 播放/暂停（桌面端中间按钮）
    const btn = document.getElementById("btn-play");
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", window.Player.togglePlay);
    }
    // 下一首（桌面端）
    const bn = document.getElementById("btn-next");
    if (bn && !bn.dataset.bound) { bn.dataset.bound = "1"; bn.addEventListener("click", window.Player.next); }
    // 上一首（桌面端）
    const bp = document.getElementById("btn-prev");
    if (bp && !bp.dataset.bound) { bp.dataset.bound = "1"; bp.addEventListener("click", window.Player.prev); }

    // 队列按钮
    const bq = document.getElementById("btn-queue");
    if (bq && !bq.dataset.bound) {
      bq.dataset.bound = "1";
      bq.addEventListener("click", toggleQueuePanel);
    }
    // 关闭队列
    const bc = document.getElementById("btn-close-queue");
    if (bc && !bc.dataset.bound) { bc.dataset.bound = "1"; bc.addEventListener("click", () => { const p = document.getElementById("queue-panel"); if (p) p.classList.remove("is-open"); }); }

    // 一键清空队列
    const bclear = document.getElementById("btn-clear-queue");
    if (bclear && !bclear.dataset.bound) {
      bclear.dataset.bound = "1";
      bclear.addEventListener("click", window.Player.clearQueue);
    }

    // 关闭全屏
    const fsc = document.getElementById("btn-fs-close");
    if (fsc && !fsc.dataset.bound) {
      fsc.dataset.bound = "1";
      fsc.addEventListener("click", window.Player.closeFullscreen);
    }

    // 收藏按钮
    const bfav = document.getElementById("btn-fav");
    if (bfav && !bfav.dataset.bound) {
      bfav.dataset.bound = "1";
      bfav.addEventListener("click", window.Player.toggleFavorite);
    }

    // ---- 移动端按钮（胶囊右侧） ----
    const bpm = document.getElementById("btn-play-m");
    if (bpm && !bpm.dataset.bound) {
      bpm.dataset.bound = "1";
      bpm.addEventListener("click", window.Player.togglePlay);
    }
    const bprevM = document.getElementById("btn-prev-m");
    if (bprevM && !bprevM.dataset.bound) {
      bprevM.dataset.bound = "1";
      bprevM.addEventListener("click", window.Player.prev);
    }
    const bnextM = document.getElementById("btn-next-m");
    if (bnextM && !bnextM.dataset.bound) {
      bnextM.dataset.bound = "1";
      bnextM.addEventListener("click", window.Player.next);
    }

    // ---- 封面/元数据点击 -> 全屏 ----
    const playerTrack = document.getElementById("player-track-area");
    if (playerTrack && !playerTrack.dataset.bound) {
      playerTrack.dataset.bound = "1";
      playerTrack.addEventListener("click", (e) => {
        // 排除按钮点击
        const target = e.target.closest("button");
        if (target) return;
        window.Player.toggleFullscreen();
      });
    }

    // 进度条拖拽 + 点击跳转
    const bar = document.getElementById("progress-bar");
    if (bar && !bar.dataset.bound) {
      bar.dataset.bound = "1";

      // 点击跳转
      bar.addEventListener("click", (e) => {
        const rect = bar.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        window.Player.seekTo(p);
      });

      // 拖拽跳转
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

    // 音量条拖拽
    const vol = document.querySelector(".vol-bar");
    if (vol && !vol.dataset.bound) {
      vol.dataset.bound = "1";
      let dragging = false;
      const updateVol = (clientX) => {
        const rect = vol.getBoundingClientRect();
        const p = (clientX - rect.left) / rect.width;
        window.Player.setVolume(p);
      };
      vol.addEventListener("mousedown", (e) => { dragging = true; updateVol(e.clientX); });
      document.addEventListener("mousemove", (e) => { if (dragging) updateVol(e.clientX); });
      document.addEventListener("mouseup", () => { dragging = false; });
      vol.addEventListener("touchstart", (e) => { e.preventDefault(); dragging = true; updateVol(e.touches[0].clientX); }, { passive: false });
      document.addEventListener("touchmove", (e) => { if (dragging) { e.preventDefault(); updateVol(e.touches[0].clientX); } }, { passive: false });
      document.addEventListener("touchend", () => { dragging = false; });
    }

    // 全局点击关闭面板（全屏播放器内的按钮不触发关闭）
    document.addEventListener("click", (e) => {
      const eqPanel = document.getElementById("eq-panel");
      const volumePanel = document.getElementById("volume-panel");
      const sleepPanel = document.getElementById("sleep-panel");
      const fsPlayer = document.getElementById("fullscreen-player");

      // 如果点击来自全屏播放器内的工具栏按钮，不关闭面板
      if (fsPlayer && fsPlayer.classList.contains("is-open") && fsPlayer.contains(e.target)) {
        return;
      }

      if (eqPanel && eqPanel.classList.contains("is-open")) {
        if (!eqPanel.contains(e.target)) {
          eqPanel.classList.remove("is-open");
          window.Player.stopVisualizer();
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

    // ---- 播放器栏自动隐藏/显示 ----
    bindPlayerBarAutoHide();
  }

  /* 播放器栏自动隐藏：5 秒无操作隐藏，播放中不隐藏，鼠标移到底部热区显示 */
  let _hideTimer = null;
  function bindPlayerBarAutoHide() {
    const bar = document.getElementById("player-bar");
    const hotzone = document.getElementById("player-hotzone");
    if (!bar) return;

    function showBar() {
      bar.classList.remove("is-hidden-bar");
      resetTimer();
    }

    function hideBar() {
      const state = window.Player.state;
      // 播放中不隐藏
      if (state && state.playing) return;
      bar.classList.add("is-hidden-bar");
    }

    function resetTimer() {
      if (_hideTimer) clearTimeout(_hideTimer);
      _hideTimer = setTimeout(hideBar, 5000);
    }

    // 热区鼠标移入 → 显示
    if (hotzone && !hotzone.dataset.bound) {
      hotzone.dataset.bound = "1";
      hotzone.addEventListener("mouseenter", showBar);
    }

    // 播放器上交互 → 重置计时器
    if (!bar.dataset.boundHide) {
      bar.dataset.boundHide = "1";
      bar.addEventListener("mouseenter", showBar);
      bar.addEventListener("mousemove", resetTimer);
      bar.addEventListener("click", resetTimer);
      bar.addEventListener("touchstart", showBar, { passive: true });
      bar.addEventListener("touchmove", resetTimer, { passive: true });
    }

    // 初始启动计时器
    resetTimer();
  }

  // Export
  window.Player.renderQueue = renderQueue;
  window.Player.bindDragSort = bindDragSort;
  window.Player.renderTrackBar = renderTrackBar;
  window.Player.renderControls = renderControls;
  window.Player.renderProgress = renderProgress;
  window.Player.renderVolume = renderVolume;
  window.Player.toggleQueuePanel = toggleQueuePanel;
  window.Player.toggleVolumePanel = toggleVolumePanel;
  window.Player.renderVolumePanel = renderVolumePanel;
  window.Player.renderPlayModeButton = renderPlayModeButton;
  window.Player.renderSleepButton = renderSleepButton;
  window.Player.renderSleepPanel = renderSleepPanel;
  window.Player.toggleSleepPanel = toggleSleepPanel;
  window.Player.bindControls = bindControls;
})();