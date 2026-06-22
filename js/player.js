/* ============================================================
   播放器控制：播放 / 暂停 / 切歌 / 队列 / 进度条 / 音量 /
              常驻底部 + 全屏歌词视图 + Web/APP 状态同步
              + 均衡器 / 音效预设 / 频谱可视化
   ============================================================ */

const Player = (() => {
  const state = {
    queue: [],         // [{ id, title, artist, ... }]
    index: 0,
    playing: false,
    progress: 0,       // 0..1
    volume: 0.7,
    favorite: new Set(),
    timer: null,
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
    vizData: null,     // 最近一帧频谱数据
  };

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
      <div class="track-row" data-track="${track.id}" data-idx="${idx}">
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
          <button class="icon-btn" title="收藏">♡</button>
        </div>
      </div>`;
  }

  function renderQueue() {
    const el = $("queue-list");
    if (!el) return;
    el.innerHTML = state.queue.map((t, i) => buildRow(t, i)).join("");
    el.querySelectorAll(".track-row").forEach(row => {
      row.addEventListener("dblclick", () => {
        const i = parseInt(row.dataset.idx);
        playIndex(i);
      });
    });
  }

  function renderTrackBar() {
    const t = state.queue[state.index];
    if (!t) return;
    const [c1, c2] = colorOf(t.id.charCodeAt(1));
    const cover = $("player-cover");
    if (cover) cover.style.cssText = `background: linear-gradient(135deg, ${c1}, ${c2});`;
    if ($("player-title")) $("player-title").textContent = t.title;
    if ($("player-sub"))   $("player-sub").textContent = `${t.artist} · ${t.album}`;

    const fs = $("fullscreen-player");
    if (fs) {
      const fsc = $("fs-cover");
      if (fsc) fsc.style.cssText = `background: linear-gradient(135deg, ${c1}, ${c2});`;
      if ($("fs-title")) $("fs-title").textContent = t.title;
      if ($("fs-sub")) $("fs-sub").textContent = `${t.artist} · ${t.album}`;
      if ($("fs-plays")) $("fs-plays").textContent = `${Math.floor(Math.random() * 120) + 20}`;
      if ($("fs-match")) $("fs-match").textContent = `${70 + (t.id.charCodeAt(2) % 28)}%`;

      // 模拟歌词
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
    }

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
      iconPlay.style.display = "none";
      iconPause.style.display = "block";
    } else {
      iconPlay.style.display = "block";
      iconPause.style.display = "none";
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

    const vfill = $("vol-fill");
    if (vfill) vfill.style.width = `${(state.volume * 100).toFixed(0)}%`;
  }

  function tick() {
    const t = state.queue[state.index];
    if (!t) return;
    state.progress += 1 / t.dur;
    if (state.progress >= 1) {
      state.progress = 0;
      next();
    }
    renderProgress();
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
      // 如果尚未有队列，就播整张曲库前 12 首
      loadTracks(pickN(TRACKS, 12, 0));
      playIndex(0);
      return;
    }
    state.playing = !state.playing;
    renderControls();
  }
  function next() {
    if (state.queue.length === 0) return;
    playIndex((state.index + 1) % state.queue.length);
  }
  function prev() {
    if (state.queue.length === 0) return;
    playIndex((state.index - 1 + state.queue.length) % state.queue.length);
  }
  function loadTracks(list) {
    state.queue = list.map(t => ({ ...t }));
    state.index = 0;
    state.progress = 0;
    renderQueue();
    renderTrackBar();
    renderProgress();
  }
  function playAll(list) {
    loadTracks(list);
    playIndex(0);
  }

  // 绑定
  function bindControls() {
    const btn = $("btn-play");
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", togglePlay);
    }
    const bn = $("btn-next");
    if (bn && !bn.dataset.bound) { bn.dataset.bound = "1"; bn.addEventListener("click", next); }
    const bp = $("btn-prev");
    if (bp && !bp.dataset.bound) { bp.dataset.bound = "1"; bp.addEventListener("click", prev); }
    const bq = $("btn-queue");
    if (bq && !bq.dataset.bound) {
      bq.dataset.bound = "1";
      bq.addEventListener("click", () => {
        const p = $("queue-panel");
        if (p) p.classList.toggle("is-open");
      });
    }
    const bc = $("btn-close-queue");
    if (bc && !bc.dataset.bound) { bc.dataset.bound = "1"; bc.addEventListener("click", () => $("queue-panel").classList.remove("is-open")); }
    const bf = $("btn-expand");
    if (bf && !bf.dataset.bound) {
      bf.dataset.bound = "1";
      bf.addEventListener("click", () => {
        const fs = $("fullscreen-player");
        if (fs) fs.classList.toggle("is-open");
      });
    }
    const fsc = $("btn-fs-close");
    if (fsc && !fsc.dataset.bound) {
      fsc.dataset.bound = "1";
      fsc.addEventListener("click", () => $("fullscreen-player").classList.remove("is-open"));
    }
    const bfav = $("btn-fav");
    if (bfav && !bfav.dataset.bound) {
      bfav.dataset.bound = "1";
      bfav.addEventListener("click", () => {
        const t = state.queue[state.index];
        if (!t) return;
        if (state.favorite.has(t.id)) { state.favorite.delete(t.id); bfav.textContent = "♡"; }
        else { state.favorite.add(t.id); bfav.textContent = "♥"; bfav.style.color = "#f87171"; }
      });
    }

    const bEq = $("btn-eq");
    if (bEq && !bEq.dataset.bound) {
      bEq.dataset.bound = "1";
      bEq.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleEQPanel();
      });
    }

    // ---- 移动端按钮 ----
    // 移动端播放按钮
    const bpm = $("btn-play-m");
    if (bpm && !bpm.dataset.bound) {
      bpm.dataset.bound = "1";
      bpm.addEventListener("click", togglePlay);
    }
    // 移动端队列按钮
    const bqm = $("btn-queue-m");
    if (bqm && !bqm.dataset.bound) {
      bqm.dataset.bound = "1";
      bqm.addEventListener("click", () => {
        const p = $("queue-panel");
        if (p) p.classList.toggle("is-open");
      });
    }
    // 移动端收藏按钮
    const bfavm = $("btn-fav-m");
    if (bfavm && !bfavm.dataset.bound) {
      bfavm.dataset.bound = "1";
      bfavm.addEventListener("click", () => {
        const t = state.queue[state.index];
        if (!t) return;
        if (state.favorite.has(t.id)) {
          state.favorite.delete(t.id);
          bfavm.style.color = "";
          bfavm.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11-1 .6-3 .6-4 0z"></path></svg>';
        } else {
          state.favorite.add(t.id);
          bfavm.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f87171" stroke="#f87171" stroke-width="2"><path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11-1 .6-3 .6-4 0z"></path></svg>';
        }
      });
    }

    const bar = $("progress-bar");
    if (bar && !bar.dataset.bound) {
      bar.dataset.bound = "1";
      bar.addEventListener("click", (e) => {
        const rect = bar.getBoundingClientRect();
        const p = (e.clientX - rect.left) / rect.width;
        state.progress = Math.max(0, Math.min(1, p));
        renderProgress();
      });
    }
    const vol = document.querySelector(".vol-bar");
    if (vol && !vol.dataset.bound) {
      vol.dataset.bound = "1";
      vol.addEventListener("click", (e) => {
        const rect = vol.getBoundingClientRect();
        state.volume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        renderProgress();
      });
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

    const p = EQ_PRESETS[state.eq.preset];
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

    // 绑定预设按钮
    panel.querySelectorAll(".eq-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => applyEQPreset(btn.dataset.preset));
    });

    // 绑定开关
    const toggle = panel.querySelector("#eq-toggle");
    if (toggle) toggle.addEventListener("click", () => {
      state.eq.enabled = !state.eq.enabled;
      renderEQPanel();
      renderEQButton();
    });

    // 绑定关闭
    const close = panel.querySelector("#eq-close");
    if (close) close.addEventListener("click", () => {
      panel.classList.remove("is-open");
      renderEQButton();
    });

    // 绑定滑块
    panel.querySelectorAll(".eq-band-slider").forEach(slider => {
      let dragging = false;
      const idx = parseInt(slider.dataset.idx);

      const updateGain = (clientY) => {
        const rect = slider.querySelector(".eq-band-track").getBoundingClientRect();
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
        // 模拟频谱：低频到高频，加入随机波动
        const base = 0.08 + 0.15 * Math.sin(i / 5 + state.progress * 10);
        const wave = 0.06 * Math.sin(i / 3 + Date.now() / 500);
        const noise = 0.02 * Math.random();
        let h = base + wave + noise;
        // 音乐播放时振幅更大
        if (state.playing) h *= 2.5;
        // 当前频段 EQ 增益影响
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

  // 初始化 Web Audio API（预留，后续接入真实音频流）
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
      initAudioContext();
    },
    playAll, loadTracks, playIndex, togglePlay, next, prev,
    getState: () => state,
    // EQ 公开方法
    toggleEQPanel,
    applyEQPreset,
    getEQPresets: () => EQ_PRESETS,
  };
})();
