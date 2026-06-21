/* ============================================================
   播放器控制：播放 / 暂停 / 切歌 / 队列 / 进度条 / 音量 /
              常驻底部 + 全屏歌词视图 + Web/APP 状态同步
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

  return {
    init() {
      bindControls();
      renderProgress();
    },
    playAll, loadTracks, playIndex, togglePlay, next, prev,
    getState: () => state,
  };
})();
