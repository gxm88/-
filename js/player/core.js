window.Player = window.Player || {};
(function() {
  "use strict";

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
    { key: "repeat-list",   icon: "↻₂", label: "列表循环",   desc: "播放完列表后从头再来" },
    { key: "shuffle",       icon: "⇄", label: "随机播放",   desc: "随机打乱顺序播放" },
    { key: "unique-shuffle",icon: "⇅", label: "无重复随机", desc: "每首只播一次，播完停止" },
    { key: "reverse",       icon: "↶", label: "逆序播放",   desc: "从最后一首倒序播放" },
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

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

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

  /* ---- 队列管理 ---- */
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
    window.Player.renderQueue();
  }

  function removeFromQueue(i) {
    if (state.queue.length <= 1) return;
    state.queue.splice(i, 1);
    if (state.index >= state.queue.length) state.index = state.queue.length - 1;
    if (state.index > i) state.index--;
    window.Player.renderQueue();
    window.Player.renderTrackBar();
  }

  function clearQueue() {
    if (state.queue.length === 0) return;
    state.queue = [];
    state.index = 0;
    state.progress = 0;
    state.playing = false;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    window.Player.renderQueue();
    window.Player.renderTrackBar();
    window.Player.renderControls();
    window.Player.renderProgress();
  }

  function addToQueue(tracks) {
    if (!Array.isArray(tracks)) tracks = [tracks];
    state.queue.push(...tracks);
    window.Player.renderQueue();
    if (!state.playing && state.queue.length > 0) {
      window.Player.renderTrackBar();
    }
  }

  /* ---- 播放模式 ---- */
  function cyclePlayMode() {
    const idx = PLAY_MODES.findIndex(m => m.key === state.playMode);
    state.playMode = PLAY_MODES[(idx + 1) % PLAY_MODES.length].key;
    state.shuffleHistory = [];
    window.Player.renderPlayModeButton();
    window.Player.renderFullscreen();
  }

  function setPlayMode(mode) {
    if (PLAY_MODES.find(m => m.key === mode)) {
      state.playMode = mode;
      state.shuffleHistory = [];
      window.Player.renderPlayModeButton();
    }
  }

  /* ---- 音量 / 静音 ---- */
  function toggleMute() {
    state.muted = !state.muted;
    window.Player.renderVolume();
    window.Player.updateVolumePanel();
  }

  function setVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    if (state.volume > 0) state.muted = false;
    window.Player.renderVolume();
    window.Player.updateVolumePanel();
  }

  function setAppVolume(v) {
    state.appVolume = Math.max(0, Math.min(1, v));
    window.Player.updateVolumePanel();
  }

  /* ---- 睡眠定时器 ---- */
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
          window.Player.renderControls();
        }
      }
      // 更新面板显示
      if ($("sleep-panel")?.classList.contains("is-open")) window.Player.renderSleepPanel();
      window.Player.renderSleepButton();
    }, 1000);
    window.Player.renderSleepButton();
    window.Player.renderSleepPanel();
  }

  function cancelSleepTimer() {
    if (state.sleepTimer) { clearInterval(state.sleepTimer); state.sleepTimer = null; }
    state.sleepRemaining = 0;
    window.Player.renderSleepButton();
    const panel = $("sleep-panel");
    if (panel && panel.classList.contains("is-open")) window.Player.renderSleepPanel();
  }

  /* ---- 播放控制 ---- */
  function tick() {
    const t = state.queue[state.index];
    if (!t) return;
    state.progress += 1 / t.dur;
    if (state.progress >= 1) {
      state.progress = 0;
      onTrackEnd();
    }
    window.Player.renderProgress();
    window.Player.renderTrackBar();
    // 睡眠定时倒计时显示
    if (state.sleepTimer) {
      window.Player.renderSleepButton();
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
          window.Player.renderControls();
          return;
        }
        {
          let next;
          do { next = Math.floor(Math.random() * state.queue.length); }
          while (state.shuffleHistory.includes(next));
          state.index = next;
        }
        break;
      case "reverse":
        if (state.index <= 0) {
          state.playing = false;
          if (state.timer) { clearInterval(state.timer); state.timer = null; }
          window.Player.renderControls();
          return;
        }
        state.index--;
        break;
      case "sequential":
      default:
        if (state.index >= state.queue.length - 1) {
          // 列表播完，停止
          state.playing = false;
          if (state.timer) { clearInterval(state.timer); state.timer = null; }
          window.Player.renderControls();
          return;
        }
        state.index++;
        break;
    }
    window.Player.renderTrackBar();
  }

  function playIndex(i) {
    if (i < 0 || i >= state.queue.length) return;
    state.index = i;
    state.progress = 0;
    state.playing = true;
    window.Player.renderTrackBar();
    window.Player.renderControls();
    window.Player.renderProgress();
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(tick, 1000);
  }

  function togglePlay() {
    if (state.queue.length === 0) {
      API.getTracks().then(res => loadTracks(res.data.slice(0, 12)));
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
    window.Player.renderControls();
    window.Player.renderFullscreen();
  }

  function next() {
    if (state.queue.length === 0) return;
    onTrackEnd();
    if (state.playing) playIndex(state.index);
    else window.Player.renderTrackBar();
  }

  function prev() {
    if (state.queue.length === 0) return;
    if (state.progress > 0.05) {
      state.progress = 0;
      window.Player.renderProgress();
      return;
    }
    if (state.playMode === "reverse") {
      // 逆序模式下 prev = 下一首
      state.index = (state.index + 1) % state.queue.length;
    } else {
      state.index = (state.index - 1 + state.queue.length) % state.queue.length;
    }
    playIndex(state.index);
  }

  function loadTracks(list) {
    state.queue = list.map(t => ({ ...t }));
    state.index = 0;
    state.progress = 0;
    state.shuffleHistory = [];
    window.Player.renderQueue();
    window.Player.renderTrackBar();
    window.Player.renderProgress();
  }

  function playAll(list) {
    loadTracks(list);
    playIndex(0);
  }

  /* ---- 进度条拖拽 jump ---- */
  function seekTo(pct) {
    state.progress = Math.max(0, Math.min(1, pct));
    window.Player.renderProgress();
    window.Player.renderTrackBar();
  }

  /* ---- 收藏 ---- */
  function toggleFavorite() {
    const t = state.queue[state.index];
    if (!t) return;
    const bfav = $("btn-fav");
    const bfavm = $("btn-fav-m");

    if (state.favorite.has(t.id)) {
      state.favorite.delete(t.id);
      API.removeFavorite(t.id).catch(() => {});
      if (bfav) { bfav.textContent = "♡"; bfav.style.color = ""; }
      if (bfavm) {
        bfavm.style.color = "";
        bfavm.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11-1 .6-3 .6-4 0z"></path></svg>';
      }
    } else {
      state.favorite.add(t.id);
      API.addFavorite(t.id).catch(() => {});
      if (bfav) { bfav.textContent = "♥"; bfav.style.color = "#f87171"; }
      if (bfavm) {
        bfavm.style.color = "#f87171";
        bfavm.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f87171" stroke="#f87171" stroke-width="2"><path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11-1 .6-3 .6-4 0z"></path></svg>';
      }
    }
  }

  function initFavorites() {
    API.getFavorites().then(res => {
      const tracks = Array.isArray(res.data) ? res.data : (res.data && res.data.tracks ? res.data.tracks : []);
      tracks.forEach(t => {
        if (t && t.id) state.favorite.add(t.id);
      });
      updateFavButton();
    }).catch(() => {});
  }

  function updateFavButton() {
    const t = state.queue[state.index];
    const bfav = $("btn-fav");
    const bfavm = $("btn-fav-m");
    if (!t) return;
    if (state.favorite.has(t.id)) {
      if (bfav) { bfav.textContent = "♥"; bfav.style.color = "#f87171"; }
      if (bfavm) {
        bfavm.style.color = "#f87171";
        bfavm.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f87171" stroke="#f87171" stroke-width="2"><path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11-1 .6-3 .6-4 0z"></path></svg>';
      }
    } else {
      if (bfav) { bfav.textContent = "♡"; bfav.style.color = ""; }
      if (bfavm) {
        bfavm.style.color = "";
        bfavm.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11-1 .6-3 .6-4 0z"></path></svg>';
      }
    }
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

  function init() {
    window.Player.bindControls();
    window.Player.renderProgress();
    window.Player.renderVolume();
    initAudioContext();
    initFavorites();
  }

  // Export
  window.Player.state = state;
  window.Player.PLAY_MODES = PLAY_MODES;
  window.Player.EQ_PRESETS = EQ_PRESETS;
  window.Player.$ = $;
  window.Player.fmtTime = fmtTime;
  window.Player.buildRow = buildRow;
  window.Player.init = init;
  window.Player.playAll = playAll;
  window.Player.loadTracks = loadTracks;
  window.Player.playIndex = playIndex;
  window.Player.togglePlay = togglePlay;
  window.Player.next = next;
  window.Player.prev = prev;
  window.Player.seekTo = seekTo;
  window.Player.addToQueue = addToQueue;
  window.Player.clearQueue = clearQueue;
  window.Player.removeFromQueue = removeFromQueue;
  window.Player.moveQueueItem = moveQueueItem;
  window.Player.cyclePlayMode = cyclePlayMode;
  window.Player.setPlayMode = setPlayMode;
  window.Player.toggleMute = toggleMute;
  window.Player.setVolume = setVolume;
  window.Player.setAppVolume = setAppVolume;
  window.Player.startSleepTimer = startSleepTimer;
  window.Player.cancelSleepTimer = cancelSleepTimer;
  window.Player.toggleFavorite = toggleFavorite;
  window.Player.initFavorites = initFavorites;
  window.Player.updateFavButton = updateFavButton;
  window.Player.initAudioContext = initAudioContext;
  window.Player.onTrackEnd = onTrackEnd;
  window.Player.tick = tick;
  window.Player.getState = () => state;
  window.Player.getEQPresets = () => EQ_PRESETS;
  window.Player.getPlayModes = () => PLAY_MODES;
})();